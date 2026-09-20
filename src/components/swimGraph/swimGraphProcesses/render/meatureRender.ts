/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { ctxs, formatTimeWithUnit, meaureTextSize, getFontStyle, nodeSpaceMin, devicePixelRatio, clearWholeProcess, eventTextSize } from '../../swimGraphUtils';
import { Dependencies, getEventColor, getNoZoomX, renderInfo2pixelData } from './utils';
import { isEqual } from 'lodash-es';
import { EventRender } from './eventRender';
import { swimDataManager } from '../../swimData';
export let altClickData = {
  preData: null,
  lastData: null,
  largeSpacing: false
};
export let measureState = {
  // 手动测距，点击第一个节点
  isMeasureFirst: false,
  // 手动测距，点击第二个节点 ，此时的测距需要保留
  isMeasureFixed: false,
  // 手动测距，是否交换
  isMeasureChange: false,
}

const boxWidth = 45;

export class MeatureRender extends EventRender {
  declare deps: Dependencies;
  private lessThan0usMsg: string;

  constructor(dependencies: Dependencies, lessThan0usMsg: string) {
    super(dependencies);
    this.lessThan0usMsg = lessThan0usMsg;
  }

  clearDrawConnector(ctx: CanvasRenderingContext2D, processKey: string) {
    const { viewState } = this.deps;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    altClickData = {
      preData: null,
      lastData: null,
      largeSpacing: false
    };
    measureState = {isMeasureFirst: false, isMeasureFixed: false, isMeasureChange: false};
    clearWholeProcess(ctx, viewState, processKey);
  }

  clearDrawConnectorHover(uiCtx: CanvasRenderingContext2D, processKey: string, isPinned=false) {
    const { isDarkTheme, viewState } = this.deps;
    //先清空画布
    uiCtx.lineWidth = 2;
    uiCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    clearWholeProcess(uiCtx, viewState, processKey);
    // 补画第一个手动测距的节点
    uiCtx.strokeStyle = isDarkTheme.value ? "#FFFFFF" : '#191919';
    uiCtx.lineWidth = 2 / viewState.scale;
    this.strokeRoundRect(uiCtx, altClickData.preData, processKey, isPinned);
  }

  drawNodeRoundedRect = (uiCtx: CanvasRenderingContext2D, event: any, processKey: string) => {
    this.clearDrawConnector(uiCtx, processKey);
    this.drawRoundedRect(uiCtx, event, processKey);
  };

  handleDistanceMeasurement = (uiCtx: CanvasRenderingContext2D, event: any, processKey: string, isZoomMode = false, isPinned=false) => {
    const shouldClearDrawConnector = !isZoomMode && altClickData.preData && altClickData.lastData && (measureState.isMeasureFixed || !measureState.isMeasureFirst);
    if (shouldClearDrawConnector) {
      this.clearDrawConnector(uiCtx, processKey);
    }
    if (!isZoomMode) {
      if (!altClickData.preData) {
        altClickData.preData = event;
        measureState.isMeasureFirst = true;
      } else {
        if (isEqual(altClickData.preData, event) && !altClickData.lastData) { 
          return;
        }
        measureState.isMeasureFixed = true;
        altClickData.lastData = event;
      }
    }
    this.drawRoundedRect(uiCtx, event, processKey, isPinned);
    if (isZoomMode && altClickData.preData) {
      this.drawRoundedRect(uiCtx, altClickData.preData, processKey, isPinned);
    }
    this.calculateAndDrawConnection(uiCtx, isPinned);
  };

  measureDistanceHover(uiCtx: CanvasRenderingContext2D, isPinned=false) {
    const { viewState } = this.deps;
    if (altClickData.preData && altClickData.lastData){
      const { renderInfo: preRenderInfo } = altClickData.preData;
      const { renderInfo: lastRenderInfo } = altClickData.lastData;
      const { x: preX, y: preY, width: perWidth} = preRenderInfo;
      const { x: lastX, y: lastY} = lastRenderInfo;
      const nodeSpacingX = Math.min(Math.abs(lastX - (preX + perWidth)), Math.abs(lastX - preX)) * viewState.scale;
      if (nodeSpacingX < 3) { return; }
      let largeSpacing = nodeSpacingX > nodeSpaceMin;
      if (lastX < preX){
          let temp = altClickData.preData;
          altClickData.preData = altClickData.lastData;
          altClickData.lastData = temp;
          measureState.isMeasureChange = true;
      } else {
        measureState.isMeasureChange = false;
      }
      // 同泳道
      if (lastY === preY){
        this.drawConnector(uiCtx, largeSpacing, isPinned);
      } else {
        largeSpacing = nodeSpacingX > 60;
        this.drawDiffConnector(uiCtx, largeSpacing, isPinned);
      }
    }
  }

