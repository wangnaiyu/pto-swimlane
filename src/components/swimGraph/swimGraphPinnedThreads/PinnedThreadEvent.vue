<!--
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 -->
<template>
  <div 
    ref="canvasContainerRef"
    class="pinned-thread-event-container"
    :style="{ height: containerHeight + 'px' }"
    @click="handleCanvasClick" 
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseenter="handleMouseEnter"
    @keydown="handleKeyDown" 
    @keyup="handleKeyUp"
    tabindex="0"
  >
    <!-- 事件层 -->
    <canvas ref="eventsCanvasRef" class="pinned-events-canvas"></canvas>
    <!-- 依赖层 -->
    <canvas ref="depCanvasRef" class="pinned-dep-canvas"></canvas>
    <!-- UI 层 -->
    <canvas ref="uiCanvasRef" class="pinned-ui-canvas"></canvas>
    <!-- Hover 层 -->
    <canvas ref="hoverCanvasRef" class="pinned-hover-canvas"></canvas>
    <!-- 连接线层 -->
    <canvas ref="lineCanvasRef" class="pinned-line-canvas"></canvas>
    <!-- 临时高亮层 -->
    <canvas ref="tempHighlightRef" class="pinned-highlit-canvas"></canvas>
  </div>
</template>

<script setup>
import {escapeHtml} from '../../../safe-text';
import { ref, inject, onMounted, onUnmounted, watch, computed, provide, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { isEqual, throttle } from 'lodash-es';
import { devicePixelRatio, getThreadHeight, getDevicePixelRatio, 
          formatTimeWithUnit, COLOR_CFG, eventTextSize, getFontStyle, nodeSpaceMin, 
          clearWholeProcess, SNAP_THRESHOLD, NARROW_WIDTH_THRESHOLD, findVisibleEventRange} from '../swimGraphUtils';
import { EventRender, ARROW_WIDTH } from '../swimGraphProcesses/render/eventRender';
import { getEventColor, getNoZoomX } from '../swimGraphProcesses/render/utils';
import { MeatureRender, altClickData, measureState } from '../swimGraphProcesses/render/meatureRender';
import { swimDataManager } from '../swimData';

const { t: $t } = useI18n();

const { userConfig } = inject('swimGraphCfg');
const swimGraphState = inject('swimGraphState');
const { 
  viewState, 
  layout, 
  swimlaneContainer,
  isDarkTheme,
  lane2line,
  childContextMap,
  tooltip,
  tooltipStyle,
  selectedEvent,
  canvasclickedEvent,
  pathLockedEvent,
  isPathLockStatus,
  searchedEvent,
  timelineState,
  highlightedPaths,
  timeLineX,
  detailsPanelExpanded,
  focusedWrapId,
  pathLockedWrapId
} = swimGraphState;

const { 
  flagRender,
  getDisplayName,
  handleWheel,
  selectEvent,
  setMeasureDragHeight,
  transform,
  showPathLockedHighlight
} = inject('swimGraphMethods');

const { pinnedThreadsList, pinnedMeasureInfo } = inject('swimGraphPinnedState');

let colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;

const canvasContainerRef = ref(null);
const eventsCanvasRef = ref(null);
const depCanvasRef = ref(null);
const uiCanvasRef = ref(null);
const hoverCanvasRef = ref(null);
const lineCanvasRef = ref(null);
const tempHighlightRef = ref(null);

let eventsCtx = null;
let depCtx = null;
let uiCtx = null;
let hoverCtx = null;
let lineCtx = null;
let highlightCtx = null;

const eventRenderer = new EventRender({...swimGraphState, colorCfg, userConfig});
const measureRenderer = new MeatureRender({...swimGraphState, colorCfg, userConfig}, $t('lessThan0'));

let hoveredEvent = ref(null);
let mousePosition = { x: 0, y: 0 };
let isPinnedCtrlDragging = false;
let pinnedCtrlDragStartX = 0;

// 计算容器高度
const containerHeight = computed(() => {
  let totalHeight = 0;
  for (const pinnedThread of pinnedThreadsList.value) {
    totalHeight += getThreadHeight(pinnedThread.processKey, pinnedThread.thread.tid, lane2line, layout, pinnedThread.thread.isCounter);
  }
  return totalHeight;
});

// 初始化所有 canvas
const pinnedInitCanvases = () => {
  if (!canvasContainerRef.value || !swimlaneContainer.value) {
    return;
  }
  
  const containerRect = swimlaneContainer.value.getBoundingClientRect();
  const eventWidth = containerRect.width - layout.processLabelWidth -layout.marginRight;
  const height = containerHeight.value;
  
  const canvases = [
    { canvasRef: eventsCanvasRef, ctx: 'eventsCtx' },
    { canvasRef: depCanvasRef, ctx: 'depCtx' },
    { canvasRef: uiCanvasRef, ctx: 'uiCtx' },
    { canvasRef: hoverCanvasRef, ctx: 'hoverCtx' },
    { canvasRef: lineCanvasRef, ctx: 'lineCtx' },
    { canvasRef: tempHighlightRef, ctx: 'highlightCtx' },
  ];
  
  canvases.forEach(({ canvasRef, ctx }) => {
    if (!canvasRef.value) {
      return;
    }
    
    // 设置 canvas 尺寸
    canvasRef.value.width = eventWidth * devicePixelRatio;
    canvasRef.value.height = height * devicePixelRatio;
    canvasRef.value.style.width = eventWidth + 'px';
    canvasRef.value.style.height = height + 'px';
    
    // 获取 context 并设置缩放
    const context = canvasRef.value.getContext('2d');
    context.scale(devicePixelRatio, devicePixelRatio);
    
    // 保存 context 引用
    if (ctx === 'eventsCtx') {
      eventsCtx = context;
    }
    if (ctx === 'depCtx') {
      depCtx = context;
    }
    if (ctx === 'uiCtx') {
      uiCtx = context;
    }
    if (ctx === 'hoverCtx') {
      hoverCtx = context;
    }
    if (ctx === 'lineCtx') {
      lineCtx = context;
    }
    if (ctx === 'highlightCtx') {
      highlightCtx = context;
    }
  });
};

// 清空所有 canvas
const clearCanvases = () => {
  if (!eventsCtx) {
    return;
  }
  
  const eventWidth = eventsCanvasRef.value.offsetWidth;
  const height = containerHeight.value;
  
  eventsCtx.clearRect(0, 0, eventWidth, height);
  depCtx.clearRect(0, 0, eventWidth, height);
  uiCtx.clearRect(0, 0, eventWidth, height);
  hoverCtx.clearRect(0, 0, eventWidth, height);
  lineCtx.clearRect(0, 0, eventWidth, height);
  highlightCtx.clearRect(0, 0, eventWidth, height);
};

const clearEventCanvas = () => {
  if (!eventsCtx) {
    return;
  }
  const eventWidth = eventsCanvasRef.value.offsetWidth;
  const height = containerHeight.value;
  eventsCtx.clearRect(0, 0, eventWidth, height);
  depCtx.clearRect(0, 0, eventWidth, height);
  highlightCtx.clearRect(0, 0, eventWidth, height);
};

// 清空测距画布
const clearPinnedMeasureCanvas = () => {
  hideMeasureInfo();
  if (!uiCtx) {
    return;
  }
  measureRenderer.clearDrawConnector(uiCtx);
  const eventWidth = eventsCanvasRef.value.offsetWidth;
  const height = containerHeight.value;
  uiCtx.clearRect(0, 0, eventWidth, height);
};

// 置顶区缩放
const transformPinned = () => {
  const ctxs = {
    events: eventsCtx,
    ui: uiCtx,
    hover: hoverCtx,
    line: lineCtx,
    highlight: highlightCtx,
  };

  for (const [key, ctx] of Object.entries(ctxs)) {
    if (!ctx) { continue };
    ctx.save();
    ctx.setTransform(viewState.pixelScale, 0, 0, getDevicePixelRatio(), viewState.pixelOffsetX, 0);
  }
  
  clearCanvases();
  pinnedThreadsList.value.forEach(item => {
    const isMixMode = swimGraphState.isMixMode?.value;
    const hasMixConfig = swimDataManager?.hasMixConfig();
    if (isMixMode && hasMixConfig) {
      const [firstId] = item.thread.eventIds;
      const currentWrapId = swimDataManager.getEventById(firstId)?.args?.wrapId;
      if (item.thread.isCounter) {
        childContextMap.threadEvent.drawTransformEvent(item.thread, eventsCtx, true);
      } else if (currentWrapId && (currentWrapId === focusedWrapId.value || currentWrapId === pathLockedWrapId.value) ) {
        drawTransformMixEvent(item.thread, eventsCtx, item.processKey);
      } else {
        childContextMap.threadEvent.drawTransformEvent(item.thread, eventsCtx, true);
      }
    } else {
      childContextMap.threadEvent.drawTransformEvent(item.thread, eventsCtx, true);
    }
  });
  childContextMap.threadEvent.renderProcessText(pinnedThreadsList, eventsCtx, null, true);
  if (!selectedEvent.value && !searchedEvent.value) {
    return;
  }
  changePinnedColor(true);
  highlightPinnedEvent(selectedEvent.value || searchedEvent.value);
  highlightPinnedEvent(canvasclickedEvent.value, true, true, true);
};

// Mix 模式下绘制置顶线程 - 直接使用已有的 drawData
const drawTransformMixEvent = (thread, eventCtx, processKey) => {
  const processInfo = swimDataManager.processInfo.get(processKey);
  if (!processInfo) { return };
  
  let threadInfo = null;
  for (const [key, t] of processInfo.threads.entries()) {
    if (t.tid === thread.tid) {
      threadInfo = t;
      break;
    }
  }
  if (!threadInfo) { return };
  
  const drawDatas = [];
  
  let threadY = 0;
  for (const pinnedThread of pinnedThreadsList.value) {
    if (pinnedThread.thread?.tid === thread.tid) { break };
    const t = pinnedThread.thread;
    const tk = t.isCounter ? t.threadName : t.tid;
    const lc = lane2line.get(`${pinnedThread.processKey}@${tk}`) || 1;
    threadY += layout.threadHeight * lc;
  }
  
  const baseY = threadY - layout.threadHeight / 2;
  const halfEventHeight = layout.eventHeight / 2;
  
  const parentEvents = threadInfo.eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && swimDataManager.isMixParentEvent(e));
  
  for (const parentEvent of parentEvents) {
    const subEvents = swimDataManager.getSubEvents(parentEvent.id);

    const { fillColor, fontColor, strokeColor } = getEventColor(parentEvent, eventRenderer.deps, processKey, false, false);

    for (const subEvent of subEvents) {
      if (!subEvent.drawData) { continue };
      const lineOffset = (subEvent.line || 0) + 1;
      const eventY = baseY + layout.threadHeight * lineOffset - halfEventHeight;
      
      if (subEvent.renderInfo) {
        subEvent.renderInfo.pinnedEventY = eventY;
      }
      
      const pinnedDrawData = {
        ...subEvent.drawData,
        rectY: eventY,
        rectColor: fillColor,
        fontColor,
        strokeColor,
        pinnedEventY: eventY,
        pinnedTextY: eventY * devicePixelRatio + eventTextSize,
      };
      drawDatas.push(pinnedDrawData);
    }
    
    const waitTasks = swimDataManager.getWaitTasks(parentEvent.id);
    for (const waitTask of waitTasks) {
      if (!waitTask.drawData) { continue };
      
      const lineOffset = (waitTask.line || 0) + 1;
      const eventY = baseY + layout.threadHeight * lineOffset - halfEventHeight;
      
      if (waitTask.renderInfo) {
        waitTask.renderInfo.pinnedEventY = eventY;
      }
      
      const pinnedDrawData = {
        ...waitTask.drawData,
        rectY: eventY,
        pinnedEventY: eventY,
        pinnedTextY: eventY * devicePixelRatio + eventTextSize,
      };
      drawDatas.push(pinnedDrawData);
    }
  }
  
  const normalEvents = threadInfo.eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && !swimDataManager.isMixParentEvent(e));
  
  for (const event of normalEvents) {
    if (!event.drawData) { continue };
    
    const lineOffset = (event.line || 0) + 1;
    const eventY = baseY + layout.threadHeight * lineOffset - halfEventHeight;
    
    if (event.renderInfo) {
      event.renderInfo.pinnedEventY = eventY;
    }
    
    const pinnedDrawData = {
      ...event.drawData,
      rectY: eventY,
      pinnedEventY: eventY,
      pinnedTextY: eventY * devicePixelRatio + eventTextSize,
    };
    drawDatas.push(pinnedDrawData);
  }
  
  if (drawDatas.length > 0) {
    eventRenderer.drawEvent(drawDatas, eventCtx, false, true);
    eventRenderer.drawEventText(drawDatas, eventCtx, false, true);
  }
};

