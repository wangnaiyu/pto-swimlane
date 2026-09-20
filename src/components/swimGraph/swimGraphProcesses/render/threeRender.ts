/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { clearWholeProcess } from '../../swimGraphUtils';
import { EventRender } from './eventRender';
import { Dependencies } from './utils';

export const spaceInThreeCol = 4;
export let isAnimation = true;
let traveledHead = 0;
let lastTime = performance.now();
const BASE_SPEED = 0.2;
const MIN_PERIMETER = 500;
let LINE_LENGTH = 60;
let edges = [];
let edgeStartDistances = [];
let totalPathLength = 0;
let cumulativeLength = 0;
let currentBoundaries: any = null;
let currentProcessKey: string = '';
interface Point {
  leftTop: [number, number];
  rightTop: [number, number];
  leftBottom: [number, number];
  rightBottom: [number, number];
  width: number;
}

export class ThreeRender extends EventRender {
  private perimeterMap = new Map<string, number>();
  declare deps: Dependencies;

  constructor(dependencies: Dependencies) {
    super(dependencies);
  }

  // 三栏模式，高亮描边
  drawBoundary(boundaries: any, processKey: string) {
    currentBoundaries = boundaries;
    currentProcessKey = processKey;
    const { viewState, isDarkTheme, isLockStatus } = this.deps;
    const boundaryCanvas: HTMLCanvasElement = document.querySelector(`[data-three-column-process-key="${processKey}"]`);
    if (!boundaryCanvas) return;
    const boundaryCtx = boundaryCanvas.getContext('2d');
    if (!boundaryCtx) return;
    clearWholeProcess(boundaryCtx, viewState, processKey);
    if (!boundaries) return;

    const space = spaceInThreeCol;
    const xSpace = space / viewState.scale;
    const { minLeft, maxRight } = boundaries.reduce((acc, group) => {
      return group.reduce((groupAcc, item) => {
        const [left] = item.leftTop;
        const [right] = item.rightTop;
        return {
          minLeft: Math.min(groupAcc.minLeft, left),
          maxRight: Math.max(groupAcc.maxRight, right)
        };
      }, acc);
    }, { minLeft: Infinity, maxRight: -Infinity });
    const isAtLeftEdge = viewState.offsetX === 0 && minLeft <= xSpace;
    const isAtRightEdge = viewState.offsetX === 0 && maxRight >= viewState.canvasWidth;
    // 计算每个区域的左右边界范围
    const tempRegions = boundaries.map(region => {
      return region.map((row: any) => {
        const leftX = isAtLeftEdge ? row.leftTop[0] : row.leftTop[0] - xSpace;
        const rightX = isAtRightEdge ? row.rightTop[0] : row.rightTop[0] + xSpace;
        const topY = row.leftTop[1] - space;
        const bottomY = row.leftBottom[1] + space;
        return {
          leftTop: [leftX, topY],
          leftBottom: [leftX, bottomY],
          rightTop: [rightX, topY],
          rightBottom: [rightX, bottomY],
          width: rightX - leftX
        };
      });
    });
    if (isLockStatus.value) {
      boundaryCtx.strokeStyle = isDarkTheme.value ? 'rgba(49, 122, 247, 1)' : 'rgba(10, 89, 247, 1)';
      boundaryCtx.lineWidth = 1.5 / viewState.scale;
    } else {
      boundaryCtx.strokeStyle = isDarkTheme.value ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
      boundaryCtx.lineWidth = 1 / viewState.scale;
    }
    // 遍历每个区域并绘制路径
    this.drawPath(boundaryCtx, tempRegions);
    // 绘制不同区域的连线
    this.drawConnectLines(tempRegions, boundaryCtx);
  }

