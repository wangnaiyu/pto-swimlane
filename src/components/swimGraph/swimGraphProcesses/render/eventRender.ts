/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { eventTextSize, getFontStyle } from '../../swimGraphUtils';
import { Dependencies } from './utils';

export const ARROW_WIDTH = 12;

export class EventRender {
  deps: Dependencies;

  constructor(dependencies: Dependencies) {
    this.deps = dependencies;
  }

  drawEvent(eventDatas: any, ctx: CanvasRenderingContext2D, isDimmed = false, isPinned = false) {
    const { viewState, colorCfg } = this.deps;
    const devicePixelRatio = window.devicePixelRatio || 1;
    // 当偏移量过大时，Canvas的float32变换矩阵会出现精度丢失，导致图形抖动或消失，此时切换到js手动计算坐标的高精度模式。
    const useHighPrecision = Math.abs(viewState.pixelOffsetX) > 100000;
    ctx.save();
    if (useHighPrecision) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.setTransform(viewState.pixelScale, 0, 0, devicePixelRatio, viewState.pixelOffsetX, 0);
    }
    
    for (const drawData of eventDatas) {
      if (!drawData) {
        continue;
      }
      
      const isZeroDuration = drawData.duration === 0;

      if (isZeroDuration) {
        const arrowColor = isDimmed ? colorCfg.eventRectNoColor : drawData.rectColor;
        const arrowDrawData = { ...drawData, rectColor: arrowColor };
        this.drawArrowUp(arrowDrawData, ctx, useHighPrecision, isPinned);
        continue;
      }

      let width: number;
      if (drawData.eventWidth < viewState.minWidth) {
        width = viewState.minWidth;
      } else {
        width = drawData.eventWidth;
      }

      ctx.fillStyle = isDimmed ? colorCfg.eventRectNoColor : drawData.rectColor;
      ctx.strokeStyle = drawData.strokeColor;
      ctx.beginPath();
      if (useHighPrecision) {
        const x = drawData.rectX * viewState.pixelScale + viewState.pixelOffsetX;
        let y = isPinned ? drawData.pinnedEventY * devicePixelRatio : drawData.rectY * devicePixelRatio;
        const w = width * viewState.pixelScale;
        const h = drawData.height * devicePixelRatio;
        ctx.rect(x, y, w, h);
      } else {
        let drawY = isPinned ? drawData.pinnedEventY : drawData.rectY;
        ctx.rect(drawData.rectX, drawY, width, drawData.height);
      }
      ctx.fill();
      if (drawData.strokeColor && width * viewState.scale > 10) {
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawEventText(drawDatas: any, ctx: CanvasRenderingContext2D, isDimmed = false, isPinned = false) {
    const { colorCfg } = this.deps;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const { show, text, textX, textY, fontColor, pinnedTextY } of drawDatas) {
      if (!show || !text) { continue }
      ctx.fillStyle = isDimmed ? colorCfg.eventFontNoColor : fontColor;
      ctx.font = getFontStyle(eventTextSize);
      ctx.fillText(text, textX, isPinned ? pinnedTextY : textY);
    }

    ctx.restore();
  }

  drawFlagLine(ctx: CanvasRenderingContext2D, color: string, drawX: number, lineTo: number) {
    const devicePixelRatioVlaue = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * devicePixelRatioVlaue;
    ctx.beginPath();
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, lineTo);
    ctx.stroke();
    ctx.restore();
  }

  drawArrowUp(drawData: any, ctx: CanvasRenderingContext2D, useHighPrecision: boolean, isPinned: boolean) {
    const { viewState } = this.deps;
    const devicePixelRatio = window.devicePixelRatio || 1;

    ctx.save();
    ctx.fillStyle = drawData.rectColor;
    ctx.beginPath();

    if (useHighPrecision) {
      const scale = viewState.pixelScale;
      const offsetX = viewState.pixelOffsetX;
      const baseY = isPinned ? drawData.pinnedEventY : drawData.rectY;
      const tipY = baseY * devicePixelRatio;
      const bottomY = (baseY + drawData.height) * devicePixelRatio;
      const centerX = ((drawData.rectX + (drawData.eventWidth / 2)) * scale) + offsetX;
      const halfWidth = (ARROW_WIDTH / 2) * devicePixelRatio;
      const shoulderY = bottomY - ((drawData.height / 3) * devicePixelRatio);

      ctx.moveTo(centerX, tipY);
      ctx.lineTo(centerX - halfWidth, bottomY);
      ctx.lineTo(centerX, shoulderY);
      ctx.lineTo(centerX + halfWidth, bottomY);
      ctx.lineTo(centerX, tipY);
    } else {
      const baseY = isPinned ? drawData.pinnedEventY : drawData.rectY;
      const tipY = baseY;
      const bottomY = baseY + drawData.height;
      const centerX = drawData.rectX + (drawData.eventWidth / 2);
      const halfWidth = (ARROW_WIDTH / 2) / viewState.scale;
      const shoulderY = bottomY - (drawData.height / 3);

      ctx.moveTo(centerX, tipY);
      ctx.lineTo(centerX - halfWidth, bottomY);
      ctx.lineTo(centerX, shoulderY);
      ctx.lineTo(centerX + halfWidth, bottomY);
      ctx.lineTo(centerX, tipY);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}