/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { swimDataManager } from '../../swimData';
import { devicePixelRatio } from '../../swimGraphUtils';
import { getEventColorByMode } from '../processInfo';

export interface Dependencies {
  viewState: any;
  isDarkTheme: any;
  isLockStatus: any;
  spaceInThreeCol: number;
  colorCfg: any;
  selectedEvent: any;
  highlightedPaths: any;
  mixRelatedPaths: any;
  devicePixelRatio: number;
  layout: any;
  isKeyPressed: any;
  searchedEvent: any;
  userConfig: any;
  colorRending: any;
  tsScale: any;
  isMsProf: any;
}

export function selectNoNodeWarm(): any {
  (window as any).ascEventBus.emit('message_notice', (window as any).ascLang === 'en' ? 'Please select the node first' : '请先选中节点');
  return;
}

export function isPointInPolygonFun(point: any, polygonBoundaries: any): boolean {
  if (!polygonBoundaries || polygonBoundaries.length === 0) {
    return false;
  }

  const [x, y] = point;

  // 构建边界多边形的所有顶点
  const polygonPoints = [];

  // 收集左边界点（从上到下）
  for (let i = 0; i < polygonBoundaries.length; i++) {
    for (let j = 0; j < polygonBoundaries[i].length; j++) {
      polygonPoints.push(polygonBoundaries[i][j].leftTop);
    }
  }
  polygonPoints.push(polygonBoundaries[polygonBoundaries.length - 1][polygonBoundaries[polygonBoundaries.length - 1].length - 1].leftBottom);

  // 收集右边界点（从下到上）
  for (let i = polygonBoundaries.length - 1; i >= 0; i--) {
    for (let j = polygonBoundaries[i].length - 1; j >= 0; j--) {
      polygonPoints.push(polygonBoundaries[i][j].rightBottom);
      polygonPoints.push(polygonBoundaries[i][j].rightTop);
    }
  }

  // 使用射线法判断点是否在多边形内
  let inside = false;
  for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
    const [xi, yi] = polygonPoints[i];
    const [xj, yj] = polygonPoints[j];

    // 检查点是否在多边形边界上
    const pointsObj = {
      p1: { x: xi, y: yi },
      p2: { x: xj, y: yj },
      point: { x, y }
    };
    if (isPointOnVertex(pointsObj)) {
      return true;
    }

    // 射线法核心判断
    const intersect = ((yi > y) !== (yj > y)) && 
      (x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointOnVertex({ p1, p2, point }): boolean {
  return (p1.x === point.x && p1.y === point.y) || (p2.x === point.x && p2.y === point.y);
}

export function computeLocalXY(canvasRef: any, mousePosition: any, viewState: any) {
  const rect = canvasRef.getBoundingClientRect();
  const x = (mousePosition.x - rect.left - viewState.offsetX) / viewState.scale;
  const y = mousePosition.y - rect.top;
  return { x, y };
}

export function getNoZoomX(x: number, viewState: any) {
  return viewState.pixelOffsetX + (x * viewState.pixelScale)
}

export function getKernalEventColor(event: any, deps: Dependencies, processKey: string, highlight = false, stroke = true) {
  const { colorCfg, isDarkTheme, userConfig } = deps;
  const process = swimDataManager.getProcess(processKey);
  const processType = process?.type || process?.args?.type || 'kernel';
  const color = getEventColorByMode(event, userConfig?.value.kernelColorRending || 'subGraph', processType, userConfig?.value.hashOrderRending);
  event.color = color;
  const eventColor = isDarkTheme.value ? event.color.dark : event.color.light;
  let fillColor = eventColor ? eventColor.base : '';
  let fontColor = colorCfg.eventFont;
  let strokeColor = '';
  if (highlight) {
    fillColor = eventColor.light;
    fontColor = colorCfg.eventFontHighLight;
    if (stroke) strokeColor = colorCfg.eventHighLightStroke;
  }
  const colors = { fillColor, fontColor, strokeColor };
  return colors;
}

function ensureEventColor(event: any, deps: Dependencies, processType: string): void {
  const { userConfig, isMsProf } = deps;
  if (!event.color?.dark || event.parentEventId) {
    const effectiveProcessType = event.originalThreadName ? 'aicpu' : processType;
    const colorMode = isMsProf.value ? 'name' : (userConfig?.value.kernelColorRending || 'subGraph');
    const color = getEventColorByMode(event, colorMode, effectiveProcessType, userConfig?.value.hashOrderRending);
    event.color = color;
    swimDataManager.updateEvent(event.id, { color });
  }
}

function computeKeepColor(event: any, deps: Dependencies): boolean {
  const { selectedEvent, highlightedPaths, mixRelatedPaths, searchedEvent } = deps;
  const isSelectedValue = selectedEvent.value && selectedEvent.value.id === event.id;
  const isSearchedEvent = searchedEvent.value && searchedEvent.value.id === event.id;
  if (isSelectedValue || isSearchedEvent) {
    return true;
  }
  if (!selectedEvent.value) {
    return !searchedEvent.value;
  }
  const eventParentId = event.parentEventId;
  const selectParentId = selectedEvent.value?.parentEventId;
  if (eventParentId && selectParentId) {
    const sameWrap = event.args.wrapId === selectedEvent.value.args.wrapId;
    return sameWrap ? mixRelatedPaths.has(event.id) || eventParentId === selectParentId : highlightedPaths.has(eventParentId);
  }
  if (eventParentId) {
    return highlightedPaths.has(eventParentId);
  }
  return highlightedPaths.has(event.id);
}

export function getEventColor(event: any, deps: Dependencies, processKey: string, highlight = false, stroke = true) {
  const { colorCfg, isDarkTheme } = deps;
  const process = swimDataManager.getProcess(processKey);
  const processType = process?.type || process?.args?.type || 'kernel';
  ensureEventColor(event, deps, processType);
  const eventColor = isDarkTheme.value ? event.color.dark : event.color.light;
  let fillColor = eventColor ? eventColor.base : '';
  let fontColor = colorCfg.eventFont;
  let strokeColor = '';

  if (!computeKeepColor(event, deps)) {
    fillColor = colorCfg.eventRectNoColor;
    fontColor = colorCfg.eventFontNoColor;
  }

  if (highlight) {
    fillColor = eventColor.light;
    fontColor = colorCfg.eventFontHighLight;
    if (stroke) strokeColor = colorCfg.eventHighLightStroke;
  }

  return { fillColor, fontColor, strokeColor };
}

export function renderInfo2pixelData(renderInfo: any, viewState: any) {
  const { x, width, y, height, pinnedEventY } = renderInfo;
  return {
    x: getNoZoomX(x, viewState),
    width: width * viewState.pixelScale,
    y: y * devicePixelRatio,
    height: height * devicePixelRatio,
    pinnedEventY: pinnedEventY * devicePixelRatio || 0,
  };
}

export function getOffset(deltaX: number, scale: number) {
  if (scale <= 10) {
    return deltaX / scale;
  }
  if (scale <= 100) {
    return (deltaX / scale) * 10;
  }
  if (scale <= 1000) {
    return deltaX * (1 / Math.log2(scale));
  }
  return deltaX * (1.25 / Math.log2(scale));
}

export function getRootHashList(eventHintStr: string) {
  // 添加输入验证
  if (typeof eventHintStr !== 'string') {
    return [];
  }

  // 使用全局匹配和命名捕获组，支持匹配多个根哈希
  const rootHashRegex = /rootHash:(?<hash>\d+)/g;
  const matches = [...eventHintStr.matchAll(rootHashRegex)];

  // 使用可选链和空值合并确保安全提取
  const hashArray = matches.map((match) => match?.groups?.hash).filter((hash) => hash != null);
  return hashArray.join(',');
}
export function getActiveEventCanvas(processKey: string) {
  return document.querySelector(`[data-process-key="${processKey}"]`);
}
export function buildEventMap(process: any)  {
  const eventMap = new Map();
  for (const [, thread] of process.threads) {
    for (const event of thread.events) {
      eventMap.set(event.id, event);
    }
  }
  return eventMap;
}

export function matchKey (key: string, configKey: string) {
  if (configKey === undefined || configKey === null) {
    return false;
  } 
  return key === configKey || key === configKey.toLowerCase();
}

export function handleMatchKey(key: string, config: any) {
  config?.value && (config.value.ZoomInShortcut ||= 'w');
  config?.value && (config.value.ZoomOutShortcut ||= 's');
  config?.value && (config.value.leftmoveShortcut ||= 'a');
  config?.value && (config.value.rightmoveShortcut ||= 'd');
  return (
    matchKey(key, config?.value.ZoomInShortcut) ||
    matchKey(key, config?.value.ZoomOutShortcut) ||
    matchKey(key, config?.value.leftmoveShortcut) ||
    matchKey(key, config?.value.rightmoveShortcut)
  );
}

export function getCanvasRefs(processKey: string) {
  const canvasRef = getActiveEventCanvas(processKey);
  if (!canvasRef) { return null };
  const uiCanvasRef = document.querySelector(`[data-ui-process-key="${processKey}"]`);
  if (!uiCanvasRef) { return null };
  const hoverCanvasRef = document.querySelector(`[data-hover-process-key="${processKey}"]`);
  if (!hoverCanvasRef) { return null };
  const backgroundCanvasRef = document.querySelector(`[data-background-process-key="${processKey}"]`);
  if (!backgroundCanvasRef) { return null };
  const lineCanvasRef = document.querySelector(`[data-line-process-key="${processKey}"]`);
  if (!lineCanvasRef) { return null };
  const selectionCanvasRef = document.querySelector(`[data-selection-process-key="${processKey}"]`);
  if (!selectionCanvasRef) { return null };
  const threeColumnCanvasRef = document.querySelector(`[data-three-column-process-key="${processKey}"]`);
  if (!threeColumnCanvasRef) { return null };
  const mixHoverCanvasRef = document.querySelector(`[data-mix-hover-process-key="${processKey}"]`);
  if (!mixHoverCanvasRef) { return null };
  return {
    canvasRef,
    uiCanvasRef,
    uiCtx: uiCanvasRef.getContext('2d'),
    hoverCanvasRef,
    backgroundCanvasRef,
    backgroundCanvasCtx: backgroundCanvasRef.getContext('2d'),
    lineCanvasRef,
    selectionCanvasRef,
    threeColumnCanvasRef,
    mixHoverCanvasRef
  };
}

export function getUIContext(processKey: string)  {
  const uiCanvasRef = document.querySelector(`[data-ui-process-key="${processKey}"]`);
  return uiCanvasRef.getContext('2d');
}
