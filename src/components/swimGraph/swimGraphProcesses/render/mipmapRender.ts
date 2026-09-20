/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { getPositionByTime, getWidthByDuration } from '../processInfo';
import { getNoZoomX } from './utils';

class ImplicitSegmentForest {
  values: any[];
  aggOp: (a: any, b: any) => any;

  constructor(aggOp: (a: any, b: any) => any) {
    this.values = [];
    this.aggOp = aggOp;
  }

  _lsp(x: number): number { return x & -x; }

  _msp(x: number): number {
    if (x <= 0) return 0;
    let bit = 1;
    while (bit * 2 <= x) bit *= 2;
    return bit;
  }

  _largestPrefixInsideSkip(min: number, max: number): number {
    return this._lsp(min | this._msp(max - min));
  }

  _aggNodeIndex(i: number, offset: number): number {
    return i + (offset >> 1) - 1;
  }

  push(v: any): void {
    this.values.push(v);
    const len = this.values.length;

    let notLen = (~len) >>> 0;
    let trailingZeros = 0;
    while ((notLen & 1) === 0) { notLen >>>= 1; trailingZeros++; }
    const levelsToIndex = trailingZeros - 1;

    let cur = len - 1;
    for (let level = 0; level < levelsToIndex; level++) {
      const parent = cur - (1 << level);
      this.values[parent] = this.aggOp(this.values[parent], this.values[cur]);
      cur = parent;
    }
    this.values.push(this.values[len - (1 << levelsToIndex)]);
  }

  query(start: number, end: number): any {
    if (start >= end || this.values.length === 0) return null;
    const inStart = start * 2;
    const inEnd = end * 2;

    const firstSkip = this._largestPrefixInsideSkip(inStart, inEnd);
    let result = this.values[this._aggNodeIndex(inStart, firstSkip)];

    for (let i = inStart + firstSkip; i < inEnd;) {
      const skip = this._largestPrefixInsideSkip(i, inEnd);
      result = this.aggOp(result, this.values[this._aggNodeIndex(i, skip)]);
      i += skip;
    }
    return result;
  }

  get size(): number { return Math.floor(this.values.length / 2); }
}

class GallopingSearch {
  static LINEAR_THRESHOLD = 16;
  data: number[];
  n: number;

  constructor(data: number[]) {
    this.data = data;
    this.n = data.length;
  }

  _lowerBound(lo: number, hi: number, key: number): number {
    while (hi - lo > GallopingSearch.LINEAR_THRESHOLD) {
      const mid = lo + ((hi - lo) >> 1);
      if (this.data[mid] < key) lo = mid + 1;
      else hi = mid;
    }
    while (lo < hi && this.data[lo] < key) lo++;
    return lo;
  }

  _gallopForward(pos: number, key: number): number {
    if (pos >= this.n || this.data[pos] >= key) return pos;

    let step = GallopingSearch.LINEAR_THRESHOLD;
    let prev = pos;
    while (pos + step < this.n && this.data[pos + step] < key) {
      prev = pos + step;
      step *= 2;
    }
    const lo = prev + 1;
    const hi = Math.min(pos + step + 1, this.n);
    return this._lowerBound(lo, hi, key);
  }

  batchedLowerBound(keys: number[]): number[] {
    const results = new Array(keys.length);
    if (this.n === 0) { results.fill(0); return results; }

    let pos = this._lowerBound(0, this.n, keys[0]);
    results[0] = pos;

    for (let i = 1; i < keys.length; i++) {
      pos = this._gallopForward(pos, keys[i]);
      results[i] = pos;
    }
    return results;
  }
}

export interface SliceBucket {
  line: number;
  event: any;
  count: number;
  bucketStart: number;
  bucketEnd: number;
  aggStart: number;
  aggEnd: number;
  isZeroDuration: boolean;
}

interface LineLayer {
  durForest: ImplicitSegmentForest;
  durTimestamps: number[];
  durEvents: any[];
  zeroForest: ImplicitSegmentForest | null;
  zeroTimestamps: number[];
  zeroEvents: any[];
}