  private drawPath(ctx: CanvasRenderingContext2D, tempRegions: Point[][]) {
    tempRegions.forEach((region, index) => {
      ctx.beginPath();
      const [ firstRow ] = region;
      const lastRow = region[region.length - 1];
      // 起点：首行左上
      ctx.moveTo(...firstRow.leftTop);
      // 绘制左边界
      for (let i = 0; i < region.length; i++) {
        const currentRow = region[i];
        if (i === 0) {
          // 首行：直接左上 -> 左下
          ctx.lineTo(...currentRow.leftBottom);
        } else {
          const preRow = region[i - 1];
          // 从上一行左下 -> 水平移动到当前行X坐标 -> 垂直上升到当前行左上
          const [preLeftBottomX] = preRow.leftBottom;
          const [currLeftBottomX] = currentRow.leftBottom;
          const [preRightBottomX] = preRow.rightBottom;
          const [currRightBottomX] = currentRow.rightBottom;
          const isNodeRegistration = Math.abs(preLeftBottomX - currLeftBottomX) < currentRow.width;
          const isLineCross = (Math.abs(preLeftBottomX - currLeftBottomX) - currentRow.width) === (Math.abs(preRightBottomX - currRightBottomX) - preRow.width);
          if (!isLineCross || isNodeRegistration) {
            ctx.lineTo(preLeftBottomX, currentRow.leftTop[1]);  // 水平过渡
          }
          ctx.lineTo(...currentRow.leftTop);  // 垂直上升
          ctx.lineTo(...currentRow.leftBottom);  // 垂直上升
        }
      }
      // 绘制右边界
      // 从最下行左下 -> 右下
      ctx.lineTo(...lastRow.rightBottom);
      for (let i = region.length - 1; i >= 0; i--) {
        const currentRow = region[i];
        if (i === region.length - 1) {
          // 最下行： 直接右下 -> 右上
          ctx.lineTo(...currentRow.rightTop);
        } else {
          const nextRow = region[i + 1];
          // 从下一行右上 -> 水平移动到当前行X坐标 -> 垂直下降到当前行右下
          const isNodeRegistration = Math.abs(currentRow.leftBottom[0] - nextRow.leftBottom[0]) < nextRow.width;
          const isLineCross = (Math.abs(currentRow.leftBottom[0] - nextRow.leftBottom[0]) - nextRow.width) === (Math.abs(currentRow.rightBottom[0] - nextRow.rightBottom[0]) - currentRow.width);
          if (!isLineCross || isNodeRegistration) {
            ctx.lineTo(nextRow.rightTop[0], currentRow.rightBottom[1]);  // 水平过渡
          }
          ctx.lineTo(...currentRow.rightBottom);  // 垂直上升
          ctx.lineTo(...currentRow.rightTop);  // 垂直下降
        }
      }
      // 闭合路径: 首行右上 -> 左下
      ctx.lineTo(...firstRow.rightTop);
      ctx.lineTo(...firstRow.leftTop);
      ctx.closePath();
      const contour = this.buildOuterContour(region);
      edges = [];
      cumulativeLength = 0;
      edgeStartDistances = [];
      for (let i = 0; i < contour.length - 1; i++) {
        const p1 = contour[i];
        const p2 = contour[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) {
          continue;
        }
        edgeStartDistances.push(cumulativeLength);
        edges.push({
          start: p1,
          end: p2,
          length: len,
          isHorizontal: Math.abs(dy) < 1e-6,
          dx,
          dy,
        });
        cumulativeLength += len;
      }
      totalPathLength = cumulativeLength;
      this.perimeterMap.set(currentProcessKey, totalPathLength);
      const targetLength = this.getLineLength();
      LINE_LENGTH = Math.max(60, Math.min(400, targetLength));
      const secondLinePosition = (traveledHead + totalPathLength / 2) % totalPathLength;
      const lineSegs1 = this.getLineSegments(traveledHead);
      const lineSegs2 = this.getLineSegments(secondLinePosition);
      ctx.save();
      const gradientFill = ctx.createLinearGradient(lineSegs1[0].x1, lineSegs1[0].y1, lineSegs2[0].x1, lineSegs2[0].y1);
      gradientFill.addColorStop(0.25, 'rgba(144, 184, 249, 0.2)');
      gradientFill.addColorStop(0.5, 'rgba(184, 173, 253, 0.2)');
      gradientFill.addColorStop(0.75, 'rgba(219, 149, 251, 0.2)');
      gradientFill.addColorStop(1, 'rgba(234, 142, 222, 0.2)');
      ctx.fillStyle = gradientFill;
      ctx.fill();
      ctx.stroke();
      const { isLockStatus } = this.deps;
      // 绘制第一条线：整体渐变 + 淡出
      this.drawFadingPath(lineSegs1, '#90b8f9', '#b8adfd', ctx);
      // 绘制第二条线：整体渐变 + 淡出
      const [color1, color2] = isLockStatus.value ? ['#90b8f9', '#b8adfd'] : ['#db95fb', '#ea8ede'];
      this.drawFadingPath(lineSegs2, color1, color2, ctx);
      ctx.restore();
    });
  }
  
  private getLineLength() {
    let targetLength: number;
    if (totalPathLength < 600) {
      targetLength = totalPathLength / 8;
    } else if (totalPathLength < 1500) {
      targetLength = totalPathLength / 6;
    } else {
      // 对数增长：平滑拉长，避免过长
      targetLength = 100 + Math.log(totalPathLength / 100) * 80;
    }
    return targetLength;
  }
  