const getPinnedEventY = (event, baseY) => {
  const lineOffset = (event.line || 0) + 1;
  return baseY + (layout.threadHeight * lineOffset) - (layout.eventHeight / 2);
};

const createPinnedDrawData = (event, eventY) => {
  if (event.renderInfo) {
    event.renderInfo.pinnedEventY = eventY;
  }
  
  return {
    ...event.drawData,
    rectY: eventY,
    pinnedEventY: eventY,
    pinnedTextY: eventY * devicePixelRatio + eventTextSize,
  };
};

const processSubEventForPinned = (baseY, isDimmed, drawDatas, processKey, parentEvent) => {
  const subEvents = swimDataManager.getSubEvents(parentEvent.id);
  for (const subEvent of subEvents) {
    if (!subEvent.drawData) { return };
    
    const eventY = getPinnedEventY(subEvent, baseY);
  
    if (subEvent.renderInfo) {
      subEvent.renderInfo.pinnedEventY = eventY;
    }
    
    if (!isDimmed) {
      const eventToColor = parentEvent || subEvent;
      const { fillColor, fontColor, strokeColor } = getEventColor(eventToColor, eventRenderer.deps, processKey, false, false);
      subEvent.drawData.rectColor = fillColor;
      subEvent.drawData.strokeColor = strokeColor;
      subEvent.drawData.fontColor = fontColor;
    }
    
    drawDatas.push(createPinnedDrawData(subEvent, eventY));
  }
};