function queryLayerForest(
  forest: ImplicitSegmentForest,
  timestamps: number[],
  events: any[],
  boundaries: number[],
  windowStart: number,
  isZeroDuration: boolean
): SliceBucket[] {
  const results: SliceBucket[] = [];
  if (events.length === 0) return results;

  const searcher = new GallopingSearch(timestamps);
  const positions = searcher.batchedLowerBound(boundaries);

  let startIdx = positions[0];
  if (startIdx > 0) {
    const prev = events[startIdx - 1];
    const prevEnd = prev.renderEndTime || prev.endTime;
    if (prevEnd > windowStart) startIdx--;
  }

  for (let i = 1; i < positions.length; i++) {
    const endIdx = positions[i];
    if (startIdx === endIdx) { startIdx = endIdx; continue; }

    const agg = forest.query(startIdx, endIdx);
    if (!agg) { startIdx = endIdx; continue; }

    const rep = events[agg.idx];
    results.push({
      line: -1,
      event: rep,
      count: agg.count,
      bucketStart: boundaries[i - 1],
      bucketEnd: boundaries[i],
      aggStart: agg.minStart,
      aggEnd: agg.maxEnd,
      isZeroDuration,
    });
    startIdx = endIdx;
  }
  return results;
}

export class SliceMipmap {
  byLine: Array<LineLayer | null>;

  constructor(events: any[]) {
    if (!events || events.length === 0) {
      this.byLine = [];
      return;
    }

    const maxLine = events.reduce((m: number, e: any) => Math.max(m, e.line || 0), 0);
    this.byLine = [];

    for (let d = 0; d <= maxLine; d++) {
      const lineEvents = events.filter((e: any) => (e.line || 0) === d).sort((a: any, b: any) => a.startTime - b.startTime);
      if (lineEvents.length === 0) {
        this.byLine.push(null);
        continue;
      }

      const durEvents = lineEvents.filter((e: any) => {
        const renderDur = (e.renderEndTime || e.endTime) - (e.renderStartTime || e.startTime);
        return renderDur > 0;
      });
      const zeroEvents = lineEvents.filter((e: any) => {
        const renderDur = (e.renderEndTime || e.endTime) - (e.renderStartTime || e.startTime);
        return renderDur === 0;
      });

      const durForest = new ImplicitSegmentForest((a: any, b: any) => {
        const keepA = a.maxDur >= b.maxDur;
        return {
          maxDur: keepA ? a.maxDur : b.maxDur,
          count: a.count + b.count,
          idx: keepA ? a.idx : b.idx,
          minStart: Math.min(a.minStart, b.minStart),
          maxEnd: Math.max(a.maxEnd, b.maxEnd),
        };
      });
      const durTimestamps: number[] = [];
      durEvents.forEach((s: any, i: number) => {
        const renderDur = (s.renderEndTime || s.endTime) - (s.renderStartTime || s.startTime);
        const start = s.renderStartTime || s.startTime;
        const end = s.renderEndTime || s.endTime;
        durForest.push({ maxDur: renderDur, count: 1, idx: i, minStart: start, maxEnd: end });
        durTimestamps.push(start);
      });

      let zeroForest: ImplicitSegmentForest | null = null;
      const zeroTimestamps: number[] = [];
      if (zeroEvents.length > 0) {
        zeroForest = new ImplicitSegmentForest((a: any, b: any) => ({
          maxDur: 0,
          count: a.count + b.count,
          idx: a.idx,
          minStart: Math.min(a.minStart, b.minStart),
          maxEnd: Math.max(a.maxEnd, b.maxEnd),
        }));
        zeroEvents.forEach((s: any, i: number) => {
          const start = s.renderStartTime || s.startTime;
          const end = s.renderEndTime || s.endTime;
          zeroForest!.push({ maxDur: 0, count: 1, idx: i, minStart: start, maxEnd: end });
          zeroTimestamps.push(start);
        });
      }

      this.byLine.push({ durForest, durTimestamps, durEvents, zeroForest, zeroTimestamps, zeroEvents });
    }
  }

  query(windowStart: number, windowEnd: number, resolution: number): SliceBucket[] {
    const results: SliceBucket[] = [];

    const boundaries: number[] = [];
    for (let t = windowStart; t < windowEnd; t += resolution) boundaries.push(t);
    boundaries.push(windowEnd);

    for (let lineIdx = 0; lineIdx < this.byLine.length; lineIdx++) {
      const layer = this.byLine[lineIdx];
      if (!layer) continue;

      const durBuckets = queryLayerForest(layer.durForest, layer.durTimestamps, layer.durEvents, boundaries, windowStart, false);
      for (const b of durBuckets) b.line = lineIdx;
      results.push(...durBuckets);

      if (layer.zeroForest) {
        const zeroBuckets = queryLayerForest(layer.zeroForest, layer.zeroTimestamps, layer.zeroEvents, boundaries, windowStart, true);
        for (const b of zeroBuckets) b.line = lineIdx;
        results.push(...zeroBuckets);
      }
    }
    return results;
  }
}

