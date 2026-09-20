/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
// 工具函数和共享方法
import { getEventColorByMode } from './swimGraphProcesses/processInfo';
import { swimDataManager } from './swimData';
import { layoutFakeCoreEvent } from '@/utils';
import { getReader } from '@pypto/data-compress/reader';

export const COLOR_CFG = {
  dark: {
    backGround: '#1F1F1F',
    eventFont: '#ffffff',
    eventRectNoColor: 'rgba(77, 77, 77, 1)',
    eventFontNoColor: 'rgba(153, 153, 153, 1)',
    eventRectNoColorHighlight: 'rgba(102, 102, 102, 1)',
    eventFontHighLight: '#000000',
    eventHighLightStroke: '#ffffff',
    depSelectStroke: '#317AF7',
    lightlyCompareBkgColor: 'rgba(255, 255, 255, 0.05)',
    splitLineColor: 'rgba(255, 255, 255, 0.1)',
    wrapLineColor: '#B3B3B3',
    wrapLineHover: '#4D4D4D',
    wrapTextColorDefault: 'rgba(179, 179, 179, 1)',
    wrapBgColorDefault: 'rgba(77, 77, 77, 1)',
    wrapBorderBgColorDefault: 'rgba(77, 77, 77, 0.1)',
    wrapTextColorHover: 'rgba(0, 0, 0, 1)',
    wrapBgColorHover: 'rgba(102, 102, 102, 1)',
    wrapBorderBgColorHover: 'rgba(102, 102, 102, 0.1)',
    wrapBoxBgColor: 'rgba(102, 102, 102, 0.5)'
  },
  light: {
    backGround: '#ffffff',
    eventFont: '#000000',
    eventRectNoColor: 'rgb(218, 218, 218)',
    eventFontNoColor: '#999999',
    eventRectNoColorHighlight: 'rgba(119, 119, 119, 1)',
    eventFontHighLight: '#ffffff',
    eventHighLightStroke: '#191919',
    depSelectStroke: '#0A59F7',
    lightlyCompareBkgColor: 'rgba(0, 0, 0, 0.05)',
    splitLineColor: 'rgba(98, 98, 98, 0.2)',
    wrapLineColor: '#393939',
    wrapLineHover: '#A1A1A1',
    wrapTextColorDefault: 'rgba(25, 25, 25, 1)',
    wrapBgColorDefault: 'rgba(174, 174, 174, 1)',
    wrapBorderBgColorDefault: 'rgba(147, 147, 147, 0.05)',
    wrapTextColorHover: 'rgba(255, 255, 255, 1)',
    wrapBgColorHover: 'rgba(119, 119, 119, 1)',
    wrapBorderBgColorHover: 'rgba(119, 119, 119, 0.05)',
    wrapBoxBgColor: 'rgba(119, 119, 119, 0.25)',
  }
};

export const DEP_MODE = {
  all: 'all',
  pre: 'pre',
  next: 'next',
};

// schedule和core有总分关系的task name对，这里的key和value都有可能在实际文件中不存在
export const AICPU_SCHED_TO_CORE_TASK_RELATION = {
  DEV_TASK_RCV: 'DEV_TASK_RCV_MODEL',
  DEV_TASK_SEND_FIRST_CALLOP_TASK: 'DEV_TASK_WAIT_RCV_FIRST_CALLOP_TASK',
  DEV_TASK_SCHED_EXEC: "DEV_TASK_ALL_CALLOP_TASK_EXEC",
  DEV_TASK_SYNC_CORE_STOP: 'DEV_TASK_WAIT_SYNC_STOP_NOTIFY',
  DEV_TASK_SEND_FIRST_LEAF_TASK: 'DEV_TASK_WAIT_RCV_FIRST_LEAF_TASK',
} as const;

export const AICPU_CORE_TO_SCHED_TASK_RELATION = Object.fromEntries(
  Object.entries(AICPU_SCHED_TO_CORE_TASK_RELATION).map(([k, v]) => [v, k])
) as { [K in keyof typeof AICPU_SCHED_TO_CORE_TASK_RELATION as typeof AICPU_SCHED_TO_CORE_TASK_RELATION[K]]: K };

// 点击或者hover的吸附范围左右5px
export const SNAP_THRESHOLD = 5;
// 需要吸附节点的最大width
export const NARROW_WIDTH_THRESHOLD = 2;

export let ctxs: any = {};
export const getDevicePixelRatio = () => { return window.devicePixelRatio || 1; };
export let devicePixelRatio = getDevicePixelRatio();
export let eventTextSize = 12 * devicePixelRatio;
export let meaureTextSize = 12 * devicePixelRatio;
// 测距的最小距离，若小于这个距离，不显示左右箭头
export const nodeSpaceMin = 58;

export const FAKE_CORE_KEYWORD = 'Fake Core';
export const threadCache = new Map<string, { height: number; startY: number }>();

export const getEffectiveThreadName = (event: any): string => {
  return event.originalThreadName || event.threadName;
};

export const getEffectiveThreadNameForThread = (thread: any): string => {
  if (thread._originalThreadName) return thread._originalThreadName;
  return thread.threadName;
};

export const getDisplayThreadName = (thread: any): string => {
  if (thread._mergedFromThreadName) return thread._mergedFromThreadName;
  return thread.threadName;
};

// mix模式下wrap Label信息
const wrapLabelCache = new Map();

export const setDevicePixelRatio = (ratio: number) => {
  devicePixelRatio = ratio;
  eventTextSize = 12 * devicePixelRatio;
  meaureTextSize = 9 * devicePixelRatio;
};

export const getThreadHeight = (processKey: string, threadKey: any, lane2line: Map<string, number>, layout: any, isCounter: boolean = false): number => {
  const cacheKey = `${processKey}@${threadKey}@${isCounter}`;
  
  if (threadCache.has(cacheKey)) {
    return threadCache.get(cacheKey)!.height;
  }
  
  let height = 0;
  if (isCounter) {
    height = layout.counterHeight;
  } else {
    const lineCount = lane2line.get(`${processKey}@${threadKey}`) || 1;
    height = layout.threadHeight * lineCount;
  }
  
  if (!threadCache.has(cacheKey)) {
    threadCache.set(cacheKey, { height, startY: 0 });
  } else {
    threadCache.get(cacheKey)!.height = height;
  }
  
  return height;
};

// 普通event threadKey是tid, counter的是threadName
export const getVisibleYRange = (canvasRef: HTMLElement, containerRef: HTMLElement): { top: number; bottom: number } => {
  if (!canvasRef || !containerRef) {
    return { top: 0, bottom: Infinity };
  }
  const canvasRect = canvasRef.getBoundingClientRect();
  const containerRect = containerRef.getBoundingClientRect();
  const top = Math.max(0, containerRect.top - canvasRect.top);
  const bottom = containerRect.bottom - canvasRect.top;
  return { top, bottom };
};

export const isThreadInViewport = (threadStartY: number, threadHeight: number, viewportTop: number, viewportBottom: number): boolean => {
  return threadStartY + threadHeight > viewportTop && threadStartY < viewportBottom;
};

export const getThreadStartY = (process: any, processKey: any, threadKey: string, lane2line: Map<string, number>, layout: any): number => {
  const cacheKey = `${processKey}@${threadKey}@startY`;
  
  if (threadCache.has(cacheKey)) {
    return threadCache.get(cacheKey)!.startY;
  }
  
  const processInfo = swimDataManager.getProcess(processKey);
  
  let threadY = 0;
  for (const [_, thread] of processInfo.threads.entries()) {
    const key = thread.isCounter ? 'threadName' : 'tid';
    if (thread[key] === threadKey) {
      break;
    }
    threadY += getThreadHeight(processKey, thread[key], lane2line, layout, thread.isCounter);
  }
  
  threadCache.set(cacheKey, { height: 0, startY: threadY });
  return threadY;
};