const processWaitTaskForPinned = (waitTask, baseY, drawDatas) => {
  if (!waitTask.drawData) { return };
  
  const eventY = getPinnedEventY(waitTask, baseY);
  
  if (waitTask.renderInfo) {
    waitTask.renderInfo.pinnedEventY = eventY;
  }
  
  drawDatas.push(createPinnedDrawData(waitTask, eventY));
};

const processMixParentEventForPinned = (parentEvent, baseY, isDimmed, drawDatas, processKey) => {
  processSubEventForPinned(baseY, isDimmed, drawDatas, processKey, parentEvent);
  
  const waitTasks = swimDataManager.getWaitTasks(parentEvent.id);
  for (const waitTask of waitTasks) {
    processWaitTaskForPinned(waitTask, baseY, drawDatas);
  }
};

const processNormalEventForPinned = (event, baseY, isDimmed, drawDatas, processKey) => {
  if (!event.renderInfo) { return };
  
  if (event.renderEndTime < timelineState.startTime || event.renderStartTime > timelineState.endTime) {
    event.drawData.show = false;
    event.drawData.text = '';
    return;
  }
  
  event.drawData.show = true;
  
  if (!isDimmed) {
    const { fillColor, fontColor, strokeColor } = getEventColor(event, eventRenderer.deps, processKey, false, false);
    event.drawData.rectColor = fillColor;
    event.drawData.strokeColor = strokeColor;
    event.drawData.fontColor = fontColor;
  }
  
  const eventY = getPinnedEventY(event, baseY);
  const pinnedDrawData = createPinnedDrawData(event, eventY);
  const isAicpuProcess = Array.from(swimDataManager.getAllProcesses().entries()).some(([key, value]) => value.type === 'aicpu' && key === processKey);
  pinnedDrawData.width = pinnedDrawData.eventWidth;
  childContextMap.threadEvent.fillTextInfo(event, eventsCtx, pinnedDrawData, true, isAicpuProcess);
  drawDatas.push(pinnedDrawData);
};

const processMixModePinnedThread = (thread, processKey, baseY, isDimmed, drawDatas) => {
  const processInfo = swimDataManager.processInfo.get(processKey);
  if (!processInfo) { return };
  
  for (const [threadKey, tInfo] of processInfo.threads.entries()) {
    if (tInfo.tid !== thread.tid) { continue };
    
    for (const eventId of tInfo.eventIds) {
      const event = swimDataManager.getEventById(eventId);
      if (!event) { continue };
      
      const isMixParent = swimDataManager.isMixParentEvent(event);
      const isOnPath = highlightedPaths.has(eventId) || 
                      (event.parentEventId && highlightedPaths.has(event.parentEventId));
      const adjustedIsDimmed = isOnPath ? false : isDimmed;
      if (isMixParent) {
        processMixParentEventForPinned(event, baseY, adjustedIsDimmed, drawDatas, processKey);
      } else {
        processNormalEventForPinned(event, baseY, adjustedIsDimmed, drawDatas, processKey);
      }
    }
  }
};

const processNormalModePinnedThread = (thread, processKey, baseY, isDimmed, drawDatas) => {
  const isAicpuProcess = Array.from(swimDataManager.getAllProcesses().entries()).some(([key, value]) => value.type === 'aicpu' && key === processKey);
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event.renderInfo) { continue };

    event.drawData.show = true;

    const { fillColor, fontColor } = getEventColor(event, eventRenderer.deps, processKey, false, false);
    event.drawData.rectColor = fillColor;
    event.drawData.strokeColor = '';
    event.drawData.fontColor = fontColor;

    const eventY = getPinnedEventY(event, baseY);
    const pinnedDrawData = createPinnedDrawData(event, eventY);
    pinnedDrawData.width = pinnedDrawData.eventWidth;
    childContextMap.threadEvent.fillTextInfo(event, eventsCtx, pinnedDrawData, true, isAicpuProcess);
    drawDatas.push(pinnedDrawData);
  }
};