export interface CounterBucket {
  bucketStart: number;
  bucketEnd: number;
  min: number;
  max: number;
  lastTs: number;
  lastValue: number;
}

export class CounterMipmap {
  forest: ImplicitSegmentForest | null;
  timestamps: number[];
  values: number[];

  constructor(events: any[], argKey: string) {
    if (!events || events.length === 0) {
      this.forest = null;
      this.timestamps = [];
      this.values = [];
      return;
    }

    const sorted = [...events].sort((a: any, b: any) => a.ts - b.ts);

    this.forest = new ImplicitSegmentForest((a: any, b: any) => ({
      min: Math.min(a.min, b.min),
      max: Math.max(a.max, b.max),
    }));
    this.timestamps = [];
    this.values = [];

    sorted.forEach((c: any) => {
      const value = c.args ? c.args[argKey] : 0;
      this.forest!.push({ min: value, max: value });
      this.timestamps.push(c.ts);
      this.values.push(value);
    });
  }

  query(windowStart: number, windowEnd: number, resolution: number): CounterBucket[] {
    if (!this.forest) return [];
    const results: CounterBucket[] = [];

    const boundaries: number[] = [];
    for (let t = windowStart; t < windowEnd; t += resolution) boundaries.push(t);
    boundaries.push(windowEnd);

    const searcher = new GallopingSearch(this.timestamps);
    const positions = searcher.batchedLowerBound(boundaries);

    let startIdx = positions[0];
    if (startIdx > 0 && this.timestamps[startIdx] !== windowStart) startIdx--;

    for (let i = 1; i < positions.length; i++) {
      const endIdx = positions[i];
      if (startIdx === endIdx) { startIdx = endIdx; continue; }

      const agg = this.forest.query(startIdx, endIdx);
      if (!agg) { startIdx = endIdx; continue; }

      results.push({
        bucketStart: boundaries[i - 1],
        bucketEnd: boundaries[i],
        min: agg.min,
        max: agg.max,
        lastTs: this.timestamps[endIdx - 1],
        lastValue: this.values[endIdx - 1],
      });
      startIdx = endIdx;
    }
    return results;
  }
}

export const MIPMAP_PIXEL_THRESHOLD = 5;

export function calcResolution(startTime: number, endTime: number, canvasWidth: number, pixelThreshold: number = MIPMAP_PIXEL_THRESHOLD): number {
  const timePerPixel = (endTime - startTime) / canvasWidth;
  return timePerPixel * pixelThreshold;
}

export function drawCounterMipmapBuckets(
  ctx: CanvasRenderingContext2D,
  buckets: CounterBucket[],
  thread: any,
  isPinned: boolean,
  viewState: any,
  layout: any
): void {
  const baseY = isPinned
    ? (thread._pinnedCounterBaseY || thread._counterBaseY || 0)
    : (thread._counterBaseY || 0);

  if (baseY === 0) return;

  const { maxCount, argKey } = thread;
  const counterHeight = layout.counterHeight;
  const maxHeight = counterHeight * 2 / 3;
  const segment = 10;
  const countPerHeight = maxHeight / segment;
  const segmentStep = maxCount ? maxCount / segment : 0;
  const { processLabelWidth } = layout;
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(1, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = '#4aaad6ff';
  ctx.lineWidth = 1;
  ctx.beginPath();

  let lastY = baseY;
  ctx.moveTo(getNoZoomX(0, viewState), lastY);

  for (const bucket of buckets) {
    const startX = getPositionByTime(bucket.bucketStart, viewState, layout) - processLabelWidth;
    const endX = getPositionByTime(bucket.bucketEnd, viewState, layout) - processLabelWidth;

    const lastSeg = maxCount ? Math.floor(bucket.lastValue / segmentStep) : 0;
    const targetY = baseY - countPerHeight * lastSeg;

    ctx.lineTo(getNoZoomX(startX, viewState), lastY);
    ctx.lineTo(getNoZoomX(startX, viewState), targetY);
    ctx.lineTo(getNoZoomX(endX, viewState), targetY);

    lastY = targetY;
  }

  ctx.lineTo(getNoZoomX(viewState.canvasCssWidth, viewState), lastY);
  ctx.stroke();
  ctx.closePath();
  ctx.restore();
}