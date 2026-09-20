/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */

/**
 * DetailDependencyRenderer —— 详情面板 dependency-canvas 渲染器
 *
 * 职责：
 * 1. 把 swimGraphDetail.vue 中 showDependencies 的纯绘制逻辑抽离成独立渲染器
 * 2. canvas 实例从 CanvasPool 获取（'dependency-canvas'），替代 document.getElementById
 * 3. 组件只负责事件绑定，渲染器负责绘制
 *
 * 不托管 DOM：canvas 的创建/销毁仍由 swimGraphDetail.vue 负责
 */

import { setupHighDPICanvas } from '../swimGraphUtils';
import { canvasPool } from './canvasPool';

/** 依赖节点信息 */
interface DepNodeInfo {
  node: { x: number; y: number; width: number; height: number };
  type: 'current' | 'predecessor' | 'successor';
  displayName: string;
  fullDisplayName: string;
  eventId?: string;
}

/** 依赖关系数据 */
export interface DependencyRenderData {
  /** 当前事件显示名 */
  displayName: string;
  /** 前驱事件（按显示名） */
  predecessors: Array<{ name: string; displayName?: string; isCounter?: boolean; eventId?: string }>;
  /** 后继事件（按显示名） */
  successors: Array<{ name: string; displayName?: string; isCounter?: boolean; eventId?: string }>;
  /** 当前事件填充色 */
  fillColor: string;
  /** 当前事件ID */
  currentEventId?: string;
  /** 展示模式：forward(前驱) / backward(后继) / both */
  type: 'forward' | 'backward' | 'both';
}

/** 渲染配置（由组件注入） */
export interface DetailRenderConfig {
  /** 容器宽度计算：clientWidth - offsetLeft - marginRight */
  getCanvasWidth: () => number;
  /** 右边距 */
  marginRight: number;
  /** 颜色配置 */
  colorCfg: { lightlyCompareBkgColor: string; eventFontHighLight: string; eventFontNoColor: string; depSelectStroke: string };
  /** 文本溢出截断函数（由组件从 swimGraphMethods 注入） */
  overflowText: (maxWidth: number, text: string) => [string, number];
}

export class DetailDependencyRenderer {
  /** 上一次绑定的 canvas（用于解绑事件） */
  private lastCanvas: HTMLCanvasElement | null = null;
  private lastHandlers: {
    mousemove: ((e: MouseEvent) => void) | null;
    mouseleave: (() => void) | null;
    click: ((e: MouseEvent) => void) | null;
  } = {
    mousemove: null,
    mouseleave: null,
    click: null,
  };
  private selectedEventId: string | null = null;
  private lastRenderParams: {
    data: DependencyRenderData;
    config: DetailRenderConfig;
    tooltipCallbacks: { show: (e: MouseEvent, text: string) => void; hide: () => void };
    onNodeClick?: (eventId: string, type: 'predecessor' | 'successor' | 'current') => void;
  } | null = null;

  /**
   * 渲染依赖关系图
   * @param data 依赖数据
   * @param config 渲染配置
   * @param tooltipCallbacks tooltip 回调（由组件提供 DOM 操作）
   * @param onNodeClick 节点点击回调（由组件提供）
   */
  render(
    data: DependencyRenderData,
    config: DetailRenderConfig,
    tooltipCallbacks: {
      show: (e: MouseEvent, text: string) => void;
      hide: () => void;
    },
    onNodeClick?: (eventId: string, type: 'predecessor' | 'successor' | 'current') => void
  ) {
    this.selectedEventId = null;
    this.lastRenderParams = { data, config, tooltipCallbacks, onNodeClick };
    this._draw();
  }