const changePinnedColor = (isDimmed) => {
  clearEventCanvas();
  const drawDatas = [];
  if (eventsCtx) {
    eventsCtx.font = getFontStyle(eventTextSize);
  }
  
  const isMixModeValue = swimGraphState.isMixMode?.value;
  const hasMixConfig = swimDataManager?.hasMixConfig();
  
  let threadY = 0;
  
  for (const pinnedThread of pinnedThreadsList.value) {
    const { thread, processKey } = pinnedThread;
    
    const t = thread;
    const tk = t.isCounter ? t.threadName : t.tid;
    const lc = lane2line.get(`${processKey}@${tk}`) || 1;
    
    const baseY = threadY - layout.threadHeight / 2;
    
    if (thread.isCounter) {
      childContextMap.threadEvent.drawTransformEvent(thread, eventsCtx, true);
    } else {
      const [firstId] = thread.eventIds;
      const currentWrapId = swimDataManager.getEventById(firstId)?.args?.wrapId;
      const isFocusedWrapInMixMode = currentWrapId && (currentWrapId === focusedWrapId.value || currentWrapId === pathLockedWrapId.value);
      if (isMixModeValue && hasMixConfig && isFocusedWrapInMixMode) {
        processMixModePinnedThread(thread, processKey, baseY, isDimmed, drawDatas);
      } else {
        processNormalModePinnedThread(thread, processKey, baseY, isDimmed, drawDatas);
      }
    }
    
    threadY += layout.threadHeight * lc;
  }
  eventRenderer.drawEvent(drawDatas, eventsCtx, false, true);
  eventRenderer.drawEventText(drawDatas, eventsCtx, false, true);
};

const highlightPinnedEvent = (event, stroke=true, highlight=true, isTemp=false) => {
  if (!event || !event.renderInfo) {
    return;
  }
  const ctx = isTemp ? highlightCtx : depCtx;
  if (isTemp) {
    const eventWidth = eventsCanvasRef.value.offsetWidth;
    const height = containerHeight.value;
    ctx.clearRect(0, 0, eventWidth, height);
  }
  let threadPinned = false;
  for (const pinnedThread of pinnedThreadsList.value) {
    const { processKey, threadKey, thread } = pinnedThread;
    if (thread.isCounter) {
      continue;
    }
    if (processKey.toString() === event.pid.toString() && threadKey.toString() === event.threadKey) {
     threadPinned = true;
     break; 
    }
  }
  if (!threadPinned) {
    return;
  }
  const { renderInfo } = event;
  const { processKey, width } = renderInfo;
  const { fillColor, fontColor } = getEventColor(event, eventRenderer.deps, processKey, highlight, stroke);
  const drawData = {
    rectX: renderInfo.x,
    rectY: renderInfo.pinnedEventY,
    pinnedEventY: renderInfo.pinnedEventY,
    eventWidth: width,
    height: renderInfo.height,
    rectColor: fillColor,
    strokeColor: '',
    text: '',
    textX: 0,
    textY: 0,
    fontColor,
    show: true,
    duration: event.duration ?? (event.endTime - event.startTime),
  };
  eventRenderer.drawEvent([drawData], ctx, false, true);
  ctx.font = getFontStyle(eventTextSize);
  const isAicpuProcess = Array.from(swimDataManager.getAllProcesses().entries()).some(([key, value]) => value.type === 'aicpu' && key === processKey);
  drawData.width = width;
  childContextMap.threadEvent.fillTextInfo(event, ctx, drawData, true, isAicpuProcess);
  if (!drawData.text) { return };
  eventRenderer.drawEventText([drawData], ctx, false, true);
};

// 渲染置顶线程事件
const pinnedRender = () => {
  if (!eventsCtx) {
    return;
  }
  clearCanvases();

  // 实现渲染逻辑
  let threadY = 0;
  pinnedThreadsList.value.forEach(item => {
    childContextMap.threadEvent.renderProcessPinEvents(item.thread, eventsCtx, threadY, item.processKey);
    const threadKey = item.thread.isCounter ? item.thread.threadName : item.thread.tid;
    const lineCount = lane2line.get(`${item.processKey}@${threadKey}`) || 1;
    threadY += layout.threadHeight * lineCount;
  });
  
  childContextMap.threadEvent.renderProcessText(pinnedThreadsList, eventsCtx, null, true);
  flagRender();
};

const drawPinnedThreadEventline = (x, color, flag) => {
  const devicePixelRatioVlaue = devicePixelRatio !== undefined ? devicePixelRatio : 1;
  const drawX = x * devicePixelRatioVlaue;
  const height = containerHeight.value * devicePixelRatioVlaue;
  let ctx = lineCtx;
  if (flag === 'over') {
    ctx = hoverCtx;
  }
  eventRenderer.drawFlagLine(ctx, color, drawX, height);
};

const erasePinnedThreadEventline = (flag) => {
  let ctx = lineCtx;
  if (flag === 'over') {
    ctx = hoverCtx;
  }
  const eventWidth = eventsCanvasRef.value.offsetWidth;
  const height = containerHeight.value;
  ctx.clearRect(0, 0, eventWidth, height);
};

const handleCanvasClick = (e) => {
  if (!canvasContainerRef.value) {
    return;
  }
  mousePosition = { x: e.clientX, y: e.clientY };
  const localPosition = computeLocalXY(canvasContainerRef.value, mousePosition);
  const { event } = findEventAtPosition(localPosition.x, localPosition.y);
  if (event) {
    canvasclickedEvent.value = event;
    
    if (e.altKey) {
      // 测距模式
      highlightEvent(uiCtx, event);
      measureRenderer.handleDistanceMeasurement(uiCtx, event, event.renderInfo?.processKey || event.pid.toString(), false, true);
      // 如果需要在上方显示测距信息
      if (!altClickData.largeSpacing && pinnedThreadsList.value.length === 1) {
        const rect = measureRenderer.calculateRect(altClickData.largeSpacing, true);
        showMeasureInfo(rect);
      }
    } else {
      // 普通点击 - 选择事件
      measureState.isMeasureFirst = false;
      measureState.isMeasureFixed = false;
      const processKey = event.renderInfo?.processKey || event.pid.toString();
      selectEvent(event, processKey);
    }
  } else {
    canvasclickedEvent.value = null;
    measureState.isMeasureFirst = false;
    measureState.isMeasureFixed = false;
    
    // 清除测距数据
    altClickData.preData = null;
    altClickData.lastData = null;
    altClickData.largeSpacing = false;

    const canvasWidth = uiCanvasRef.value?.width || 0;
    const canvasHeight = uiCanvasRef.value?.height || 0;
    uiCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const depWidth = depCanvasRef.value?.width || 0;
    const depHeight = depCanvasRef.value?.height || 0;
    depCtx.clearRect(0, 0, depWidth, depHeight);

    hideMeasureInfo();
  }
};