export const formatTimeWithUnit = (timeInNanoseconds) => {
  const nanoseconds = timeInNanoseconds;
  const microseconds = nanoseconds / 1000;
  const milliseconds = microseconds / 1000;
  const seconds = milliseconds / 1000;
  const minutes = seconds / 60;

  if (minutes >= 1) {
    return { value: parseFloat(minutes.toFixed(2)), unit: 'min' };
  } else if (seconds >= 1) {
    return { value: parseFloat(seconds.toFixed(2)), unit: 's' };
  } else if (milliseconds >= 1) {
    return { value: parseFloat(milliseconds.toFixed(2)), unit: 'ms' };
  } else if (microseconds >= 1) {
    return { value: parseFloat(microseconds.toFixed(3)), unit: 'μs' };
  } else {
    return { value: nanoseconds.toFixed(0), unit: 'ns' };
  }
};
// 时间轴统一单位
export const TimelineWithUnit = (timelineRange, timeInNanoseconds) => {
  const nanoseconds = timelineRange;
  const microseconds = nanoseconds / 1000;
  const milliseconds = microseconds / 1000;
  const seconds = milliseconds / 1000;
  const minutes = seconds / 60;
  let timelineValue = 0;

  if (minutes >= 1) {
    timelineValue = timeInNanoseconds / 60000000000;
    return { value: timelineValue.toFixed(1), unit: 'min' };
  } else if (seconds >= 1) {
    timelineValue = timeInNanoseconds / 1000000000;
    return { value: timelineValue.toFixed(1), unit: 's' };
  } else if (milliseconds >= 1) {
    timelineValue = timeInNanoseconds / 1000000;
    return { value: timelineValue.toFixed(1), unit: 'ms' };
  } else if (microseconds >= 1) {
    timelineValue = timeInNanoseconds / 1000;
    return { value: timelineValue.toFixed(0), unit: 'μs' };
  } else {
    return { value: timeInNanoseconds.toFixed(0), unit: 'ns' };
  }
};
export const calculateGridInterval = (timePerPixel: number): number => {
  const minPixelInterval = 100;
  const minTimeInterval = timePerPixel * minPixelInterval;

  const smallIntervals = [
    0.001, 0.002, 0.005,
    0.1, 0.2, 0.5,
  ];

  // 微秒到其他时间单位的转换因子
  const nanosecond = 1;
  const microsecond = 1000 * nanosecond;
  const millisecond = 1000 * microsecond;
  const second = 1000 * millisecond;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  // 定义基础时间单位（微秒）
  const intervals = [
    1 * nanosecond, 2 * nanosecond, 5 * nanosecond,
    10 * nanosecond, 20 * nanosecond, 50 * nanosecond,
    100 * nanosecond, 200 * nanosecond, 500 * nanosecond,
    1 * microsecond, 2 * microsecond, 5 * microsecond,       // 1, 2, 5 μs
    10 * microsecond, 20 * microsecond, 50 * microsecond,    // 10, 20, 50 μs
    100 * microsecond, 200 * microsecond, 500 * microsecond, // 100, 200, 500 μs
    1 * millisecond, 2 * millisecond, 5 * millisecond,       // 1, 2, 5 ms
    10 * millisecond, 20 * millisecond, 50 * millisecond,    // 10, 20, 50 ms
    100 * millisecond, 200 * millisecond, 500 * millisecond, // 100, 200, 500 ms
    1 * second, 2 * second, 5 * second,                      // 1, 2, 5 s
    10 * second, 20 * second, 30 * second,                   // 10, 20, 30 s
    1 * minute, 2 * minute, 5 * minute,                      // 1, 2, 5 min
    10 * minute, 15 * minute, 30 * minute,                   // 10, 15, 30 min
    1 * hour, 2 * hour, 3 * hour, 6 * hour,                  // 1, 2, 3, 6 h
    12 * hour,                                               // 12 h
    1 * day                                                  // 1 d
  ];

  const finalIntervals = [...smallIntervals, ...intervals];

  // 查找第一个 >= minTimeInterval 的间隔
  for (const interval of finalIntervals) {
    if (interval >= minTimeInterval) {
      return interval;
    }
  }

  // 如果还是不够，就按指数增长（比如每次 ×10）
  let fallback = finalIntervals[finalIntervals.length - 1];
  while (fallback < minTimeInterval) {
    fallback *= 10;
  }
  return fallback;
};

export const drawArrow = (ctx: any, position: any, startColor: string, endColor: string, scale=1, translate=0) => {
  let { startX, startY, endX, endY } = position;
  startX *= scale;
  endX *= scale;
  let cp1x = startX;
  let cp1y = startY;
  let cp2x = endX;
  let cp2y = endY;
  const endXLine = endX - 10;

  // 获取canvas的CSS尺寸用于计算
  const canvasCSSWidth = getCanvasCSSWidth(ctx.canvas);
  const canvasCSSHeight = getCanvasCSSHeight(ctx.canvas);

  if (Math.abs(startX - endX) > 0.01 * canvasCSSWidth)
  {
    cp1x = startX + 0.03 * canvasCSSWidth;
    cp2x = endX - 0.03 * canvasCSSWidth;
  }
  
  if (Math.abs(startY - endY) > 0.01 * canvasCSSHeight)
  {
    cp1y = startY - 0.01 * canvasCSSHeight;
    cp2y = endY + 0.01 * canvasCSSHeight;
  }
  
  if (Math.abs(startX - endXLine) < 50) {
    cp2x = endX - 50;
  } else {
    cp2x = endX - 0.03 * canvasCSSWidth;
  }

  if (cp2x < cp1x && cp1y === cp2y) {
    cp2x = cp1x;
  }

  const gradient = ctx.createLinearGradient(startX, startY, endXLine, endY);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, translate * devicePixelRatio, 0);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2 * devicePixelRatio;

  const path = new Path2D();
  path.moveTo(startX, startY);
  path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endXLine, endY);
  path.lineTo(endX, endY);

  ctx.stroke(path);

  const arrowLength = 10;
  const arrowAngle = Math.PI / 6;
  const arrowTipX = endX;
  const arrowTipY = endY;
  const arrowVertex1X = arrowTipX - arrowLength * Math.cos(-arrowAngle);
  const arrowVertex1Y = arrowTipY - arrowLength * Math.sin(-arrowAngle);
  const arrowVertex2X = arrowTipX - arrowLength * Math.cos(arrowAngle);
  const arrowVertex2Y = arrowTipY - arrowLength * Math.sin(arrowAngle);

  ctx.strokeStyle = endColor;
  ctx.beginPath();
  ctx.moveTo(arrowTipX, arrowTipY);
  ctx.lineTo(arrowVertex1X, arrowVertex1Y);
  ctx.lineTo(arrowVertex2X, arrowVertex2Y);
  ctx.closePath();

  ctx.fillStyle = endColor;
  ctx.fill();
  ctx.restore();

  return path;
};

export const drawMeasureArrow = (ctx, startx, endx, distance) => {
  const areaMidden = 20;
  const baypx = 6;
  ctx.beginPath();
  ctx.moveTo(startx, areaMidden);
  ctx.lineTo(startx + distance - baypx, areaMidden);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endx, areaMidden);
  ctx.lineTo(endx - distance + baypx, areaMidden);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startx, areaMidden);
  ctx.lineTo(startx + baypx, areaMidden - baypx);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startx, areaMidden);
  ctx.lineTo(startx + baypx, areaMidden + baypx);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endx, areaMidden);
  ctx.lineTo(endx - baypx, areaMidden - baypx);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endx, areaMidden);
  ctx.lineTo(endx - baypx, areaMidden + baypx);
  ctx.stroke();
};

// 高DPI Canvas初始化辅助函数
export const setupHighDPICanvas = (canvas: any, width: number, height: number) => {
  const currentDevicePixelRatio = getDevicePixelRatio();
  
  // 设置CSS尺寸
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  // 设置实际像素尺寸
  canvas.width = width * currentDevicePixelRatio;
  canvas.height = height * currentDevicePixelRatio;
  
  // 获取上下文并设置缩放
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(currentDevicePixelRatio, currentDevicePixelRatio);
  }
  
  return ctx;
};