  private fillText(ctx: CanvasRenderingContext2D, rect: any, scrollY = 0) {
    const measureY = scrollY === 0 ? rect.y : scrollY;
    ctx.font = getFontStyle(meaureTextSize);
    const oriTextAlign = ctx.textAlign;
    const oriTextBaseline = ctx.textBaseline;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerX = rect.x + rect.width / 2;
    const centerY = measureY + rect.height / 2;
    const metrics = ctx.measureText(rect.text);
    let ascent = metrics.actualBoundingBoxAscent;
    let descent = metrics.actualBoundingBoxDescent;

    // 如果浏览器不支持 actualBoundingBox...，回退到估算
    if (ascent === undefined || descent === undefined) {
      const fontSize = parseFloat(ctx.font);
      ascent = fontSize * 0.8;
      descent = fontSize * 0.2;
    }
    const textHeight = ascent + descent;
    const textY = centerY + (ascent - textHeight / 2);
    ctx.fillText(rect.text, centerX, textY);
    ctx.textAlign = oriTextAlign;
    ctx.textBaseline = oriTextBaseline;
  }

  drawConnector(ctx: CanvasRenderingContext2D, largeSpacing: boolean, isPinned=false) {
    let scrollTop = 0;
    const scrollableDiv = document.querySelector('.scroller-container');
    if (scrollableDiv) {
      scrollTop = scrollableDiv.scrollTop;
    }
    const { isDarkTheme } = this.deps;
    const rect = this.calculateRect(largeSpacing, isPinned);
    // 填充矩形
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
    ctx.beginPath();
    const { layout } = this.deps;
    let scrollY = scrollTop > 0 && scrollTop - rect.y > layout.threadHeight && !largeSpacing ? rect.y + layout.threadHeight * 2 : rect.y;
    if (isPinned) {
      scrollY = rect.y;
    }
    ctx.roundRect(rect.x, scrollY, rect.width, rect.height, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    this.fillText(ctx, rect, scrollY);
    // 绘制双向箭头
    if (largeSpacing){
      this.drawDoubleArrow(rect, ctx);
    } else {
      this.drawDistanceSelectionBox(ctx, isPinned);
    }
    ctx.restore();
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, event: any, processKey: string, isPinned=false) {
    const { isDarkTheme, viewState } = this.deps;
    ctx.strokeStyle = isDarkTheme.value ? '#FFFFFF' : '#191919';
    ctx.lineWidth = 2 / viewState.scale;
    this.strokeRoundRect(ctx, event, processKey, isPinned);
  }

  private calculateAndDrawConnection = (uiCtx: CanvasRenderingContext2D, isPinned=false) => {
    const { viewState } = this.deps;
    if (!altClickData.preData || !altClickData.lastData) {
      return;
    }
    const { renderInfo: preRenderInfo } = altClickData.preData;
    const { renderInfo: lastRenderInfo } = altClickData.lastData;
    
    if (!preRenderInfo || !lastRenderInfo) {
      return;
    }
    
    const { x: preX, y: preY, width: preWidth} = preRenderInfo;
    const { x: lastDataX, y: lastDataY} = lastRenderInfo;
    const nodeSpacingX = Math.min(Math.abs(lastDataX - (preX + preWidth)), Math.abs(lastDataX - preX)) * viewState.scale;
    if (nodeSpacingX < 3) {
      return;
    }
    let largeSpacing = nodeSpacingX > nodeSpaceMin;
    if (lastDataX < preX) {
      let temp = altClickData.preData;
      altClickData.preData = altClickData.lastData;
      altClickData.lastData = temp;
    }
    // 同泳道
    if (lastDataY === preY) {
      this.drawConnector(uiCtx, largeSpacing, isPinned);
    } else {
      largeSpacing = nodeSpacingX > 60;
      this.drawDiffConnector(uiCtx, largeSpacing, isPinned);
    }
  };

  private drawDiffConnector(ctx: CanvasRenderingContext2D, largeSpacing: boolean, isPinned=false) {
    const { isDarkTheme, viewState } = this.deps;
    const rect = this.calculateDiffRect(largeSpacing, isPinned);
    // 填充矩形
    ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
    ctx.beginPath();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    this.fillText(ctx, rect);
    if (!largeSpacing){
      return;
    }
    // 绘制线水平实线部分
    ctx.beginPath();
    let {x: preX, y: preY, width: preWidth, height: preHeight, pinnedEventY: prePinnY} = renderInfo2pixelData(altClickData.preData.renderInfo, viewState);
    if (isPinned) {
      preY = prePinnY;
    }
    let {x: lastX, y: lastY, pinnedEventY: lastPinY} = renderInfo2pixelData(altClickData.lastData.renderInfo, viewState);
    if (isPinned) {
      lastY = lastPinY;
    }
    const arrowLeftStartX = preX + preWidth;
    const leftLineWidth = lastX;
    const leftLineHeight = preY + preHeight / 2;
    ctx.moveTo(arrowLeftStartX, leftLineHeight ); 
    ctx.lineTo(leftLineWidth, leftLineHeight);
    ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 左侧箭头头部
    const arrowSize = 8;
    ctx.beginPath();
    ctx.moveTo(arrowLeftStartX, preY + preHeight /2);
    ctx.lineTo(arrowLeftStartX + arrowSize, leftLineHeight - arrowSize / 2);
    ctx.lineTo(arrowLeftStartX + arrowSize, leftLineHeight + arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.fill();
    // 垂直虚线部分（从水平线末端垂直延伸到第二个节点）
    ctx.beginPath();
    ctx.setLineDash([5, 3]);
    ctx.moveTo(leftLineWidth, preY + preHeight /2);
    ctx.lineTo(leftLineWidth, lastY + preHeight /2);
    ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    // 右侧箭头头部
    ctx.beginPath();
    const arrowRightStartX = leftLineWidth;
    ctx.moveTo(arrowRightStartX, preY + preHeight /2);
    ctx.lineTo(arrowRightStartX - arrowSize, leftLineHeight - arrowSize / 2);
    ctx.lineTo(arrowRightStartX - arrowSize, leftLineHeight + arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.fill();
    ctx.restore();
  }

  private calculateDiffRect(largeSpacing: boolean, isPinned=false) {
    const { viewState, layout } = this.deps;
    let { x: preX, width: preWidth, y: preY, height: preHeight, pinnedEventY } = renderInfo2pixelData(altClickData.preData.renderInfo, viewState);
    if (isPinned) {
      preY = pinnedEventY;
    }
    if (!largeSpacing) {
      preY = preY < layout.threadHeight ? preY + layout.threadHeight : preY - layout.threadHeight;
    }
    let { x: lastX} = altClickData.lastData.renderInfo;
    lastX = getNoZoomX(lastX, viewState);
    const width = boxWidth * devicePixelRatio;
    const height = preHeight;
    const start = altClickData.lastData.startTime;
    const end = altClickData.preData.endTime;
    const diffTime = Math.abs(start - end);
    const text = this.getMeasureDistance(diffTime);
    const rectY = preY - height < 0 ? preY + height : preY - height; 
    
    const leftX = preX + preWidth;  // 连线左端点
    const rectX = leftX + (lastX - leftX - width) / 2;
    
    return {
      x: rectX,
      y: rectY,
      width: width,
      height: height,
      text: text,
    };
  }

  // 计算矩形位置
  private calculateRect(largeSpacing: boolean, isPinned=false) {
    const { viewState, layout } = this.deps;
    let { x: preX, width: preWidth, y: preY, height: preHeight } = altClickData.preData.renderInfo;
    // 对于置顶泳道，使用 pinnedEventY 而不是 y
    if (isPinned) {
      preY = altClickData.preData.renderInfo.pinnedEventY;
    }
    if (!largeSpacing) {
      preY = preY < layout.threadHeight ? preY + layout.threadHeight : preY - layout.threadHeight;
    }
    let { x: lastX } = altClickData.lastData.renderInfo;
    lastX = getNoZoomX(lastX, viewState);
    const width = boxWidth * devicePixelRatio;
    const height = preHeight;
    const centerY = preY + height / 2;
    const start = altClickData.lastData.startTime;
    const end = altClickData.preData.endTime;
    const diffTime = Math.abs(start - end);
    const text = this.getMeasureDistance(diffTime);
    const leftX = getNoZoomX(preX + preWidth, viewState);  // 连线左端点
    const rectX = leftX + (lastX - leftX - width) / 2;
    return {
      leftX: leftX,
      rightX: lastX,
      x: rectX,
      y: preY * devicePixelRatio,
      width: width,
      height: height * devicePixelRatio,
      centerX: rectX + (width / 2 - text.length) / 2,
      centerY: centerY * devicePixelRatio,
      text: text,
      arrowWidth: (lastX - leftX - width - 6) / 2
    };
  }

  private getMeasureDistance(diffTime: any) {
    const { tsScale } = this.deps;
    const timeInfo = formatTimeWithUnit(diffTime * 1000 / tsScale.value);
    if (Number(timeInfo.value) === 0){
      return this.lessThan0usMsg;
    }
    return timeInfo.value + timeInfo.unit;
  }

  private strokeRoundRect(ctx: CanvasRenderingContext2D, event: any, processKey: string, isPinned=false) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const temp = JSON.parse(JSON.stringify(event));
    const { fillColor, fontColor, strokeColor } = getEventColor(temp, this.deps, processKey, true, true);
    temp.drawData.rectColor = fillColor;
    temp.drawData.strokeColor = strokeColor;
    temp.drawData.fontColor = fontColor;
    if (isPinned && !temp.drawData.pinnedEventY && temp.parentEventId) {
      const pEvent = swimDataManager.getEventById(temp.parentEventId);
      const eventY = pEvent.drawData.pinnedEventY;
      if (eventY) {
        temp.drawData.pinnedEventY = eventY;
        temp.drawData.pinnedTextY = eventY * devicePixelRatio + eventTextSize;
      }
    }
    const pixelWidth = temp.drawData.eventWidth * this.deps.viewState.scale;
    if (pixelWidth < 15) {
      temp.drawData.text = '';
    }
    this.drawEvent([temp.drawData], ctx, false, isPinned);
    this.drawEventText([temp.drawData], ctx, false, isPinned);
    ctx.restore();
  }

  // 绘制双向箭头
  private drawDoubleArrow(rect: any, ctx: CanvasRenderingContext2D) {
    const { isDarkTheme } = this.deps;
    const arrowSize = 8;
  
    // 左侧箭头（指向左边）
    const actLeft = rect.leftX;
    const leftLineWidth = actLeft + arrowSize - 2;
    const { centerY } = rect;
    ctx.beginPath();
    ctx.moveTo(rect.x, centerY); 
    ctx.lineTo(leftLineWidth, centerY);
    ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.lineWidth = 2;
    ctx.stroke();
  
    // 左侧箭头头部
    ctx.beginPath();
    ctx.moveTo(leftLineWidth - arrowSize / 2, centerY);
    ctx.lineTo(leftLineWidth - arrowSize / 2 + arrowSize, centerY - arrowSize / 2);
    ctx.lineTo(leftLineWidth - arrowSize / 2 + arrowSize, centerY + arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.fill();
  
    // 右侧箭头（指向右边）
    const rightLineWidth = rect.rightX - arrowSize + 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.width, centerY);
    ctx.lineTo(rightLineWidth, centerY);
    ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.lineWidth = 2;
    ctx.stroke();
  
    // 右侧箭头头部
    ctx.beginPath();
    ctx.moveTo(rightLineWidth + arrowSize / 2, centerY);
    ctx.lineTo(rightLineWidth + arrowSize / 2 - arrowSize + 1, centerY - arrowSize / 2);
    ctx.lineTo(rightLineWidth + arrowSize / 2 - arrowSize + 1, centerY + arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.fill();
  }

  private drawDistanceSelectionBox(ctx: CanvasRenderingContext2D, isPinned=false) {
    const { isDarkTheme, viewState } = this.deps;
    let { x: preX, y: preY, width: preWidth, height: preHeight, pinnedEventY } = renderInfo2pixelData(altClickData.preData.renderInfo, viewState);
    if (isPinned) {
      preY = pinnedEventY;
    }
    const {x: lastX} = renderInfo2pixelData(altClickData.lastData.renderInfo, viewState);
    // 填充矩形
    ctx.fillStyle = 'rgba(49, 122, 247, 0.4)';
    ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.roundRect(preX + preWidth + 1, preY - 2, lastX - (preX + preWidth), preHeight + 4, 4);
    ctx.fill();
    ctx.stroke();
  }
}