const highlightEvent = (ctx, event, stroke=true, highlight=true) => {
  if (!event || !event.renderInfo) {
    return;
  }
  const processKey = event.renderInfo?.processKey || event.pid.toString();
  const { renderInfo } = event;
  const { fillColor, fontColor } = getEventColor(event, eventRenderer.deps, processKey, highlight, stroke);
  const { width, pinnedEventY, x, height } = renderInfo;
  const drawData = {
    rectX: x, rectY: pinnedEventY,
    rectPixelX: x * devicePixelRatio, rectPixelY: pinnedEventY * devicePixelRatio,
    eventWidth: width, height,
    rectColor: fillColor, strokeColor: '', text: '', textX: 0, textY: 0,
    fontColor, show: true,
    duration: event.duration ?? (event.endTime - event.startTime),
  };
  eventRenderer.drawEvent([drawData], ctx);
  ctx.font = getFontStyle(eventTextSize);
  const isAicpuProcess = Array.from(swimDataManager.getAllProcesses().entries()).some(([key, value]) => value.type === 'aicpu' && key === processKey);
  drawData.width = width;
  childContextMap.threadEvent.fillTextInfo(event, ctx, drawData, true, isAicpuProcess);
  if (!drawData.text) { return };
  eventRenderer.drawEventText([drawData], ctx);
};

// 获取线程信息
const getThreadInfoByTid = (processKey, tid) => {
  const processInfo = swimDataManager.processInfo.get(processKey);
  if (!processInfo) { return null };
  
  for (const [key, t] of processInfo.threads.entries()) {
    if (t.tid === tid) { return t };
  }
  return null;
};

// Mix 模式下查找事件
const getEventPinnedY = (event, threadY) => {
  return event.renderInfo.pinnedEventY || threadY + (layout.threadHeight / 2) - (layout.eventHeight / 2);
};

const isEventInYRange = (y, pinnedEventY, eventHeight) => {
  return y >= pinnedEventY && y <= pinnedEventY + eventHeight;
};

const isEventInXRange = (x, eventX, eventWidth, duration, scale = 1) => {
  if (duration === 0) {
    const halfArrowWidth = (ARROW_WIDTH / 2) / scale;
    const centerX = eventX + (eventWidth / 2);
    return x >= centerX - halfArrowWidth && x <= centerX + halfArrowWidth;
  }
  return x >= eventX && x <= eventX + eventWidth;
};

const collectEventsOnLane = (threadInfo, threadY, x, y) => {
  const allEvents = [];
  let matchedEvent = null;
  
  for (const eventId of threadInfo.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event) { continue };
    
    const isParent = swimDataManager.isMixParentEvent(event);
    
    if (isParent) {
      const subEvents = swimDataManager.getSubEvents(event.id);
      
      for (const subEvent of subEvents) {
        if (!subEvent.renderInfo) { continue };
        
        const { x: subX, width: subWidth, height: subHeight } = subEvent.renderInfo;
        const subDuration = subEvent.duration ?? (subEvent.endTime - subEvent.startTime);
        const subPinnedY = getEventPinnedY(subEvent, threadY);
        if (!isEventInYRange(y, subPinnedY, subHeight)) { continue };
        if (!matchedEvent && isEventInXRange(x, subX, subWidth, subDuration, viewState.scale)) {
          matchedEvent = subEvent;
        }
        allEvents.push({ event: subEvent, eventX: subX, eventWidth: subWidth });
      }
      
      const waitTasks = swimDataManager.getWaitTasks(event.id);
      for (const waitTask of waitTasks) {
        if (!waitTask.renderInfo) { continue };
        
        const { x: waitX, width: waitWidth, height: waitHeight } = waitTask.renderInfo;
        const waitDuration = waitTask.duration ?? (waitTask.endTime - waitTask.startTime);
        const waitPinnedY = getEventPinnedY(waitTask, threadY);
        
        if (isEventInYRange(y, waitPinnedY, waitHeight) && (!matchedEvent && isEventInXRange(x, waitX, waitWidth, waitDuration, viewState.scale))) {
          matchedEvent = waitTask;
        }
      }
    } else {
      if (!event.renderInfo) { continue };
      
      const { x: eventX, width: eventWidth, height: eventHeight } = event.renderInfo;
      const eventDuration = event.duration ?? (event.endTime - event.startTime);
      const pinnedEventY = getEventPinnedY(event, threadY);
      
      if (isEventInYRange(y, pinnedEventY, eventHeight)) {
        if (!matchedEvent && isEventInXRange(x, eventX, eventWidth, eventDuration, viewState.scale)) {
          matchedEvent = event;
        }
        allEvents.push({ event, eventX, eventWidth });
      }
    }
  }
  
  if (matchedEvent) {
    return { event: matchedEvent, autoMeasureData: null };
  }
  
  return { event: null, autoMeasureData: allEvents };
};

const checkAutoMeasure = (allEvents, x) => {
  if (allEvents.length < 2) { return null };
  
  allEvents.sort((a, b) => a.eventX - b.eventX);
  
  for (let i = 0; i < allEvents.length - 1; i++) {
    const { event, eventX, eventWidth } = allEvents[i];
    const { event: nextEvent, eventX: nextEventX } = allEvents[i + 1];
    
    if (x >= eventX + eventWidth && x <= nextEventX) {
      const nodeSpacingX = nextEventX - (eventX + eventWidth);
      return {
        event: null,
        mData: {
          preData: event,
          lastData: nextEvent,
          nodeSpacingX,
        },
      };
    }
  }
  
  return null;
};

const findMixEventAtPosition = (x, y, threadInfo, threadY) => {
  const { event, autoMeasureData } = collectEventsOnLane(threadInfo, threadY, x, y);
  
  if (event) {
    return { event };
  }
  
  if (autoMeasureData && autoMeasureData.length >= 2) {
    return checkAutoMeasure(autoMeasureData, x);
  }
  
  return null;
};