  private _draw(skipBindEvents = false) {
    if (!this.lastRenderParams) return;
    const { data, config, tooltipCallbacks, onNodeClick } = this.lastRenderParams;

    const canvas = canvasPool.getCanvas('dependency-canvas', '_default');
    if (!canvas) return;

    const canvasWidth = config.getCanvasWidth();
    const canvasHeight = Math.max(186, 20 * (Math.max(data.predecessors.length, data.successors.length) + 1));
    const actualWidth = canvasWidth / 5;

    setupHighDPICanvas(canvas, canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = '12px Arial';

    const nodesInfo: DepNodeInfo[] = [];
    const currentNode = {
      x: canvasWidth / 2 - canvasWidth / 10,
      y: 10,
      width: actualWidth,
      height: 16,
    };
    
    // 当前节点
    const isCurrentSelected = data.currentEventId === this.selectedEventId;
    this.drawDepNodeRect(ctx, currentNode, data.fillColor, isCurrentSelected, config.colorCfg.depSelectStroke);
    ctx.fillStyle = config.colorCfg.eventFontHighLight;
    const [displayText, leftspace] = config.overflowText(actualWidth, data.displayName);
    ctx.fillText(displayText, currentNode.x + leftspace, currentNode.y + 12);
    nodesInfo.push({
      node: currentNode,
      type: 'current',
      displayName: displayText,
      fullDisplayName: data.displayName,
      eventId: data.currentEventId,
    });

    const depFillColor = config.colorCfg.lightlyCompareBkgColor;
     
    // 前驱
    if (data.type === 'forward' || data.type === 'both') {
      this.drawPredecessors(ctx, data, config, depFillColor, actualWidth, currentNode, nodesInfo);
    }
    
    // 后继
    if (data.type === 'backward' || data.type === 'both') {
      this.drawSuccessors(ctx, data, config, depFillColor, actualWidth, canvasWidth, currentNode, nodesInfo);
    }

    if (!skipBindEvents) {
      this.bindEvents(canvas, nodesInfo, tooltipCallbacks, onNodeClick);
    }
  }

  private drawDepNodeRect(
    ctx: CanvasRenderingContext2D,
    node: { x: number; y: number; width: number; height: number },
    fillColor: string,
    isSelected: boolean,
    selectStroke: string
  ) {
    ctx.beginPath();
    ctx.fillStyle = fillColor;
    ctx.roundRect(node.x, node.y, node.width, node.height, 4);
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = selectStroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.closePath();
  }

  private drawPredecessors(
    ctx: CanvasRenderingContext2D,
    data: DependencyRenderData,
    config: DetailRenderConfig,
    depFillColor: string,
    actualWidth: number,
    currentNode: { x: number; y: number; width: number; height: number },
    nodesInfo: DepNodeInfo[]
  ) {
    data.predecessors.forEach((pre, index) => {
      const preNode = { x: 0, y: 10 + index * 20, width: actualWidth, height: 16 };
      const isSelected = pre.eventId === this.selectedEventId;
      this.drawDepNodeRect(ctx, preNode, depFillColor, isSelected, config.colorCfg.depSelectStroke);
      ctx.fillStyle = config.colorCfg.eventFontNoColor;
      const name = pre.isCounter ? pre.displayName : pre.name || 'Event';
      const [displayText, leftspace] = config.overflowText(actualWidth, name);
      ctx.fillText(displayText, preNode.x + leftspace, preNode.y + 12);
      nodesInfo.push({ node: preNode, type: 'predecessor', displayName: displayText, fullDisplayName: name, eventId: pre.eventId });
      // 连线
      ctx.beginPath();
      ctx.moveTo(currentNode.x, currentNode.y + currentNode.height / 2);
      ctx.bezierCurveTo(
        currentNode.x + 5, currentNode.y + currentNode.height / 2 + 5,
        preNode.x + preNode.width, preNode.y + preNode.height / 2 + 5,
        preNode.x + preNode.width, preNode.y + preNode.height / 2
      );
      const gradient = ctx.createLinearGradient(
        currentNode.x, currentNode.y + currentNode.height / 2,
        preNode.x + preNode.width, preNode.y + preNode.height / 2
      );
      gradient.addColorStop(0, data.fillColor);
      gradient.addColorStop(1, depFillColor);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }

  private drawSuccessors(
    ctx: CanvasRenderingContext2D,
    data: DependencyRenderData,
    config: DetailRenderConfig,
    depFillColor: string,
    actualWidth: number,
    canvasWidth: number,
    currentNode: { x: number; y: number; width: number; height: number },
    nodesInfo: DepNodeInfo[]
  ) {
    data.successors.forEach((dep, index) => {
      const depNode = { x: canvasWidth * 0.8, y: 10 + index * 20, width: actualWidth, height: 16 };
      const isSelected = dep.eventId === this.selectedEventId;
      this.drawDepNodeRect(ctx, depNode, depFillColor, isSelected, config.colorCfg.depSelectStroke);
      ctx.fillStyle = config.colorCfg.eventFontNoColor;
      const name = dep.isCounter ? dep.displayName : dep.name || 'Event';
      const [displayText, leftspace] = config.overflowText(actualWidth, name);
      ctx.fillText(displayText, depNode.x + leftspace, depNode.y + 12);
      nodesInfo.push({ node: depNode, type: 'successor', displayName: displayText, fullDisplayName: name, eventId: dep.eventId });

      ctx.beginPath();
      ctx.moveTo(currentNode.x + currentNode.width, currentNode.y + currentNode.height / 2);
      ctx.bezierCurveTo(
        currentNode.x + currentNode.width, currentNode.y + currentNode.height / 2 + 5,
        depNode.x, depNode.y + depNode.height / 2 + 5,
        depNode.x, depNode.y + depNode.height / 2
      );
      const gradient = ctx.createLinearGradient(
        currentNode.x + currentNode.width, currentNode.y + currentNode.height / 2,
        depNode.x, depNode.y + depNode.height / 2
      );
      gradient.addColorStop(0, data.fillColor);
      gradient.addColorStop(1, depFillColor);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }

  private bindEvents(
    canvas: HTMLCanvasElement,
    nodesInfo: DepNodeInfo[],
    tooltipCallbacks: { show: (e: MouseEvent, text: string) => void; hide: () => void },
    onNodeClick?: (eventId: string, type: 'predecessor' | 'successor' | 'current') => void
  ) {
    this._unbindEvents();
    this.lastCanvas = canvas;
    const hitTest = (e: MouseEvent): DepNodeInfo | null => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      for (let i = nodesInfo.length - 1; i >= 0; i--) {
        const n = nodesInfo[i];
        if (mouseX >= n.node.x && mouseX <= n.node.x + n.node.width &&
            mouseY >= n.node.y && mouseY <= n.node.y + n.node.height) {
          return n;
        }
      }
      return null;
    };
    const onMouseMove = (e: MouseEvent) => {
      const hoveredNode = hitTest(e);
      if (hoveredNode && hoveredNode.fullDisplayName !== hoveredNode.displayName) {
        tooltipCallbacks.show(e, hoveredNode.fullDisplayName);
        canvas.style.cursor = 'pointer';
      } else if (hoveredNode && hoveredNode.eventId) {
        tooltipCallbacks.hide();
        canvas.style.cursor = 'pointer';
      } else {
        tooltipCallbacks.hide();
        canvas.style.cursor = 'default';
      }
    };
    const onMouseLeave = () => tooltipCallbacks.hide();
    const onClick = (e: MouseEvent) => {
      const hoveredNode = hitTest(e);
      if (hoveredNode && hoveredNode.eventId) {
        this.selectedEventId = hoveredNode.eventId;
        this._draw(true);
        if (onNodeClick) {
          onNodeClick(hoveredNode.eventId, hoveredNode.type as 'predecessor' | 'successor' | 'current');
        }
      }
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);
    this.lastHandlers = { mousemove: onMouseMove, mouseleave: onMouseLeave, click: onClick };
  }

  /** 解绑上一次的事件 */
  private _unbindEvents() {
    if (this.lastCanvas && this.lastHandlers.mousemove) {
      this.lastCanvas.removeEventListener('mousemove', this.lastHandlers.mousemove);
    }
    if (this.lastCanvas && this.lastHandlers.mouseleave) {
      this.lastCanvas.removeEventListener('mouseleave', this.lastHandlers.mouseleave);
    }
    if (this.lastCanvas && this.lastHandlers.click) {
      this.lastCanvas.removeEventListener('click', this.lastHandlers.click);
    }
    this.lastHandlers = { mousemove: null, mouseleave: null, click: null };
  }
}

/** 全局单例 */
export const detailDependencyRenderer = new DetailDependencyRenderer();