export const getFontStyle = (fontSize: number) => {
  // fontSize 后面的字体按清晰程度排优先级，如果前面的字体找不到，会用后面的字体
  return `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
};

// 获取canvas的CSS宽度，兼容高DPI和标准DPI
export const getCanvasCSSWidth = (canvas: any) => {
  // 优先使用style.width，如果没有则使用offsetWidth
  return parseFloat(canvas.style.width) || canvas.offsetWidth;
};

// 获取canvas的CSS高度，兼容高DPI和标准DPI
export const getCanvasCSSHeight = (canvas: any) => {
  // 优先使用style.height，如果没有则使用offsetHeight
  return parseFloat(canvas.style.height) || canvas.offsetHeight;
};

export const updateProcessSize = (process: any, processKey: string, containerRect: any, layout: any, lane2line: any, viewState: any, isMixMode: boolean = false) => {
  ctxs[processKey] = {
    eventCtx: document.querySelector(`[data-process-key="${processKey}"]`),
    uiCtx: document.querySelector(`[data-ui-process-key="${processKey}"]`),
    dependencyCtx: document.querySelector(`[data-dep-process-key="${processKey}"]`),
    hoverCtx: document.querySelector(`[data-hover-process-key="${processKey}"]`),
    backgroundCtx: document.querySelector(`[data-background-process-key="${processKey}"]`),
    lineCanvasCtx:  document.querySelector(`[data-line-process-key="${processKey}"]`),
    selectionCanvasCtx:  document.querySelector(`[data-selection-process-key="${processKey}"]`),
    threeColumnCanvasCtx:  document.querySelector(`[data-three-column-process-key="${processKey}"]`),
    wrapContainerCtx: document.querySelector(`[data-wrap-container-process-key="${processKey}"]`),
    mixDependencyCtx: document.querySelector(`[data-mix-dep-process-key="${processKey}"]`),
    hoverWrapContainerCtx: document.querySelector(`[data-hover-wrap-container-process-key="${processKey}"]`),
    mixHoverCtx: document.querySelector(`[data-mix-hover-process-key="${processKey}"]`),
  };
  const processCtxs = ctxs[processKey];
  const availableWidth = containerRect.width;
  const canvasWidth = availableWidth - layout.processLabelWidth - layout.marginRight;
  
  let canvasHeight = 0;
  if (isMixMode && swimDataManager.hasMixConfig()) {
    canvasHeight = swimDataManager.getTotalLaneHeight();
  } else {
    const processInfo = swimDataManager.getProcess(processKey);
    for (const [threadKey, thread] of processInfo.threads.entries()) {
      canvasHeight += getThreadHeight(processKey, thread.tid, lane2line, layout, thread.isCounter);
    }
  }
  
  for (const key of Object.keys(processCtxs)) {
    if (processCtxs[key]) {
      processCtxs[key] = setupHighDPICanvas(processCtxs[key], canvasWidth, canvasHeight);
    }
  }
  const currentDevicePixelRatio = getDevicePixelRatio();
  viewState.canvasCssWidth = canvasWidth;
  viewState.canvasWidth = processCtxs.eventCtx.canvas.width;
  
  if (!viewState.clearInfo[processKey]) {
    viewState.clearInfo[processKey] = {};
  }
  const clearInfo = viewState.clearInfo[processKey];
  clearInfo.clearWidth = Math.max(viewState.canvasCssWidth, viewState.canvasWidth);
  clearInfo.clearHeight = Math.max(canvasHeight, canvasHeight * currentDevicePixelRatio);
};

export const clearWholeProcess = (ctx: any, viewState: any, processKey: string) => {
  const clearInfo = viewState.clearInfo[processKey];
  if (!clearInfo) {
    return;
  }
  const { clearWidth, clearHeight } = clearInfo;
  ctx.clearRect(0, 0, clearWidth, clearHeight);
};

export const findSchedTaskByNo = (taskNo, roundNo, processKey: string) => {
  const eventPattern = `DEV_TASK_RCV_${roundNo}(${taskNo})`;
  const scheduleList = [];
  const processInfo = swimDataManager.getProcess(processKey);
  processInfo.threads.forEach((thread, key) => {
    if (!thread?.eventIds || !thread?.threadName) return;
    const threadName = getEffectiveThreadNameForThread(thread);
    if (!threadName.includes('AICPU-SCHED')) {
      return;
    }
    const events = swimDataManager.getEventsByIds(thread.eventIds);
    const hasMatchingEvent = events.some(event => event?.name === eventPattern);
    if (hasMatchingEvent) {
      scheduleList.push(threadName);
    }
  });
  return scheduleList;
};
// 调度情况图使用接口
const collectMergedCoreEventsFromThread = (thread, mergedCoreEvents) => {
  const threadName = thread.threadName;
  if (!(threadName.includes('AIC_') || threadName.includes('AIV_') || threadName.includes('AIC-') || threadName.includes('AIV-'))) {
    return;
  }
  const schedCorePattern = /^(SCHED\d+-(AIC|AIV)-\d+|(AIC|AIV)-\d+-SCHED\d+)$/;
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event?.originalThreadName) continue;
    const origName = event.originalThreadName;
    if (!schedCorePattern.test(origName)) continue;
    if (!mergedCoreEvents.has(origName)) {
      mergedCoreEvents.set(origName, []);
    }
    mergedCoreEvents.get(origName).push(eventId);
  }
};

const collectSchedExecEvents = (threadMap) => {
  const schedExecEvents = [];
  for (const [key, value] of threadMap) {
    if (key.includes('AICPU-SCHED')) {
      schedExecEvents.push(...value.filter(e => e && e.name && e.name.includes('DEV_TASK_SCHED_EXEC')));
    }
  }
  return schedExecEvents;
};

const processMergedCoreEvents = (mergedCoreEvents, threadMap, fallbackEvent, schedExecEvents, computeEventArr) => {
  for (const [origThreadName, eventIds] of mergedCoreEvents.entries()) {
    const eventArr = computeEventArr(eventIds, threadMap);
    const fallbackEvents = findFallbackKernelEvents(eventIds, fallbackEvent, schedExecEvents);
    setCoreWithFallback(threadMap, origThreadName, eventArr, fallbackEvents);
  }
};

export const findSchedGraphMap = (threads, roundNo, taskNo, clickedEvent) => {
  const schedNo = clickedEvent.threadName.split('-').pop();
  const schedStr = `AICPU-SCHED-${schedNo}`;
  if (!taskNo) {
    taskNo = getTaskNo(schedStr, clickedEvent.id, threads);
  }
  const threadMap = new Map();
  const mergedCoreEvents = new Map<string, string[]>();

  for (const [, thread] of threads.entries()) {
    if (thread.isCounter) continue;
    const threadName = getEffectiveThreadNameForThread(thread);
    let eventArr = [];
    const isCtrl = threadName.includes('AICPU-CTRL');
    const isSched = threadName.includes('AICPU-SCHED');
    const isCore = !thread._originalThreadName && (threadName.includes('-AIC-') || threadName.includes('-AIV-'));
    
    if (isCtrl) {
      eventArr = [];
    } else if (isSched) {
      threadMap.set(threadName, []);
      eventArr = findBuildSchedEvent(thread, roundNo, taskNo);
    } else if (isCore) {
      threadMap.set(threadName, []);
       eventArr = findBuildCoreEvent(thread.eventIds, roundNo, taskNo, threadMap);
    } else {
      collectMergedCoreEventsFromThread(thread, mergedCoreEvents);
    }
    threadMap.set(threadName, eventArr);
  }

  const schedExecEvents = collectSchedExecEvents(threadMap);
  processMergedCoreEvents(mergedCoreEvents, threadMap, clickedEvent, schedExecEvents, (ids, map) => findBuildCoreEvent(ids, roundNo, taskNo, map));

  return threadMap;
}

const collectFilteredMergedCoreEvents = (thread, threadName, mergedCoreEvents, shouldInclude, getKey) => {
  if (!threadName.includes('AIC_') && !threadName.includes('AIV_') && !threadName.includes('AIC-') && !threadName.includes('AIV-')) {
    return;
  }
  for (const eventId of thread.eventIds) {
    const evt = swimDataManager.getEventById(eventId);
    if (!evt?.originalThreadName) { continue; }
    const origName = evt.originalThreadName;
    if (!shouldInclude(origName)) { continue; }
    const key = getKey(origName);
    if (!mergedCoreEvents.has(key)) {
      mergedCoreEvents.set(key, []);
    }
    mergedCoreEvents.get(key).push(eventId);
  }
};

const isLifecycleMarkerEvent = (event) => {
  if (!event?.name) { return true; }
  return event.name.startsWith('EXIT_') || event.name.startsWith('BEGIN_');
};

const getFallbackRanges = (schedRanges, execRanges, clickedEvent) => {
  if (schedRanges.length > 0) { return schedRanges; }
  if (execRanges.length > 0) { return execRanges; }
  if (clickedEvent && !isLifecycleMarkerEvent(clickedEvent)) {
    return [{ startTime: clickedEvent.startTime, endTime: clickedEvent.endTime }];
  }
  return [];
};

const findFallbackKernelEvents = (eventIds, clickedEvent, schedEvents) => {
  if (!eventIds || eventIds.length === 0) {
    return [];
  }
  const thread = swimDataManager.getThreadByEvent(eventIds[0]);
  if (!thread) {
    return [];
  }
  const schedRanges = (schedEvents || [])
    .filter(e => e && e.name && e.name.includes('DEV_TASK_SCHED_EXEC'))
    .map(e => ({ startTime: e.startTime, endTime: e.endTime }));
  const execRanges = eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && e.name && e.name.includes('DEV_TASK_ALL_CALLOP_TASK_EXEC'))
    .map(e => ({ startTime: e.startTime, endTime: e.endTime }));
  const ranges = getFallbackRanges(schedRanges, execRanges, clickedEvent);
  if (ranges.length === 0) {
    return [];
  }
  const result = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event || event.originalThreadName) {
      continue;
    }
    if (ranges.some(r => event.startTime <= r.endTime && event.endTime >= r.startTime)) {
      result.push(event);
    }
  }
  return result;
};

const setCoreWithFallback = (threadMap, origThreadName, eventArr, fallbackEvents) => {
  if (eventArr.length > 0 && fallbackEvents.length > 0) {
    threadMap.set(origThreadName, [...eventArr, ...fallbackEvents]);
  } else if (eventArr.length > 0) {
    threadMap.set(origThreadName, eventArr);
  } else if (fallbackEvents.length > 0) {
    threadMap.set(origThreadName, fallbackEvents);
  }
};

// 获取ctrl类的map
export const findSchedCoreMapByNo = (event, threads) => {
  const threadMap = new Map();
  const { name } = event;
  const { roundNo, taskNo } = parseSuffixNumbers(name);
  const devTaskBuildKey = `DEV_TASK_BUILD_${roundNo}(${taskNo})`;
  const hasDevTaskBuild = name.includes(devTaskBuildKey);
  
  // 收集合并后的核心事件（按 originalThreadName 分组）
  const mergedCoreEvents = new Map<string, string[]>();
  
  for (const [threadKey, thread] of threads.entries()) {
    if (thread.isCounter) {
      continue;
    }
    const threadName = getEffectiveThreadNameForThread(thread);
    let eventArr = [];
    const isCtrl = threadName.includes('AICPU-CTRL');
    const isSched = threadName.includes('AICPU-SCHED');
    const isCore = (thread._originalThreadName ? false : (threadName.includes('-AIC-') || threadName.includes('-AIV-')));
    if (isCtrl) {
      eventArr = [event];
    } else if (isSched && hasDevTaskBuild ) {
      eventArr = findBuildSchedEvent(thread, roundNo, taskNo);
    } else if (isCore) {
      eventArr = findBuildCoreEvent(thread.eventIds, roundNo, taskNo, threadMap);
    } else {
      collectFilteredMergedCoreEvents(
        thread, threadName, mergedCoreEvents,
        (origName) => /^(SCHED\d+-(AIC|AIV)-\d+|(AIC|AIV)-\d+-SCHED\d+)$/.test(origName),
        (origName) => origName
      );
      eventArr = [];
    }
    if (eventArr.length > 0) {
      threadMap.set(threadName, eventArr);
    }
  }

  const schedExecEvents = collectSchedExecEvents(threadMap);
  processMergedCoreEvents(mergedCoreEvents, threadMap, event, schedExecEvents, (ids, map) => findBuildCoreEvent(ids, roundNo, taskNo, map));

  return threadMap;
};
// 通过ctrl类的map获取events
export const findSchedCoreEventsByNo = (schedCoreMap) => {
  const eventsArray = [];
  for (const [key, value] of schedCoreMap) {
    for (const event of value) {
      eventsArray.push(event);
    }
  }
  return eventsArray;
};
// 获取SCHED类的map
export const findSchedMapByNo = ({roundNo, taskNo, schedNo}, currentEventName, threads , event) => {
  const { id } = event;
  const threadMap = new Map();
  const isSchedEventRange = checkSchedEventRange(currentEventName);  // 是否在SCHED范围
  const pattern = new RegExp(`(SCHED${schedNo}-AI[C|V]-|AI[C|V]-\\d+-SCHED${schedNo})`);
  const schedStr = `AICPU-SCHED-${schedNo}`;
  if (!taskNo) {
    taskNo = getTaskNo(schedStr, id, threads);
  }
  
  // 收集合并后的核心事件（按 originalThreadName 分组）
  const mergedCoreEvents = new Map<string, string[]>();
  
  for (const [threadKey, thread] of threads.entries()) {
    if (thread.isCounter) {
      continue;
    }
    const threadName = getEffectiveThreadNameForThread(thread);
    let eventArr = [];
    const isCtrl = threadName.includes('AICPU-CTRL');
    const isSched = threadName.includes('AICPU-SCHED');
    const isOrigCore = !thread._originalThreadName && (threadName.includes('-AIC-') || threadName.includes('-AIV-'));
    if (isCtrl) {
      eventArr = findCtrlEvent(thread, roundNo, taskNo, isSchedEventRange);
    } else if (isSched && threadName === schedStr) {
      eventArr = findSchedEvent(thread, roundNo, taskNo, isSchedEventRange, currentEventName);
    } else if (isOrigCore && pattern.test(threadName)) {
      const schedThread = threadMap.get(schedStr);
      eventArr = findCoreEvent(thread.eventIds, currentEventName, roundNo, taskNo, schedThread);
    } else {
      collectFilteredMergedCoreEvents(
        thread, threadName, mergedCoreEvents,
        (origName) => pattern.test(origName),
        (origName) => origName
      );
      eventArr = [];
    }
    if (eventArr.length > 0) {
      threadMap.set(threadName, eventArr);
    }
  }

  const schedExecEvents = collectSchedExecEvents(threadMap);
  processMergedCoreEvents(mergedCoreEvents, threadMap, event, schedExecEvents, (ids, map) => findCoreEvent(ids, currentEventName, roundNo, taskNo, map.get(schedStr)));

  return threadMap;
};
// 通过SCHED类的map获取events
export const findSchedEventsByNo = (schedCoreMap) => {
  const eventsArray = [];
  for (const [key, value] of schedCoreMap) {
    for (const event of value) {
      eventsArray.push(event);
    }
  }
  return eventsArray;
};
// 获取AICORE类的map
export const findCoreMapByNo = (schedNo, threadNameInfo, event, threads) => {
  const threadMap = new Map();
  const {name} = event;
  const result = parseSuffixNumbers(name);
  const { roundNo, taskNo } = result;
  const isCoreEventRange = checkCoreEventRange(name);   // 是否在CORE范围
  const schedStr = `AICPU-SCHED-${schedNo}`;
  
  // 收集合并后的核心事件（按 originalThreadName 分组）
  const mergedCoreEvents = new Map<string, string[]>();
  
  for (const [threadKey, thread] of threads.entries()) {
    if (thread.isCounter) {
      continue;
    }
    const threadName = getEffectiveThreadNameForThread(thread);
    let eventArr = [];
    const isCtrl = threadName.includes('AICPU-CTRL');
    const isSched = threadName.includes('AICPU-SCHED');
    const isOrigCore = !thread._originalThreadName && (threadName === threadNameInfo);
    if (isCtrl && isCoreEventRange) {
      eventArr = findCtrlEvent(thread, roundNo, taskNo, isCoreEventRange);
    } else if (isSched && threadName === schedStr && isCoreEventRange) {
      const coreRelationSched = getCoreRelationEvent(roundNo, taskNo, name);   // 有没有影射任务
      eventArr = coreRelationSched ? findSchedEvent(thread, roundNo, taskNo, isCoreEventRange, coreRelationSched) : [];
    } else if (isOrigCore) {
      const schedThread = threadMap.get(schedStr);
      eventArr = schedThread?.length > 0 ? findCoreEvent(thread.eventIds, name, roundNo, taskNo, schedThread) : [event];
    } else {
      collectFilteredMergedCoreEvents(
        thread, threadName, mergedCoreEvents,
        (origName) => origName === threadNameInfo,
        () => threadNameInfo
      );
      eventArr = [];
    }
    if (eventArr.length > 0) {
      threadMap.set(threadName, eventArr);
    }
  }
  
  const schedExecEvents = collectSchedExecEvents(threadMap);
  processMergedCoreEvents(mergedCoreEvents, threadMap, event, schedExecEvents, (ids, map) => {
    const schedThread = map.get(schedStr);
    return schedThread?.length > 0 ? findCoreEvent(ids, name, roundNo, taskNo, schedThread) : [event];
  });

  return threadMap;
};
// 通过AICORE类的map获取events
export const findCoreEventsByNo = (schedCoreMap) => {
  const eventsArray = [];
  for (const [key, value] of schedCoreMap) {
    for (const event of value) {
      eventsArray.push(event);
    }
  }
  return eventsArray;
};
export const getTaskNo = (schedStr, id, threads) => {
  const thread = Array.from(threads.values()).find(t => t.threadName === schedStr);
  if (!thread) {
    return '';
  }
  const index = thread.eventIds.findIndex(i => i === id);
  if (index > 0) {
    const preEventId = thread.eventIds[index - 1];
    return parseSuffixNumbers(swimDataManager.getEventById(preEventId).name).taskNo;
  }
  return '';
};
export const hashMatchDataGet = (eventHint, eventTime, { rootHashes, leafHashes, leafHashMap }) => {
  const eventTimeMs = eventTime / 1000;
  if (eventHint) {
    const rootHashMatch = eventHint.match(/rootHash:(?<hash>\d+)/);
    const leafHashMatch = eventHint.match(/leafHash:(?<hash>\d+)/);
    if (leafHashMatch && rootHashMatch) {
      const [, leafHash] = leafHashMatch;
      const [, rootHash] = rootHashMatch;
      if (!rootHashes.value.includes(rootHash)) {
        rootHashes.value.push(rootHash);
      }

      if (!leafHashes.value.includes(leafHash)) {
        leafHashes.value.push(leafHash);
      }
      const key = `${leafHash}_${rootHash}`;
      if (leafHashMap.value.has(key)) {
        const stats = leafHashMap.value.get(key);
        stats.Occurrences++;
        stats['Wall duration'] += eventTimeMs;
        stats['Avg Wall duration'] = stats['Wall duration'] / stats.Occurrences;
      } else {
        leafHashMap.value.set(key, {
          Occurrences: 1,
          'Wall duration': eventTimeMs,
          'Avg Wall duration': eventTimeMs,
          'root hash': rootHash,
          'leaf hash': leafHash,
        });
      }
    }
  }
};
export const getEventDisplayName = (e) => {
  return (e?.name || '');
};
export const getThreadDisplayName = (e) => {
  return (e?.threadName || '');
};
export const findAllCoreEvent = (eventIds, roundNo, taskNo, schedThread) => {
  const result = getSchedRelatation(schedThread, roundNo, taskNo);
  const coreEventArr = [];
  const nameToFlagMap = {
    [`DEV_TASK_RCV_MODEL_${roundNo}(${taskNo})`]: 'hasRcv',
    [`DEV_TASK_ALL_CALLOP_TASK_EXEC_${roundNo}(${taskNo})`]: 'hasExec',
    [`DEV_TASK_WAIT_RCV_FIRST_CALLOP_TASK_${roundNo}(${taskNo})`]: 'hasSend',
    [`DEV_TASK_WAIT_RCV_FIRST_LEAF_TASK_${roundNo}(${taskNo})`]: 'hasSend',
    [`DEV_TASK_WAIT_SYNC_STOP_NOTIFY_${roundNo}(${taskNo})`]: 'hasStop'
  };
  for (const eventId of eventIds) {
    const event = swimDataManager.getEventById(eventId);
    const flagKey = nameToFlagMap[event.name];
    if (flagKey && result[flagKey]) {
      coreEventArr.push(event);
    }
  }
  return coreEventArr;
};
export const findCoreEvent = (eventIds, eventName, roundNo, taskNo, schedThread) => {
  const result = getSchedRelatation(schedThread, roundNo, taskNo);
  const coreEventArr = [];
  const relationCoreEventName = getSchedRelationEvent(roundNo, taskNo, eventName);
  const nameToFlagMap = {
    [`DEV_TASK_RCV_MODEL_${roundNo}(${taskNo})`]: 'hasRcv',
    [`DEV_TASK_ALL_CALLOP_TASK_EXEC_${roundNo}(${taskNo})`]: 'hasExec',
    [`DEV_TASK_WAIT_RCV_FIRST_CALLOP_TASK_${roundNo}(${taskNo})`]: 'hasSend',
    [`DEV_TASK_WAIT_RCV_FIRST_LEAF_TASK_${roundNo}(${taskNo})`]: 'hasSend',
    [`DEV_TASK_WAIT_SYNC_STOP_NOTIFY_${roundNo}(${taskNo})`]: 'hasStop'
  };
  for (const eventId of eventIds) {
    const event = swimDataManager.getEventById(eventId);
    const { name } = event;
    const flagKey = nameToFlagMap[name];
    if (flagKey && result[flagKey] && relationCoreEventName === name) {
      coreEventArr.push(event);
    }
  }
  return coreEventArr;
};
export const findBuildCoreEvent = (eventIds, roundNo, taskNo, threadMap) => {
  for (const [key, value] of threadMap) {
    if(key.includes('AICPU-SCHED-')){
      return findAllCoreEvent(eventIds, roundNo, taskNo, value);
    }
  }
  return [];
};
export const findSchedEvent = (thread, roundNo, taskNo, hasEvent, currentEventName) => {
  const originEventIds = thread.eventIds;
  if (hasEvent) {
    const rcvPattern = `DEV_TASK_RCV_${roundNo}(${taskNo})`;
    const rspPattern = `DEV_TASK_RSP_${roundNo}(${taskNo})`;
    const rcvIndex = originEventIds.findIndex((eId) => swimDataManager.getEventById(eId).name === rcvPattern);
    const rspIndex = originEventIds.findIndex((eId) => swimDataManager.getEventById(eId).name === rspPattern);
    let currentIndex = -1;
    for (let i = rcvIndex; i <= rspIndex; i++) {
      if (swimDataManager.getEventById(originEventIds[i]).name === currentEventName) {
        currentIndex = i;
        break; 
      }
    }
    if (rcvIndex !== -1 && rspIndex !== -1 && rcvIndex <= rspIndex) {
      return originEventIds.slice(rcvIndex, currentIndex + 1).map((eId) => swimDataManager.getEventById(eId));
    }
    return [];
  } else {
    const foundEvent = originEventIds.find((eId) => swimDataManager.getEventById(eId).name === currentEventName);
    return foundEvent ? [swimDataManager.getEventById(foundEvent)] : [];
  }
};
export const getCoreRelationEvent = (roundNo, taskNo, currentEventName) => {
  const suffix = `_${roundNo}(${taskNo})`;
  const schedSuffix = `_${roundNo}`;
  const relationMap = new Map([
    [`DEV_TASK_RCV_MODEL${suffix}`, `DEV_TASK_RCV${suffix}`],
    [`DEV_TASK_WAIT_RCV_FIRST_CALLOP_TASK${suffix}`, `DEV_TASK_SEND_FIRST_CALLOP_TASK${schedSuffix}`],
    [`DEV_TASK_ALL_CALLOP_TASK_EXEC${suffix}`, `DEV_TASK_SCHED_EXEC${suffix}`],
    [`DEV_TASK_WAIT_SYNC_STOP_NOTIFY${suffix}`, `DEV_TASK_SYNC_CORE_STOP${suffix}`],
    [`DEV_TASK_WAIT_RCV_FIRST_LEAF_TASK${suffix}`, `DEV_TASK_SEND_FIRST_LEAF_TASK${schedSuffix}`],
  ]);
  return relationMap.get(currentEventName) || '';
};
export const getSchedRelationEvent = (roundNo, taskNo, currentEventName) => {
  const suffix = `_${roundNo}(${taskNo})`;
  const schedSuffix = `_${roundNo}`;
  const relationMap = new Map([
    [`DEV_TASK_RCV${suffix}`, `DEV_TASK_RCV_MODEL${suffix}`],
    [`DEV_TASK_SEND_FIRST_CALLOP_TASK${schedSuffix}`, `DEV_TASK_WAIT_RCV_FIRST_CALLOP_TASK${suffix}`],
    [`DEV_TASK_SCHED_EXEC${suffix}`, `DEV_TASK_ALL_CALLOP_TASK_EXEC${suffix}`],
    [`DEV_TASK_SYNC_CORE_STOP${suffix}`, `DEV_TASK_WAIT_SYNC_STOP_NOTIFY${suffix}`],
    [`DEV_TASK_SEND_FIRST_LEAF_TASK${schedSuffix}`, `DEV_TASK_WAIT_RCV_FIRST_LEAF_TASK${suffix}`],
  ]);
  return relationMap.get(currentEventName) || '';
};
export const findBuildSchedEvent = (thread, roundNo, taskNo) => {
  const originEventIds = thread.eventIds;
  const rcvPattern = `DEV_TASK_RCV_${roundNo}(${taskNo})`;
  const rspPattern = `DEV_TASK_RSP_${roundNo}(${taskNo})`;
  const rcvIndex = originEventIds.findIndex((eId) => swimDataManager.getEventById(eId).name === rcvPattern);
  const rspIndex = originEventIds.findIndex((eId) => swimDataManager.getEventById(eId).name === rspPattern);
  if (rcvIndex !== -1 && rspIndex !== -1 && rcvIndex <= rspIndex) {
    return originEventIds.slice(rcvIndex, rspIndex + 1).map((eId) => swimDataManager.getEventById(eId));
  }
  return [];
};
export const findCtrlEvent = (thread, roundNo, taskNo, hasEvent) => {
  if(!hasEvent){
    return [];
  }
  const targetStr = `DEV_TASK_BUILD_${roundNo}(${taskNo})`;
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (event.name.includes(targetStr)) {
      return [event];
    }
  }
  return [];
};
export const checkSchedEventRange = (currentEventName) => {
  const highSchedEventsArr = ['DEV_TASK_RCV', 'DEV_TASK_SEND_FIRST_CALLOP_TASK', 'DEV_TASK_SCHED_EXEC','DEV_TASK_SYNC_CORE_STOP','WAIT_ALL_DEV_TASK_FINISH', 'DEV_TASK_RSP', 'DEV_TASK_SEND_FIRST_LEAF_TASK'];
  let hasMatch = false;
  for (let i = 0; i < highSchedEventsArr.length; i++) {
    if (currentEventName.includes(highSchedEventsArr[i])) {
      hasMatch = true;
      break;
    }
  }
  return hasMatch;
};
export const checkCoreEventRange = (currentEventName) => {
  const highCoreEventsArr = ['DEV_TASK_RCV_MODEL', 'DEV_TASK_WAIT_RCV_FIRST_CALLOP_TASK', 'DEV_TASK_WAIT_RCV_FIRST_LEAF_TASK', 'DEV_TASK_ALL_CALLOP_TASK_EXEC','WAIT_ALL_DEV_TASK_CALLOP_EXEC_FINISH','DEV_TASK_WAIT_SYNC_STOP_NOTIFY'];
  let hasMatch = false;
  for (let i = 0; i < highCoreEventsArr.length; i++) {
    if (currentEventName.includes(highCoreEventsArr[i])) {
      hasMatch = true;
      break;
    }
  }
  return hasMatch;
};
export const getSchedRelatation = (schedThread, roundNo, taskNo) => {
  const rcvStr = `DEV_TASK_RCV_${roundNo}(${taskNo})`;
  const sendStr = `DEV_TASK_SEND_FIRST_CALLOP_TASK_${roundNo}`;
  const execStr = `DEV_TASK_SCHED_EXEC_${roundNo}(${taskNo})`;
  const stopStr = `DEV_TASK_SYNC_CORE_STOP_${roundNo}(${taskNo})`;
  const sendLeafStr = `DEV_TASK_SEND_FIRST_LEAF_TASK_${roundNo}`;
  const result = {
    hasRcv: false,
    hasSend: false,
    hasExec: false,
    hasStop: false,
  };
  for (const event of schedThread) {
    const name = event.name;
    if (name === rcvStr) {
      result.hasRcv = true;
    } else if (name === sendStr) {
      result.hasSend = true;
    } else if (name === sendLeafStr) {
      result.hasSend = true;
    } else if (name === execStr) {
      result.hasExec = true;
    } else if (name === stopStr) {
      result.hasStop = true;
    }
    if (result.hasRcv && result.hasSend && result.hasExec && result.hasStop) {
      break;
    }
  }
  return result;
};
export const processTimeInfo = (timeInfo, data) => {
  let minT = Infinity;
  let maxT = -Infinity;
  for (const processId of Object.keys(data.processes)) {
    for (const [threadId, thread] of data.processes[processId].threads) {
      for (const eventId of thread.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        minT = Math.min(minT, event.ts);
        if (event.duration) {
          maxT = Math.max(maxT, event.ts + event.duration);
        } else if (event.endTime) {
          maxT = Math.max(maxT, event.endTime);
        }
      }
    }
  }
  const offset = data.timeInfo.minTime - minT;
  maxT += offset;
  minT += offset;
  for (const processId of Object.keys(data.processes)) {
    for (const [threadId, thread] of data.processes[processId].threads) {
      for (const eventId of thread.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        event.ts += offset;
        event.startTime += offset;
        event.endTime += offset;
        event.renderStartTime += offset;
        event.renderEndTime += offset;
      }
    }
  }
  timeInfo.value.minTime = minT;
  timeInfo.value.maxTime = maxT;
};

export const parseSuffixNumbers = (str) => {
  const regex = /_(\d+)(?:\((\d+)\))?$/;
  const match = str.match(regex);
  if (!match) {
    throw new Error(`Invalid format: ${str}. Expected format: '..._num' or '..._num(num)'`);
  }
  const roundNo = match[1]; //下划线
  const taskNo = match[2] ?? null; //括号
  return {
    roundNo,
    taskNo,
  };
};

export const findBuildTaskByNo = (schedCoreMap) => {
  for (const [key, value] of schedCoreMap) {
    if (key.includes('AICPU-CTRL') && value.length === 1) {
      return value[0];
    }
  }
  return null;
};

export const parseCompressedData = (swimInfo, processExpanded, perfLogger) => {
  perfLogger.time('Compressor Frontend Read');
  const swimData = getReader(swimInfo);
  perfLogger.timeEnd('Compressor Frontend Read');
  perfLogger.time('Compressor Frontend Process');
  const label2lines = {};
  swimData.lane2line = swimData.computeLane2Line();
  let processedTasks = [];
  let expandSet = false;
  for (const processId in swimData.processes) {
    if (!Object.prototype.hasOwnProperty.call(swimData.processes, processId)) { continue };
    if (!expandSet) {
      processExpanded.set(processId, true);
      expandSet = true;
    } else {
      processExpanded.set(processId, false);
    }
    const process = swimData.processes[processId];
    for (const threadId in process.threads) {
      if (!Object.prototype.hasOwnProperty.call(process.threads, threadId)) { continue };
      const thread = process.threads[threadId];
      const isCounter = thread.ph === 'C';
      process.threads[threadId].isCounter = isCounter;
      
      let events = [];
      for (let idx = 0; idx < thread.eventCount; idx++) {
        const event = thread.getEvent(idx);
        if (!isCounter) {
          const dependencies = event.getDependencies();
          event.dependencies = {};
          event.dependencies.predecessors = dependencies.predecessors.map(it => it.id);
          event.dependencies.successors = dependencies.successors.map(it => it.id);
          event.line = thread.lines[idx];
          processedTasks.push(event);
        }
        events.push(event);
      }
      process.threads[threadId].events = events;
    }
  }

  processedTasks = processedTasks.sort((a, b) => a.startTime - b.startTime);
  const allEventsMap = new Map(processedTasks.map(e => [e.id, e]));
  const globalMaxTime = processedTasks.reduce((max, e) => {
    return e.endTime > max ? e.endTime : max;
  }, -Infinity); 

  for (const processId in swimData.processes) {
    if (!Object.prototype.hasOwnProperty.call(swimData.processes, processId)) { continue };
    const process = swimData.processes[processId];
    if (!['kernel', '', undefined].includes(process.type)) { continue };
    for (const threadId in process.threads) {
      if (!Object.prototype.hasOwnProperty.call(process.threads, threadId)) { continue };
      const thread = process.threads[threadId];
      if (!thread.threadName.includes('Fake Core')) { continue };
      
      for (let idx = 0; idx < thread.eventCount; idx++) {
        const event = thread.events[idx];
        const label = `${event.pid}@${event.tid}`;
        let lines = label2lines[label];
        if (!lines) {
          label2lines[label] = lines = [];
        }
        layoutFakeCoreEvent(event, lines, allEventsMap, globalMaxTime);
      }
    }
  }

  const computedPmuTotal = swimData.computePmuTotal();
  computedPmuTotal.icache_hit = 1 - (computedPmuTotal.icache_miss / computedPmuTotal.icache_req);
  computedPmuTotal.vec_ratio = computedPmuTotal.vec_busy_cycles / computedPmuTotal['total cycle'];
  computedPmuTotal.cube_ratio = computedPmuTotal.cube_busy_cycles / computedPmuTotal['total cycle'];
  computedPmuTotal.scalar_ratio = computedPmuTotal.scalar_busy_cycles / computedPmuTotal['total cycle'];
  computedPmuTotal.mte1_ratio = computedPmuTotal.mte1_busy_cycles / computedPmuTotal['total cycle'];
  computedPmuTotal.mte2_ratio = computedPmuTotal.mte2_busy_cycles / computedPmuTotal['total cycle'];
  computedPmuTotal.mte3_ratio = computedPmuTotal.mte3_busy_cycles / computedPmuTotal['total cycle'];

  swimData.pmu_total = computedPmuTotal;
  perfLogger.timeEnd('Compressor Frontend Process');
  return swimData;
}; 

export const getWrapLabelCache = (laneKey) => {
  return wrapLabelCache.get(laneKey);
};

export const clearWrapLabelCache = () => {
  wrapLabelCache.clear();
};

export const renderWrapLabelRow = (
  ctx: CanvasRenderingContext2D,
  laneItem: any,
  getPositionByTime: any,
  globalConnectionCanvas: any,
  { colorCfg, layout, viewState, isHover = false, hoverWrapId = -1 }
) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  const isGlobalCanvas = ctx.canvas.classList.contains('global-connection-canvas');
  const selectedCoords = globalConnectionCanvas?.value?.getMixEventCoordinates(laneItem, false);
  const laneY = isGlobalCanvas && selectedCoords != null
    ? (selectedCoords - ((laneItem.height * devicePixelRatio) / 2))
    : laneItem.y * devicePixelRatio;
  const laneHeight = laneItem.height * devicePixelRatio;
  
  const labelHeight = 20 * devicePixelRatio;
  const labelY = laneY + (laneHeight - labelHeight) / 2;
  
  ctx.font = `${12 * devicePixelRatio}px Arial`;
  const padding = 8 * devicePixelRatio;
  const canvaWidth = viewState.canvasWidth;
  
  const wrapIds = laneItem.wrapIds || [laneItem.wrapId];
  const wrapStartTimes = laneItem.wrapStartTimes || [laneItem.startTime];
  
  const labelBoxes = [];
  
  for (let i = 0; i < wrapIds.length; i++) {
    const wrapId = wrapIds[i];
    const wrapStartTime = wrapStartTimes[i];
    
    const startX = getPositionByTime(wrapStartTime, viewState, layout) - layout.processLabelWidth;
    const labelX = startX * viewState.pixelScale + viewState.pixelOffsetX;
    
    if (labelX >= canvaWidth) {
      continue;
    }
    
    const maxWidth = canvaWidth - labelX;
    const minWidthForW = ctx.measureText('W...').width + padding * 2;
    
    const labelInfo = calculateWrapLabelText({ ctx, wrapId, maxWidth, minWidthForW, padding });
    
    const boxWidth = labelInfo.label ? Math.min(labelInfo.textWidth + padding * 2, maxWidth) : Math.min(minWidthForW, maxWidth);
    
    labelBoxes.push({
      wrapId,
      labelX,
      boxWidth,
      label: labelInfo.label,
      textWidth: labelInfo.textWidth,
      maxWidth,
      minWidthForW,
      padding,
    });
  }
  
  adjustOverlappingLabels({ labelBoxes, padding, ctx });
  
  wrapLabelCache.set(laneItem.wrapId || laneItem.wrapIds?.join('-'), {
    labelBoxes,
    laneY,
    laneHeight,
    padding,
  });
  
  for (const boxInfo of labelBoxes) {
    const { wrapId, labelX, boxWidth, label, minWidthForW } = boxInfo;
    const isCurrentHover = wrapId === hoverWrapId;
    
    const shouldDrawText = boxWidth >= minWidthForW && label;
    
    ctx.fillStyle = isCurrentHover ? colorCfg.wrapBgColorHover : colorCfg.wrapBgColorDefault;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(labelX - padding, labelY, boxWidth, labelHeight, 4 * devicePixelRatio);
    ctx.fill();
    
    if (shouldDrawText) {
      ctx.fillStyle = isCurrentHover ? colorCfg.wrapTextColorHover : colorCfg.wrapTextColorDefault;
      const drawTextYTemp = labelY + labelHeight / 2 + 4 * devicePixelRatio;
      ctx.fillText(label, labelX, drawTextYTemp);
    }
  }
  
  ctx.restore();
};

const calculateWrapLabelText = ({ ctx, wrapId, maxWidth, minWidthForW, padding }) => {
  let label = '';
  let textWidth = 0;
  
  if (maxWidth >= minWidthForW) {
    label = `Wrap ${wrapId}`;
    textWidth = ctx.measureText(label).width;
    
    if (textWidth + padding * 2 > maxWidth) {
      const availableTextWidth = maxWidth - padding * 2;
      const truncated = truncateTextToFit({ ctx, text: label, availableTextWidth });
      label = truncated.text;
      textWidth = truncated.textWidth;
    }
  }
  
  return { label, textWidth };
};

const truncateTextToFit = ({ ctx, text, availableTextWidth }) => {
  const ellipsis = '...';
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  
  if (availableTextWidth <= ellipsisWidth) {
    const newText = 'W...';
    const newTextWidth = ctx.measureText(newText).width;
    return { text: newText, textWidth: newTextWidth };
  }
  
  const availableForChars = availableTextWidth - ellipsisWidth;
  let truncatedText = '';
  
  for (const char of text) {
    if (ctx.measureText(truncatedText + char).width > availableForChars) {
      break;
    }
    truncatedText += char;
  }
  
  if (truncatedText.length === 0) {
    truncatedText = 'W';
  }
  
  const finalText = truncatedText + ellipsis;
  const textWidth = ctx.measureText(finalText).width;
  
  return { text: finalText, textWidth };
};

const adjustOverlappingLabels = ({ labelBoxes, padding, ctx }) => {
  if (labelBoxes.length < 2) {
    return;
  }
  
  const overlapThreshold = 4 * devicePixelRatio;
  
  for (let i = 1; i < labelBoxes.length; i++) {
    const prevBox = labelBoxes[i - 1];
    const currentBox = labelBoxes[i];
    
    const prevBoxEndX = prevBox.labelX - padding + prevBox.boxWidth;
    const currentBoxStartX = currentBox.labelX - padding;
    
    const gap = currentBoxStartX - prevBoxEndX;
    
    if (gap < overlapThreshold) {
      const neededWidth = currentBoxStartX - (prevBox.labelX - padding) - overlapThreshold;
      
      if (neededWidth < prevBox.boxWidth) {
        const absoluteMinWidth = 20 * devicePixelRatio;
        const newBoxWidth = Math.max(neededWidth, absoluteMinWidth);
        
        if (newBoxWidth < prevBox.boxWidth) {
          prevBox.boxWidth = newBoxWidth;
          
          if (newBoxWidth < prevBox.minWidthForW) {
            prevBox.label = '';
            prevBox.textWidth = 0;
          } else if (prevBox.label && newBoxWidth > padding * 2) {
            const availableTextWidth = newBoxWidth - padding * 2;
            const truncated = truncateTextToFit({ ctx, text: prevBox.label, availableTextWidth });
            prevBox.label = truncated.text;
            prevBox.textWidth = truncated.textWidth;
          }
        }
      }
    }
  }
};

export const renderWrapContainerBox = (
  ctx: CanvasRenderingContext2D,
  wrapContainer: any,
  swimLaneOrder: any[],
  getPositionByTime: any,
  globalConnectionCanvas: any,
  { colorCfg, layout, viewState, timelineState, isHover = false }
) => {
  if (wrapContainer.minStartTime > timelineState.endTime || wrapContainer.maxEndTime < timelineState.startTime) {
    return;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const startX = getPositionByTime(wrapContainer.minStartTime, viewState, layout) - layout.processLabelWidth;
  const endX = getPositionByTime(wrapContainer.maxEndTime, viewState, layout) - layout.processLabelWidth;
  
  const scaledStartX = startX * viewState.pixelScale + viewState.pixelOffsetX;
  const scaledEndX = endX * viewState.pixelScale + viewState.pixelOffsetX;
  
  let minY = Infinity;
  let maxY = 0;
  const isGlobalCanvas = ctx.canvas.classList.contains('global-connection-canvas');
  for (const lane of swimLaneOrder) {
    if (lane.type === 'thread' && wrapContainer.threadTids.includes(lane.thread.tid)) {
      const selectedCoords = globalConnectionCanvas?.value?.getMixEventCoordinates(lane, false);
      const laneY = isGlobalCanvas && selectedCoords != null
        ? (selectedCoords - ((lane.height * devicePixelRatio) / 2)) / devicePixelRatio
        : lane.y;
      minY = Math.min(minY, laneY);
      maxY = Math.max(maxY, laneY + lane.height);
    }
  }
  
  if (minY === Infinity) {
    ctx.restore();
    return;
  }
  
  const scaledMinY = minY * devicePixelRatio;
  const scaledMaxY = maxY * devicePixelRatio;
  
  const { canvasWidth } = viewState;
  
  const clippedStartX = Math.max(0, scaledStartX);
  const clippedEndX = Math.min(canvasWidth, scaledEndX);
  
  if (clippedStartX >= clippedEndX) {
    ctx.restore();
    return;
  }
  
  const scaledWidth = clippedEndX - clippedStartX;
  const scaledHeight = scaledMaxY - scaledMinY;
  
  const padding = 8 * devicePixelRatio;
  
  const leftPadding = clippedStartX < padding ? 0 : padding;
  const rightPadding = clippedEndX + padding > canvasWidth ? 0 : padding;
  
  ctx.strokeStyle = isHover ? colorCfg.wrapBgColorHover : colorCfg.wrapBgColorDefault;
  ctx.lineWidth = 1;
  ctx.setLineDash([4 * devicePixelRatio, 4 * devicePixelRatio]);
  ctx.fillStyle = isHover ? colorCfg.wrapBoxBgColor : colorCfg.wrapBorderBgColorDefault;
  ctx.beginPath();
  
  ctx.roundRect(clippedStartX - leftPadding, scaledMinY, scaledWidth + leftPadding + rightPadding, scaledHeight, 4 * devicePixelRatio);
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
};

export const renderWrapLabel = (
  wrapCtx: CanvasRenderingContext2D,
  getPositionByTime: any,
  globalConnectionCanvas: any,
  { colorCfg, layout, viewState, wrapId = -1 }
) => {
  const swimLaneOrder = swimDataManager.getSwimLaneOrder();
  if (swimLaneOrder.length === 0) return;
  
  if (!wrapCtx) return;
  
  clearWrapLabelCache();
  
  for (const lane of swimLaneOrder) {
    if (lane.type === 'wrap-label') {
      const wrapIds = lane.wrapIds || [lane.wrapId];
      const isHover = wrapIds.includes(wrapId);
      renderWrapLabelRow(wrapCtx, lane, getPositionByTime, globalConnectionCanvas, { colorCfg, layout, viewState, isHover, hoverWrapId: wrapId });
    }
  }
};

export const getSubEventColor = (subEvent: any, isDarkTheme: boolean): string => {
  const parentEvent = swimDataManager.getEventById(subEvent.parentEventId);
  if (!parentEvent || !parentEvent.color) {
    return 'rgba(10, 89, 247, 0.3)';
  }
  return isDarkTheme ? parentEvent.color.dark?.base : parentEvent.color.light?.base;
};

export const detectWaitTasks = (parentEventId: string): any[] => {
  const subEvents = swimDataManager.getSubEvents(parentEventId);
  if (subEvents.length < 2) return [];
  
  const sortedSubEvents = [...subEvents].sort((a, b) => a.startTime - b.startTime);
  const waitTasks: any[] = [];
  
  for (let i = 0; i < sortedSubEvents.length - 1; i++) {
    const currentEnd = sortedSubEvents[i].endTime;
    const nextStart = sortedSubEvents[i + 1].startTime;
    
    if (nextStart > currentEnd) {
      waitTasks.push({
        parentEventId,
        id: `${parentEventId}_wait_${i}`,
        startTime: currentEnd,
        endTime: nextStart,
        duration: nextStart - currentEnd,
        name: 'Wait',
        isWait: true,
        tid: sortedSubEvents[i].tid,
        pid: sortedSubEvents[i].pid,
        threadName: sortedSubEvents[i].threadName,
      });
    }
  }
  
  return waitTasks;
};

export const collectSubEventDependencyPathNodes = (event: any): Set<string> => {
  const relatedEvents = new Set<string>();
  
  const collectPredecessors = (currentEvent: any) => {
    const deps = swimDataManager.getSubEventDependencies(currentEvent.id);
    for (const pred of deps.predecessors) {
      if (!pred.renderInfo) continue;
      if (pred === event) continue;
      if (relatedEvents.has(pred.id)) continue;
      
      relatedEvents.add(pred.id);
      collectPredecessors(pred);
    }
  };
  
  const collectSuccessors = (currentEvent: any) => {
    const deps = swimDataManager.getSubEventDependencies(currentEvent.id);
    for (const succ of deps.successors) {
      if (!succ.renderInfo) continue;
      if (succ === event) continue;
      if (relatedEvents.has(succ.id)) continue;
      
      relatedEvents.add(succ.id);
      collectSuccessors(succ);
    }
  };
  
  collectPredecessors(event);
  collectSuccessors(event);
  
  return relatedEvents;
};

export const collectSubEventDependencyPathNodesWithControl = (
  event: any, 
  mode: string, 
  level: number
): Set<string> => {
  const relatedEvents: Set<string> = new Set();
  
  const collectPredecessors = (currentEvent: Event, depth: number): void => {
    if (depth === 0 || !currentEvent) return;
    const deps = swimDataManager.getSubEventDependencies(currentEvent.id);
    for (const pred of deps.predecessors) {
      if (!pred.renderInfo) continue;
      if (pred.id === event.id) continue;
      if (relatedEvents.has(pred.id)) continue;
      
      relatedEvents.add(pred.id);
      collectPredecessors(pred, depth - 1);
    }
  };
  
  const collectSuccessors = (currentEvent: Event, depth: number): void => {
    if (depth === 0 || !currentEvent) return;
    const deps = swimDataManager.getSubEventDependencies(currentEvent.id);
    for (const succ of deps.successors) {
      if (!succ.renderInfo) continue;
      if (succ.id === event.id) continue;
      if (relatedEvents.has(succ.id)) continue;
      
      relatedEvents.add(succ.id);
      collectSuccessors(succ, depth - 1);
    }
  };

  if (mode === DEP_MODE.all || mode === DEP_MODE.pre) {
    collectPredecessors(event, level);
  }
  
  if (mode === DEP_MODE.all || mode === DEP_MODE.next) {
    collectSuccessors(event, level);
  }
  
  return relatedEvents;
};

export const calculateHighlightedPaths = (
  event: any,
  highlightedPaths: Set<string>,
  connectionLevel: number
): void => {
  highlightedPaths.clear();
  
  const addAllAncestors = (eventId: string, maxDepth: number) => {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: eventId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || (depth > maxDepth && maxDepth !== -1)) {
        continue;
      }
      
      visited.add(currentId);
      const currentEvent = swimDataManager.getEventById(currentId);
      if (currentEvent) {
        highlightedPaths.add(currentEvent.id);
        currentEvent.dependencies?.predecessors?.forEach((predId: string) => {
          if (!visited.has(predId)) {
            queue.push({ id: predId, depth: depth + 1 });
          }
        });
      }
    }
  };
  
  const addAllDescendants = (eventId: string, maxDepth: number) => {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: eventId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || (depth > maxDepth && maxDepth !== -1)) {
        continue;
      }
      
      visited.add(currentId);
      const currentEvent = swimDataManager.getEventById(currentId);
      if (currentEvent) {
        highlightedPaths.add(currentEvent.id);
        currentEvent.dependencies?.successors?.forEach((succId: string) => {
          if (!visited.has(succId)) {
            queue.push({ id: succId, depth: depth + 1 });
          }
        });
      }
    }
  };
  
  addAllAncestors(event.id, connectionLevel);
  addAllDescendants(event.id, connectionLevel);
  highlightedPaths.add(event.id);
};

export const calculateMixMacroPaths = (
  parentEventId: string,
  highlightedPaths: Set<string>,
  connectionLevel: number
): void => {
  const addAllAncestors = (eventId: string, maxDepth: number) => {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: eventId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || (depth > maxDepth && maxDepth !== -1)) {
        continue;
      }
      
      visited.add(currentId);
      const currentEvent = swimDataManager.getEventById(currentId);
      if (currentEvent) {
        highlightedPaths.add(currentEvent.id);
        currentEvent.dependencies?.predecessors?.forEach((predId: string) => {
          if (!visited.has(predId)) {
            queue.push({ id: predId, depth: depth + 1 });
          }
        });
      }
    }
  };
  
  const addAllDescendants = (eventId: string, maxDepth: number) => {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: eventId, depth: 0 }];
    
    while (queue.length > 0) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || (depth > maxDepth && maxDepth !== -1)) {
        continue;
      }
      
      visited.add(currentId);
      const currentEvent = swimDataManager.getEventById(currentId);
      if (currentEvent) {
        highlightedPaths.add(currentEvent.id);
        currentEvent.dependencies?.successors?.forEach((succId: string) => {
          if (!visited.has(succId)) {
            queue.push({ id: succId, depth: depth + 1 });
          }
        });
      }
    }
  };
  
  addAllAncestors(parentEventId, connectionLevel);
  addAllDescendants(parentEventId, connectionLevel);
  highlightedPaths.add(parentEventId);
};

export const drawBezierDashedLine = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  scale: number,
  offsetX: number,
  devicePixelRatio: number,
  isDarkTheme: boolean = false,
  isHover: boolean = false,
) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  const scaledStartX = startX * scale * devicePixelRatio + offsetX * devicePixelRatio;
  const scaledEndX = endX * scale * devicePixelRatio + offsetX * devicePixelRatio;
  const scaledStartY = startY * devicePixelRatio;
  const scaledEndY = endY * devicePixelRatio;
  let lineColor = '';
  if (isHover) {
    lineColor = isDarkTheme ? COLOR_CFG.dark.wrapLineColor : COLOR_CFG.light.wrapLineColor;
  } else {
    lineColor = isDarkTheme ? COLOR_CFG.dark.wrapLineHover : COLOR_CFG.light.wrapLineHover;
  }
  
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([4 * devicePixelRatio, 4 * devicePixelRatio]);
  
  const cp1x = scaledStartX + (scaledEndX - scaledStartX) * 0.3;
  const cp1y = scaledStartY;
  const cp2x = scaledStartX + (scaledEndX - scaledStartX) * 0.7;
  const cp2y = scaledEndY;
  
  ctx.beginPath();
  ctx.moveTo(scaledStartX, scaledStartY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, scaledEndX, scaledEndY);
  ctx.stroke();
  
  ctx.setLineDash([]);
  ctx.fillStyle = lineColor;
  
  const arrowSize = 6 * devicePixelRatio;
  let arrowAngle: number;
  
  if (Math.abs(scaledEndX - scaledStartX) < 1) {
    arrowAngle = scaledEndY > scaledStartY ? Math.PI / 2 : -Math.PI / 2;
  } else {
    arrowAngle = Math.atan2(scaledEndY - scaledStartY, scaledEndX - scaledStartX);
  }
  
  const halfAngle = Math.PI / 6;
  
  ctx.beginPath();
  ctx.moveTo(scaledEndX, scaledEndY);
  ctx.lineTo(
    scaledEndX - arrowSize * Math.cos(arrowAngle - halfAngle),
    scaledEndY - arrowSize * Math.sin(arrowAngle - halfAngle)
  );
  ctx.lineTo(
    scaledEndX - arrowSize * Math.cos(arrowAngle + halfAngle),
    scaledEndY - arrowSize * Math.sin(arrowAngle + halfAngle)
  );
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
};

export const renderMixDependenciesAll = (
  processKey: string,
  viewState: any,
  layout: any,
  eventCtx: any,
  getPositionByTime: any,
  isDarkTheme: boolean = false
) => {
  const wrapContainers = swimDataManager.getWrapContainers();
  if (wrapContainers.length === 0) { return; }

  for (const wrapContainer of wrapContainers) {
    const subEvents = swimDataManager.getSubEventsByWrapId(wrapContainer.wrapId);
    
    for (const subEvent of subEvents) {
      if (!subEvent.renderInfo) { continue; }
      
      const deps = swimDataManager.getSubEventDependencies(subEvent.id);
      
      for (const successor of deps.successors) {
        if (!successor.renderInfo) { continue; }
        
        const fromEvent = subEvent;
        const toEvent = successor;
        
        const fromX = getPositionByTime(fromEvent.endTime, viewState, layout) - layout.processLabelWidth;
        const toX = getPositionByTime(toEvent.startTime, viewState, layout) - layout.processLabelWidth;
        
        const fromY = fromEvent.renderInfo.y;
        const fromHeight = fromEvent.renderInfo.height;
        const toY = toEvent.renderInfo.y;
        const toHeight = toEvent.renderInfo.height;
        
        let startY: number;
        let endY: number;
        
        if (fromY < toY) {
          startY = fromY + fromHeight;
          endY = toY;
        } else if (fromY > toY) {
          startY = fromY;
          endY = toY + toHeight;
        } else {
          startY = fromY + fromHeight / 2;
          endY = toY + toHeight / 2;
        }
        
        drawBezierDashedLine(
          eventCtx,
          fromX,
          startY,
          toX,
          endY,
          viewState.scale,
          viewState.offsetX,
          getDevicePixelRatio(),
          isDarkTheme,
          false,
        );
      }
    }
  }
};

export const findVisibleEventRange = (thread, viewportStartTime, viewportEndTime) => {
  const maxRenderDuration = thread._maxRenderDuration;

  if (!thread.eventIds || thread.eventIds.length === 0) {
    return { leftBound: 0, rightBound: 0 };
  }

  let lo = 0;
  let hi = thread.eventIds.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const eventId = thread.eventIds[mid];
    const event = swimDataManager.getEventById(eventId);
    if (event.startTime <= viewportEndTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const rightBound = lo;

  let leftBound = 0;
  if (maxRenderDuration > 0) {
    const earliestPossibleStart = viewportStartTime - maxRenderDuration;
    lo = 0;
    hi = rightBound;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const eventId = thread.eventIds[mid];
      const event = swimDataManager.getEventById(eventId);
      if (event.endTime >= earliestPossibleStart) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    leftBound = lo;
  }

  return { leftBound, rightBound };
};

export const drawDependencyHighlightEvent = (
  event: any,
  processExpanded: Map<string, boolean>,
  globalConnectionCanvas: any,
  actions: {
    updateEventPosition: (event: any) => void;
    highlightEvent: (ctx: any, event: any, processKey: string, stroke: boolean) => void;
  }
) => {
  if (!event) {
    return;
  }
  const depHighlightKey = event.pid?.toString();
  if (!depHighlightKey || !processExpanded.get(depHighlightKey)) {
    return;
  }
  if (globalConnectionCanvas) {
    const coords = globalConnectionCanvas.getEventCoordinates(event, false);
    if (coords) {
      globalConnectionCanvas.highlightEventNode(event, coords, true);
    }
  } else {
    const depCanvas = document.querySelector(`[data-dep-process-key="${depHighlightKey}"]`);
    if (depCanvas) {
      const depCtx = depCanvas.getContext('2d');
      const dpr = getDevicePixelRatio();
      depCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      actions.updateEventPosition(event);
      actions.highlightEvent(depCtx, event, depHighlightKey, true);
    }
  }
};