// 非 Mix 模式下查找事件
const findNormalEventAtPosition = (x, y, thread) => {
  for (const [index, eventId] of thread.eventIds.entries()) {
    const event = swimDataManager.getEventById(eventId);
    if (!event.renderInfo) {
      continue;
    }
    
    const eventX = event.renderInfo.x;
    const eventY = event.renderInfo.pinnedEventY;
    const eventWidth = event.drawData?.eventWidth || 0;
    const eventHeight = event.renderInfo.height || layout.eventHeight;
    const duration = event.duration ?? (event.endTime - event.startTime);
    
    const validateY = y >= eventY && y <= eventY + eventHeight;
    if (!validateY) { continue };

    const validateX = isEventInXRange(x, eventX, eventWidth, duration, viewState.scale);
    if (validateX) {
      return { event, mData: {} };
    }
    
    const { pixelScale } = viewState;
    const isNarrow = eventWidth * pixelScale <= NARROW_WIDTH_THRESHOLD;
    if (isNarrow && event.renderEndTime >= timelineState.startTime && event.renderStartTime <= timelineState.endTime) {
      const snapThresholdInTime = SNAP_THRESHOLD / pixelScale;
      const eventRange = [eventX - snapThresholdInTime, eventX + eventWidth];
      if (x >= eventRange[0] && x <= eventRange[1]) {
        return { event, mData: {} };
      }
    }
    if (!thread.eventIds[index + 1]) { continue };
    const nextEvent = swimDataManager.getEventById(thread.eventIds[index + 1]);
    
    const { x: nextEventX } = nextEvent.renderInfo;
    if (x >= eventX + eventWidth && x <= nextEventX) {
      return {
        event: null,
        mData: {
          preData: event,
          lastData: nextEvent,
          nodeSpacingX: nextEventX - (eventX + eventWidth),
        },
      };
    }
  }
  return null;
};

const findEventAtPosition = (x, y) => {
  let processObj = {
    event: null,
    mData: {
      preData: null,
      lastData: null,
      nodeSpacingX: 0,
    },
  };
  
  const isMixMode = swimGraphState.isMixMode?.value;
  const hasMixConfig = swimDataManager?.hasMixConfig();
  
  let threadY = 0;
  
  for (const pinnedThread of pinnedThreadsList.value) {
    const { thread, processKey } = pinnedThread;
    const threadKey = thread.isCounter ? thread.threadName : thread.tid;
    const lineCount = lane2line.get(`${processKey}@${threadKey}`) || 1;
    const threadHeight = layout.threadHeight * lineCount;
    let result = null;
    if (y >= threadY && y <= threadY + threadHeight) {
      if (isMixMode && hasMixConfig) {
        const threadInfo = getThreadInfoByTid(processKey, thread.tid);
        if (!threadInfo) { continue };
        result = findMixEventAtPosition(x, y, threadInfo, threadY);
      } else {
        result = findNormalEventAtPosition(x, y, thread);
      }
      if (result && result.event) {
        processObj.event = result.event;
        return processObj;
      }
      if (result && result.mData) {
        processObj.mData = result.mData;
        return processObj;
      }
    }
    
    threadY += threadHeight;
  }
  
  return processObj;
};

const drawHoverHighlight = (event, ctx) => {
  if (!ctx) { return };
  
  ctx.clearRect(0, 0, eventsCanvasRef.value.offsetWidth, containerHeight.value);
  
  if (!event || !event.renderInfo) { return };
  
  const processKey = String(event.pid);
  const thread = pinnedThreadsList.value.find(p => p.processKey == processKey)?.thread;
  if (!thread) { return };
  const { renderInfo } = event;
  const { width, pinnedEventY } = renderInfo;
  
  // 特殊处理 Wait 节点和 SubEvent 的颜色
  let fillColor = '';
  let fontColor = '';
  
  if (event.name === 'Wait') {
    // Wait 节点使用灰色高亮
    fillColor = colorCfg.eventRectNoColorHighlight;
    fontColor = colorCfg.eventFontHighLight;
  } else if (event.parentEventId) {
    // SubEvent 使用父节点的颜色
    const parentEvent = swimDataManager.getEventById(event.parentEventId);
    if (parentEvent) {
      const colors = getEventColor(parentEvent, {...swimGraphState, userConfig, colorCfg}, processKey, true, true);
      ({ fillColor, fontColor } = colors);
    }
  } else {
    // 普通事件
    const colors = getEventColor(event, {...swimGraphState, userConfig, colorCfg}, processKey, true, true);
    ({ fillColor, fontColor } = colors);
  }
  
  const drawData = {
    rectX: renderInfo.x, 
    rectY: pinnedEventY,
    pinnedEventY,
    rectPixelX: renderInfo.x * devicePixelRatio, 
    rectPixelY: pinnedEventY * devicePixelRatio,
    eventWidth: width, 
    height: renderInfo.height,
    rectColor: fillColor, 
    strokeColor: '', 
    text: '', 
    textX: 0, 
    textY: 0,
    fontColor, 
    show: true,
    duration: event.duration ?? (event.endTime - event.startTime),
  };
  
  eventRenderer.drawEvent([drawData], ctx, false, true);
  
  const { scale, offsetX, canvasCssWidth } = viewState;
  const absOffsetX = Math.abs(offsetX);
  
  const rectStartX = drawData.rectX * scale;
  const rectEndX = rectStartX + (drawData.eventWidth * scale);
  
  const visibleStartX = Math.max(rectStartX, absOffsetX);
  const visibleEndX = Math.min(rectEndX, absOffsetX + canvasCssWidth);
  const actualWidth = Math.max(0, visibleEndX - visibleStartX);
  
  if (actualWidth >= 15) {
    const actualPixWidth = actualWidth * devicePixelRatio;
    const displayName = event.isCounter ? event.displayName : getDisplayName(event);
    
    ctx.font = getFontStyle(eventTextSize);
    let textWidth = ctx.measureText(displayName).width;
    
    let displayText = '';
    if (textWidth > actualPixWidth) {
      const widthPerChar = textWidth / displayName.length;
      let maxCharsToFit = Math.floor(actualPixWidth / widthPerChar);
      if (maxCharsToFit > 3) {
        maxCharsToFit -= 3;
        displayText = displayName.substr(0, maxCharsToFit) + '...';
        textWidth = widthPerChar * displayText.length;
      } else {
        displayText = '';
      }
    } else {
      displayText = displayName;
    }
    
    if (displayText) {
      const visibleRectXOnScreen = visibleStartX - absOffsetX;
      const textStartX = (visibleRectXOnScreen * devicePixelRatio) + ((actualPixWidth - textWidth) / 2);
      const textY = ( pinnedEventY * devicePixelRatio) + eventTextSize;
      
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = fontColor;
      ctx.fillText(displayText, textStartX, textY);
      ctx.restore();
    }
  }
};