  private drawConnectLines(tempRegions: Point[][], ctx: CanvasRenderingContext2D) {
    if (tempRegions.length < 2 || !ctx) return;
  
    const gradientColors = ['#90b8f9', '#b8adfd', '#db95fb', '#ea8ede'];
    const colorStops = gradientColors.map((color, index, arr) => ({
      color,
      position: index / (arr.length - 1),
    }));
  
    // 遍历相邻区域对
    for (let i = 0; i < tempRegions.length - 1; i++) {
      const currentRegion = tempRegions[i];
      const nextRegion = tempRegions[i + 1];
  
      // 当前区域的出口：最后一行
      const fromRow = currentRegion[currentRegion.length - 1];
      // 下一区域的入口：第一行
      const toRow = nextRegion[0];
  
      const [cp1, cp2] = this.calculateControlPoints(fromRow.rightBottom, toRow.leftTop);
  
      ctx.beginPath();
      ctx.moveTo(...fromRow.rightBottom);
      ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], ...toRow.leftTop);
  
      const gradient = ctx.createLinearGradient(
        fromRow.rightBottom[0], fromRow.rightBottom[1],
        toRow.leftTop[0], toRow.leftTop[1]
      );
      colorStops.forEach(stop => gradient.addColorStop(stop.position, stop.color));
      ctx.strokeStyle = gradient;
      ctx.stroke();
    }
  }

  private calculateControlPoints(start: [number, number], end: [number, number]) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // 根据目标点在上方调整控制点逻辑
    const isAbove = end[1] < start[1];  // 判断是否在上方
    return [
      // 第一个控制点： 向右下方偏移
      [start[0] + (absDx * 0.3), start[1] + (absDy * (isAbove ? 0.2 : 0.4))],
      // 第二个控制点： 向左上方偏移
      [end[0] - (absDx * 0.3), end[1] - (absDy * (isAbove ? 0.4 : 0.2))]
    ];
  }
  // ====== 辅助：将线段数组转为点序列 ======
  private segmentsToPoints(segments) {
    if (segments.length === 0) return [];
    const points = [{ x: segments[0].x1, y: segments[0].y1 }];
    for (const seg of segments) {
      points.push({ x: seg.x2, y: seg.y2 });
    }
    return points;
  }

  // ====== 辅助：沿点序列采样等距点 ======
  private samplePath(points, spacing = 1) {
    if (points.length < 2) return [];

    const samples = [];
    let remaining = 0; // 上一段剩余未走完的距离

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;

      const dirX = dx / len;
      const dirY = dy / len;

      let dist = remaining;
      while (dist < len) {
        const x = p1.x + dirX * dist;
        const y = p1.y + dirY * dist;
        samples.push({ x, y });
        dist += spacing;
      }
      remaining = dist - len; // 剩余到下一段
    }

    return samples;
  }

  // ====== 插值颜色函数 ======
  private lerpColor(colorA, colorB, t) {
    const r = Math.round(colorA.r + (colorB.r - colorA.r) * t);
    const g = Math.round(colorA.g + (colorB.g - colorA.g) * t);
    const b = Math.round(colorA.b + (colorB.b - colorA.b) * t);
    return { r, g, b };
  }

  private hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  // ====== 绘制带淡出效果的路径 ======
  private drawFadingPath = (segments, startColorHex, endColorHex, ctx) => {
    if (segments.length === 0) return;

    const points = this.segmentsToPoints(segments);
    const samples = this.samplePath(points, 1); // 每1px一个点
    if (samples.length < 2) return;

    const total = samples.length - 1;
    const startColor = this.hexToRgb(startColorHex);
    const endColor = this.hexToRgb(endColorHex);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 计算整个路径的中心点位置
    const centerIndex = Math.floor(total / 2);

    for (let i = 0; i < total; i++) {
      const t = i / total; // 0 → 1

      // 根据距离中心点的位置调整透明度，形成淡入淡出效果
      let alpha;
      if (i <= centerIndex) {
        alpha = i / centerIndex; // 从0→1
      } else {
        alpha = (total - i) / centerIndex; // 从1→0
      }
      alpha = Math.max(0, Math.min(1, alpha)); // 确保alpha在0-1之间

      const color = this.lerpColor(startColor, endColor, t);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

      ctx.beginPath();
      ctx.moveTo(samples[i].x, samples[i].y);
      ctx.lineTo(samples[i + 1].x, samples[i + 1].y);
      ctx.stroke();
    }
  };
  private animate = (now?: number) => {
    if (!currentBoundaries || !currentProcessKey) {
      return;
    }
    const timestamp = now ?? performance.now();
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    const perimeter = this.perimeterMap.get(currentProcessKey) || MIN_PERIMETER;
    const speedFactor = Math.log(perimeter / MIN_PERIMETER + 1);
    const dynamicSpeed = BASE_SPEED * speedFactor;
    traveledHead -= dynamicSpeed * dt;
    this.drawBoundary(currentBoundaries, currentProcessKey);
    const { viewState, isKeyPressed} = this.deps;
    if (isAnimation) {
      requestAnimationFrame(this.animate);
    } else if (!isKeyPressed.value) {
      const boundaryCanvas: HTMLCanvasElement = document.querySelector(`[data-three-column-process-key="${currentProcessKey}"]`);
      if (!boundaryCanvas) return;
      const boundaryCtx = boundaryCanvas.getContext('2d');
      if (!boundaryCtx) return;
      clearWholeProcess(boundaryCtx, viewState, currentProcessKey);
    }
  };
  public stopAnimate = () =>{
    isAnimation = false;
  };
  public enableAnimate = () =>{
    isAnimation = true;
  };
  private buildOuterContour = (rects) => {
    if (rects.length === 0) return [];
    const rows = [...rects].sort((a, b) => a.leftTop[1] - b.leftTop[1]);
    const pts = [];

    let x = rows[0].leftTop[0];
    let y = rows[0].leftTop[1];
    pts.push({ x, y });

    x = rows[0].rightTop[0];
    pts.push({ x, y });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      y = row.leftBottom[1];
      pts.push({ x, y });
      if (i < rows.length - 1) {
        const nextRight = rows[i + 1].rightTop[0];
        if (Math.abs(nextRight - x) > 1e-6) {
          x = nextRight;
          pts.push({ x, y });
        }
      }
    }

    x = rows[rows.length - 1].leftBottom[0];
    pts.push({ x, y });

    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      y = row.leftTop[1];
      pts.push({ x, y });
      if (i > 0) {
        const prevLeft = rows[i - 1].leftTop[0];
        if (Math.abs(prevLeft - x) > 1e-6) {
          x = prevLeft;
          pts.push({ x, y });
        }
      }
    }
    return pts;
  };
  private getLineSegments = (traveledHead) => {
    const total = totalPathLength;
    const headD = ((traveledHead % total) + total) % total;
    const tailD = (((traveledHead - LINE_LENGTH) % total) + total) % total;
    const segments = [];
    if (Math.abs(tailD - headD) < 1e-9) {
      return segments; // 长度为0
    }
    if (tailD <= headD) {
      this.addSegmentsFromTo(tailD, headD, segments);
    } else {
      // 跨圈
      this.addSegmentsFromTo(tailD, total, segments);
      this.addSegmentsFromTo(0, headD, segments);
    }
    return segments;
  };

  private addSegmentsFromTo = (distStart, distEnd, outSegments) => {
    if (distStart >= distEnd - 1e-9) {
      return;
    }
    // 定位起止边
    let startEdgeIndex = -1,
      endEdgeIndex = -1;
    let localStart = 0,
      localEnd = 0;
    for (let i = 0; i < edges.length; i++) {
      const s = edgeStartDistances[i];
      const e = s + edges[i].length;
      if (startEdgeIndex === -1 && distStart <= e + 1e-9) {
        startEdgeIndex = i;
        localStart = Math.max(0, distStart - s);
      }
      if (distEnd <= e + 1e-9) {
        endEdgeIndex = i;
        localEnd = Math.min(edges[i].length, distEnd - s);
        break;
      }
    }
    if (startEdgeIndex === -1 || endEdgeIndex === -1) {
      return;
    }
    // 遍历从 startEdgeIndex 到 endEdgeIndex
    for (let i = startEdgeIndex; i <= endEdgeIndex; i++) {
      const edge = edges[i];
      let segLocalStart, segLocalEnd;
      if (i === startEdgeIndex && i === endEdgeIndex) {
        // 同一条边
        segLocalStart = localStart;
        segLocalEnd = localEnd;
      } else if (i === startEdgeIndex) {
        // 起始边：从 localStart 到边尾
        segLocalStart = localStart;
        segLocalEnd = edge.length;
      } else if (i === endEdgeIndex) {
        // 结束边：从边头到 localEnd
        segLocalStart = 0;
        segLocalEnd = localEnd;
      } else {
        // 中间完整边
        segLocalStart = 0;
        segLocalEnd = edge.length;
      }
      if (segLocalEnd - segLocalStart > 1e-9) {
        const t1 = segLocalStart / edge.length;
        const t2 = segLocalEnd / edge.length;
        outSegments.push({
          x1: edge.start.x + t1 * edge.dx,
          y1: edge.start.y + t1 * edge.dy,
          x2: edge.start.x + t2 * edge.dx,
          y2: edge.start.y + t2 * edge.dy,
        });
      }
    }
  };
}