const showTooltip = (e, event) => {
  if (!tooltip.value) {
    return;
  }
  
  const startTime = event.startTime || event.drawData?.startTime;
  const endTime = event.endTime || event.drawData?.endTime;
  const duration = event.duration || (endTime && startTime ? endTime - startTime : 0);
  
  if (!startTime) {
    return;
  }
  
  const displayName = event.isCounter ? event.displayName : (getDisplayName(event) || event.name || 'Event');
  let tooltipContent = `<div class="tooltip-container">`;
  tooltipContent += `<div class="tooltip-item"><span class="tooltip-key">${$t('title')}</span><span class="tooltip-value">${escapeHtml(displayName)}</span></div>`;
  tooltipContent += `<div class="tooltip-item"><span class="tooltip-key">${$t('start')}</span><span class="tooltip-value">${formatTimeWithUnit(startTime - viewState.minTime).value}${formatTimeWithUnit(startTime - viewState.minTime).unit}</span></div>`;
  if (event.isCounter) {
    tooltipContent += `<div class="tooltip-item"><span class="tooltip-key">${$t('countValue')}</span><span class="tooltip-value">${escapeHtml(event.counterSize)}</span></div>`;
  } else {
    tooltipContent += `<div class="tooltip-item"><span class="tooltip-key">${$t('duration')}</span><span class="tooltip-value">${formatTimeWithUnit(duration).value}${formatTimeWithUnit(duration).unit}</span></div>`;
  }
  tooltipContent += '</div>';
  
  tooltip.value.innerHTML = tooltipContent;
  tooltipStyle.display = 'block';
  
  const canvasCSSWidth = viewState.canvasCssWidth;
  if (e.clientX + 200 > canvasCSSWidth) {
    tooltipStyle.left = (e.clientX - 100) + 'px';
  } else {
    tooltipStyle.left = (e.clientX + 10) + 'px';
  }
  tooltipStyle.top = (e.clientY + 10) + 'px';
};

const hideTooltip = () => {
  tooltipStyle.display = 'none';
};

const computeLocalXY = (canvasRef, mousePos) => {
  const rect = canvasRef.getBoundingClientRect();
  const x = (mousePos.x - rect.left - viewState.offsetX) / viewState.scale;
  const y = mousePos.y - rect.top;
  return { x, y };
};

const handleTooltipAndCursor = (e, event) => {
  let cursor = '';
  const isNoModifierKey = !e.altKey && !e.ctrlKey;
  const isUnlock = !isPathLockStatus.value;
  if (event && isNoModifierKey && isUnlock) {
    showTooltip(e, event);
    cursor = 'pointer';
  } else {
    hideTooltip();
  }
  return cursor;
};

const updateCursorState = (e, event) => {
  const cursor = handleTooltipAndCursor(e, event) || '';
  canvasContainerRef.value.style.cursor = cursor;
};

const handlePureMove = (mData, event) => {
  const { preData, lastData, nodeSpacingX } = mData || {};
  if (event !== hoveredEvent.value) {
    hoveredEvent.value = event;
    drawHoverHighlight(event, hoverCtx);
  }
  const validateMData = preData && lastData && nodeSpacingX;
  if (validateMData && !measureState.isMeasureFixed) {
    maybeDrawConnectorPreview(preData, lastData, nodeSpacingX); // 自动测距
  }
};

function maybeDrawConnectorPreview(preData, lastData, nodeSpacingX) {
  const scrollWidth = 0;
  const actSpacingX = nodeSpacingX * viewState.pixelScale;
  if (actSpacingX <= 3) { 
    return;
  }
  const { canvasWidth } = viewState;
  const noZoomLastX = getNoZoomX(lastData?.renderInfo?.x, viewState);
  const noZoomPreX = getNoZoomX(preData?.renderInfo?.x, viewState) + (preData?.renderInfo?.width * viewState.pixelScale);
  if (noZoomLastX < (canvasWidth - scrollWidth) && noZoomPreX > 0 ) {
    altClickData.preData = preData;
    altClickData.lastData = lastData;
    altClickData.largeSpacing = actSpacingX > nodeSpaceMin;
    measureRenderer.drawConnector(uiCtx, altClickData.largeSpacing, true);
    // 如果需要在上方显示测距信息
    if (!altClickData.largeSpacing && pinnedThreadsList.value.length === 1) {
      const rect = measureRenderer.calculateRect(altClickData.largeSpacing, true);
      showMeasureInfo(rect);
    }
  }
}

const showMeasureInfo = (rect) => {
  if (!canvasContainerRef.value) {
    return;
  }
  const containerRect = canvasContainerRef.value.getBoundingClientRect();
  pinnedMeasureInfo.show = true;
  pinnedMeasureInfo.x = containerRect.left + (rect.x / devicePixelRatio);
  pinnedMeasureInfo.y = 98;
  pinnedMeasureInfo.text = rect.text;
};

const hideMeasureInfo = () => {
  pinnedMeasureInfo.show = false;
};

const handleMouseMove = throttle((e) => {
  if (!canvasContainerRef.value) {
    return;
  }
  
  if (e.ctrlKey && e.buttons === 1 && isPinnedCtrlDragging) {
    handleCtrlDrag(e);
    return;
  }
  
  mousePosition = { x: e.clientX, y: e.clientY };
  const localPosition = computeLocalXY(canvasContainerRef.value, mousePosition);
  const { event, mData } = findEventAtPosition(localPosition.x, localPosition.y);
  const validateClickData = altClickData.preData && altClickData.lastData;
  if (validateClickData && !e.altKey && !measureState.isMeasureFixed) {
    clearPinnedMeasureCanvas();
  }
  if (e.altKey) {
    handleAltMove(e, event);
  } else if (e.ctrlKey) {
    dispatchEventToFirstEventsCanvas('mousemove', e);
  } else {
    handlePureMove(mData, event);
  }
  
  updateCursorState(e, event);
}, 80);

const handleCtrlDrag = (e) => {
  if (viewState.scale === 1) {
      return;
    }
    const timeLineEndX = Math.abs(timeLineX.value);
    const deltaX = e.clientX - pinnedCtrlDragStartX;
    const cssWidth = viewState.canvasCssWidth;
    if (deltaX < 0 && cssWidth > timeLineEndX) {
      return;
    }
    canvasContainerRef.value.style.cursor = 'grab';
    viewState.offsetX += childContextMap.threadEvent.getOffset(deltaX, viewState.scale);
    if (deltaX > 0 && viewState.offsetX > 0) {
      viewState.offsetX = 0;
    }
    viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
    transform();
    pinnedCtrlDragStartX = e.clientX;
};

const handleAltMove = (e, event) => {
  handleAltMeasureHoverBranch(e, event);
};

function handleAltMeasureHoverBranch(e, event) {
  const manual = altClickData.preData && measureState.isMeasureFirst && !measureState.isMeasureFixed;
  if (!(event && e.altKey && manual)) {
    return false;
  }
  if (measureState.isMeasureChange && altClickData.lastData) {
    let temp = altClickData.preData;
    altClickData.preData = altClickData.lastData;
    altClickData.lastData = temp;
    measureState.isMeasureChange = false;
  }
  if (isEqual(altClickData.preData, event)) {
    return true; // consumed
  }
  altClickData.lastData = event;
  measureRenderer.clearDrawConnectorHover(uiCtx, event.renderInfo?.processKey || event.pid.toString(), true);
  measureRenderer.measureDistanceHover(uiCtx, true);
  return false;
}

const handleMouseLeave = () => {
  hoveredEvent.value = null;
  drawHoverHighlight(null, hoverCtx);
  hideTooltip();
};

const getFirstEventsCanvas = () => {
  const canvas = document.querySelector('.events-canvas');
  return canvas;
};

const dispatchEventToFirstEventsCanvas = (eventType, event) => {
  const canvas = getFirstEventsCanvas();
  if (!canvas || event.altKey) {
    return;
  }
  
  const pinnedRect = canvasContainerRef.value.getBoundingClientRect();
  const targetRect = canvas.getBoundingClientRect();
  
  const relativeX = event.clientX - pinnedRect.left;
  
  const newEvent = new MouseEvent(eventType, {
    clientX: targetRect.left + relativeX,
    clientY: 10,  // mock 位置纵坐标为固定值，防止置顶泳道y坐标比分配的canvas长度大
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    buttons: event.buttons,
    deltaY: event.deltaY,
    deltaX: event.deltaX,
    bubbles: true,
    cancelable: true
  });
  
  canvas.dispatchEvent(newEvent);
};

const handleMouseDown = (e) => {
  if (!canvasContainerRef.value || e.altKey) {
    return;
  }
  if (e.ctrlKey && e.buttons === 1) {
    isPinnedCtrlDragging = true;
    pinnedCtrlDragStartX = e.clientX;
    return;
  }
  
  mousePosition = { x: e.clientX, y: e.clientY };
  const localPosition = computeLocalXY(canvasContainerRef.value, mousePosition);
  const { event } = findEventAtPosition(localPosition.x, localPosition.y);
  canvasclickedEvent.value = event;
  if (event) {
    if (isPathLockStatus.value) {
      detailsPanelExpanded.value = true;
      drawHoverHighlight(event, highlightCtx);
      showPathLockedHighlight(event, event.renderInfo?.processKey || event.pid.toString());
      return;
    }
    selectEvent(event, event.renderInfo?.processKey || event.pid.toString());
    pathLockedEvent.value = event;
  } else if (!isPathLockStatus.value) {
    highlightedPaths.clear();
    for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
      if (process.isRendered) {
        selectEvent(null, processKey);
      } 
    }
  }
};

const handleMouseUp = (e) => {
  if (isPinnedCtrlDragging) {
    isPinnedCtrlDragging = false;
    return;
  }
  dispatchEventToFirstEventsCanvas('mouseup', e);
};

const handleMouseEnter = (e) => {
  canvasContainerRef.value?.focus();
};

const handleKeyDown = (e) => { 
  dispatchKeyEventToFirstEventsCanvas('keydown', e); 
  e.stopPropagation();
}; 
 
const handleKeyUp = (e) => { 
  dispatchKeyEventToFirstEventsCanvas('keyup', e); 
  e.stopPropagation();
};

const dispatchKeyEventToFirstEventsCanvas = (eventType, event) => { 
  const canvas = getFirstEventsCanvas(); 
  if (!canvas) { 
    return; 
  } 
  
  const targetRect = canvas.getBoundingClientRect(); 
  
  const mouseMoveEvent = new MouseEvent('mousemove', { 
    clientX: mousePosition.x, 
    clientY: 10 + targetRect.top, 
    bubbles: true, 
    cancelable: true 
  }); 
  
  canvas.dispatchEvent(mouseMoveEvent); 
  
  const newEvent = new KeyboardEvent(eventType, { 
    key: event.key, 
    code: event.code, 
    keyCode: event.keyCode, 
    ctrlKey: event.ctrlKey, 
    altKey: event.altKey, 
    shiftKey: event.shiftKey, 
    metaKey: event.metaKey, 
    bubbles: true, 
    cancelable: true 
  }); 
  
  canvas.dispatchEvent(newEvent); 
  if (eventType === 'keyup') { 
    const mouseLeaveEvent = new MouseEvent('mouseleave', { 
      bubbles: true, 
      cancelable: true 
    }); 
    
    canvas.dispatchEvent(mouseLeaveEvent); 
  } 
};

onMounted(() => {
  pinnedInitCanvases();
  pinnedRender();
});

// 监听容器高度变化，重新初始化canvas
watch(containerHeight, () => {
  pinnedInitCanvases();
  pinnedRender();
  setMeasureDragHeight();
});

onUnmounted(() => {
  // 清理资源
});

defineExpose ({
  transformPinned,
  drawPinnedThreadEventline,
  erasePinnedThreadEventline,
  pinnedInitCanvases,
  pinnedRender,
  changePinnedColor,
  highlightPinnedEvent,
});

</script>

<style scoped>
.pinned-measure-info {
  position: absolute;
}
.pinned-thread-event-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: none;
}

.pinned-thread-event-container:focus {
  outline: none;
}

.pinned-thread-event-container canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
