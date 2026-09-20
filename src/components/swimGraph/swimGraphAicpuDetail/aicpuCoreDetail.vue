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
  <div>
    <div class="core-details" :class="{ expanded: aicpuCoreDetailsExpanded }">
      <div class="core-details-content">
        <!-- 详情页面具体内容 -->
        <aicpu-detail-content />
        <div class="relevent"
             ref="releventRef"
             @mousedown="startDragScroll"
             @mousemove="handleDragScroll"
             @mouseup="endDragScroll"
             @mouseleave="endDragScroll">
          <div class="relevent-title">Relevent</div>
          <div class="relevent-content" v-if="aicpuHasRelevent">
            <div class="build-content" v-if="aicpuBuildTask">
              <div class="title">AICPU_DEV_TASK</div>
              <div class="content" :style="{...dynamicWidthStyle(aicpuBuildTask), width:'auto'}">{{ getEventDisplayName(aicpuBuildTask) }}</div>
            </div>
            <gradientDashedLine v-if="aicpuBuildTask" :left-color="buildTaskColor" :right-color="stopColor" />
            <div class="sched-content">
              <div class="title">Schedule NO.</div>
              <div class="sched"> {{ aicpuSchedTask }} </div>
            </div>
            <gradientDashedLine :left-color="stopColor" :right-color="stopColor" />
            <div class="current-content">
              <div class="title current canvas-title">Current</div>
              <div class="sched"> 
                <div class="detail-canvas-container">
                  <div class="detail-canvas-left-container" ref="containerRef"> 
                    <div class="thread-name-font node-item source-node" ref="sourceRef">{{ kernalDisplayName }}</div>
                    <div class="mt10 ml12 event-name-font node-item target-node"  ref="targetRef">{{t('apiCpuView')}}</div>
                    <svg class="connection-svg">
                      <path :d="smoothPath" class="line-style" />
                    </svg>
                    <div class="mt20 ml12 event-name-font" ref="targetRefKernel">{{t('kernelCpuView')}}</div>
                    <svg class="connection-svg">
                      <path :d="smoothPathKernel" class="line-style" />
                    </svg>
                  </div>
                  <div id="current-container" class="detail-canvas-right-container" ref="canvasContainerRef"> 
                    <canvas id="core-detail-timeline" ref="coreDetailTimelineCanvas"></canvas>
                    <canvas id="core-detail-aicpu" ref="coreDetailAicpuCanvas" @click="handleAicpuCanvasClick" @mousemove="handleAicpuMouseMove" @mouseleave="handleMouseLeave"></canvas>
                    <canvas id="core-detail-kernel" ref="coreDetailKernelCanvas" @mousemove="handleMouseMove"  @mouseleave="handleMouseLeave"  @click="handleCanvasClick"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <template v-else>
            <aicpu-detail-nodata />
          </template>
        </div>
        <div class="close-button">
          <d-button icon="icon-close" style="width: 16px; font-size: 16px; border: none; background-color: transparent"
            @click="AicpuCoreDetailsPanel()"></d-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, watch, onMounted, onUpdated} from 'vue';
import { useI18n } from 'vue-i18n';
import aicpuDetailContent from './aicpuDetailContent.vue';
import aicpuDetailNodata from './aicpuDetailNoData.vue';
import gradientDashedLine from './gradientDashedLine.vue';
import { COLOR_CFG, setupHighDPICanvas, NARROW_WIDTH_THRESHOLD, SNAP_THRESHOLD, getEventDisplayName } from '../swimGraphUtils';
import { getBaseColor } from '../swimGraphProcesses/processInfo';
import { swimDataManager } from '../swimData';
const { t } = useI18n();
const {
    aicpuCoreDetailsExpanded,
    isDarkTheme,
    aicpuBuildTask,
    aicpuSchedTask,
    aicpuHasRelevent,
    viewState,
    tsScale,
    layout,
    lane2line,
    timelineState,
    tooltipStyle,
    kernelColorRending,
    performanceVisible,
    selectedEvent,
    kernelThreadData,
    lastSelected
} = inject('swimGraphState');

const {
  dynamicWidthStyle,
  showTooltip,
  handleKernalEventColors,
  selectEvent,
  scrollToEvent
} = inject('swimGraphMethods');
const coreDetailTimelineCanvas = ref(null);
const coreDetailTimelineCtx = ref(null);
const coreDetailAicpuCanvas = ref(null);
const coreDetailAicpuCtx = ref(null);
const coreDetailKernelCanvas = ref(null);
const coreDetailKernelCtx = ref(null);
const kernalProcessKey = ref('');
const aiCpuProcessKey = ref('');
const kernelCloneThreadData = ref('');
const CANVAS_HEIGHT = ref(20);
const containerWidth = ref(0);
let TOTAL_TICKS = ref(10);
let hasClicked = ref(false);
let clickedEvent = ref(null);
const selectedOriginEvent = ref(null);
const canvasContainerRef = ref(null);
const containerRef = ref(null);
const sourceRef = ref(null);
const targetRef = ref(null);
const smoothPath = ref('');
const targetRefKernel = ref(null);
const smoothPathKernel = ref('');
const releventRef = ref(null);
let isDragging = ref(false);
let startDragX = ref(0);
let scrollLeft = ref(0);
const AicpuCoreDetailsPanel = () => {
  aicpuCoreDetailsExpanded.value = !aicpuCoreDetailsExpanded.value;
};
const kernalName = ref('');
const kernalDisplayName = ref('');
let buildTaskColor = computed(() => {
  return getBaseColor(aicpuBuildTask.value, { processes: swimDataManager.getAllProcesses(), isDarkTheme, kernelColorRending });
});
let stopColor = computed(() => {
  return isDarkTheme.value ? '#ffffff' : '#000000';
});
const initCanvases = () => {
  if (coreDetailTimelineCanvas.value) {
    coreDetailTimelineCtx.value = coreDetailTimelineCanvas.value.getContext('2d');
  }
  if (coreDetailAicpuCanvas.value) {
    coreDetailAicpuCtx.value = coreDetailAicpuCanvas.value.getContext('2d');
  }
  if (coreDetailKernelCanvas.value) {
    coreDetailKernelCtx.value = coreDetailKernelCanvas.value.getContext('2d');
  }
};

const getTimeByIndex = (index, x, timePerPixel, { startTimeInfo, endTimeInfo }) => {
  if (index === 0) {
    return startTimeInfo;
  }
  if (index === TOTAL_TICKS.value - 1) {
    return endTimeInfo;
  }
  return startTimeInfo + (x * timePerPixel);
};

const renderCoreDetailTimeline = (startTimeInfo, endTimeInfo) => {
  const canvas = coreDetailTimelineCanvas.value;
  const canvasContainer = document.getElementById('current-container');
  if (!canvas || !canvasContainer) {
    return;
  }
  const ctx = coreDetailTimelineCtx.value;
  const canvasWidth = containerWidth.value;
  const canvasHeight = CANVAS_HEIGHT.value;
  if (canvasWidth < 60) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  setupHighDPICanvas(canvas, canvasWidth, canvasHeight);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = isDarkTheme.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  const timeRange = endTimeInfo - startTimeInfo;
  if (timeRange <= 0) {
    return;
  }
  const timePerPixel = timeRange / canvasWidth;
  const endNs = ((endTimeInfo - viewState.minTime) * 1000) / tsScale.value;
  let UNIT_DIVISOR;
  let UNIT_LABEL;
  if (endNs >= 6e10) {
    UNIT_DIVISOR = 6e10;
    UNIT_LABEL = 'min';
  } else if (endNs >= 1e9) {
    UNIT_DIVISOR = 1e9;
    UNIT_LABEL = 's';
  } else if (endNs >= 1e6) {
    UNIT_DIVISOR = 1e6;
    UNIT_LABEL = 'ms';
  } else if (endNs >= 1e3) {
    UNIT_DIVISOR = 1e3;
    UNIT_LABEL = 'μs';
  } else {
    UNIT_DIVISOR = 1;
    UNIT_LABEL = 'ns';
  }
  const totalTicks = TOTAL_TICKS.value;
  const availableWidth = canvasWidth - 60;
  const stepX = availableWidth / (totalTicks - 1);
  const MIN_SPACING = 80;
  const drawTick = (index, x) => {
    let time = getTimeByIndex(index, x, timePerPixel, { startTimeInfo, endTimeInfo });
    const timeNs = ((time - viewState.minTime) * 1000) / tsScale.value;
    let displayValue;
    if (index === 0) {
      displayValue = Math.floor((((startTimeInfo - viewState.minTime) * 1000) / tsScale.value) / UNIT_DIVISOR);
    } else if (index === totalTicks - 1) {
      displayValue = Math.ceil((((endTimeInfo - viewState.minTime) * 1000) / tsScale.value) / UNIT_DIVISOR);
    } else {
      displayValue = Math.round(timeNs / UNIT_DIVISOR);
    }
    const text = `${displayValue}${UNIT_LABEL}`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.strokeStyle = isDarkTheme.value ? '#3e3e42' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isDarkTheme.value ? '#cccccc' : '#333333';
    ctx.font = '12px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, 4);
  };
  const startX = 0;
  drawTick(0, startX);
  const endX = availableWidth;
  if (endX - startX >= MIN_SPACING) {
    drawTick(totalTicks - 1, endX);
    if (totalTicks > 2) {
      let stepMultiplier = Math.max(1, Math.ceil(MIN_SPACING / stepX));
      for (let i = 1; i < totalTicks - 1; i += stepMultiplier) {
        let x = i * stepX;
        if (x - startX < MIN_SPACING) {
          continue;
        }
        if (endX - x < MIN_SPACING) {
          continue;
        }
        drawTick(i, x);
      }
    }
  }
};
const renderCoreDetailAicpu = () => {
  const event = selectedOriginEvent.value;
  const themeColors = isDarkTheme.value ? event.color.dark : event.color.light;
  const rectColor = clickedEvent.value ? themeColors.base : themeColors.light;
  const colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
  const fontColor = clickedEvent.value ? colorCfg.eventFont : colorCfg.eventFontHighLight;
  const { name } = event;
  const canvas = coreDetailAicpuCanvas.value;
  const canvasContainer = document.getElementById('current-container');
  if (!canvas || !canvasContainer) {
    return;
  }
  const ctx = coreDetailAicpuCtx.value;
  const canvasWidth = containerWidth.value;
  const canvasHeight = CANVAS_HEIGHT.value;
  setupHighDPICanvas(canvas, canvasWidth, canvasHeight);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = rectColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.font = '12px Arial'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fontColor; 
  ctx.fillText(name, canvasWidth / 2, canvasHeight / 2);
};
const drawKernelEvents = (ctx, events, canvasWidth, canvasHeight, { timelineStart, timelineEnd }) => {
  const timeRange = timelineEnd - timelineStart;
  if (timeRange <= 0) {
    return;
  }
  const eventHeight = canvasHeight;
  const padding = 2;
  const actualEventHeight = eventHeight - (padding * 2);
  const colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
  ctx.font = '12px Arial';
  ctx.textBaseline = 'top';
  for (const event of events) {
    const { startTime, endTime, name } = event;
    const relativeStartTime = startTime - timelineStart;
    const relativeEndTime = endTime - timelineStart;
    const x = (relativeStartTime / timeRange) * canvasWidth;
    const width = ((relativeEndTime - relativeStartTime) / timeRange) * canvasWidth;
    const y = padding;
    event.renderInfo = {
      x,
      y,
      width,
      height: actualEventHeight
    };
    const eventColor = getBaseColor(event, { processes: swimDataManager.getAllProcesses(), isDarkTheme, kernelColorRending });
    const fillColor = eventColor;
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, actualEventHeight);
    if (width > 15) {
      const fontColor = isDarkTheme.value ? colorCfg.eventFont : colorCfg.eventFont;
      ctx.fillStyle = fontColor;
      const textWidth = ctx.measureText(name).width;
      let displayText = name;
      if (textWidth > width) {
        const widthPerChar = textWidth / name.length;
        const ellipsisWidth = ctx.measureText('...').width;
        const availableWidth = width - ellipsisWidth;
        let maxCharsToFit = Math.floor(availableWidth / widthPerChar);
        if (maxCharsToFit > 0) {
          displayText = name.substring(0, maxCharsToFit) + '...';
        } else {
          displayText = '';
        }
      }
      if (displayText) {
        const displayTextWidth = ctx.measureText(displayText).width;
        const textX = x + ((width - displayTextWidth) / 2);
        const textY = y + ((actualEventHeight - 12) / 2);
        ctx.fillText(displayText, textX, textY);
      }
    }
  }
};

const renderCoreDetailKernel = ({ startTime, endTime }) => {
  const canvas = coreDetailKernelCanvas.value;
  const canvasContainer = document.getElementById('current-container');
  if (!canvas || !canvasContainer) {
    return;
  }
  const ctx = coreDetailKernelCtx.value;
  const canvasWidth = containerWidth.value;
  const canvasHeight = CANVAS_HEIGHT.value;
  setupHighDPICanvas(canvas, canvasWidth, canvasHeight);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  if (!kernelThreadData.value || typeof kernelThreadData.value !== 'object' || Object.keys(kernelThreadData.value).length === 0) {
    return;
  }
  kernelCloneThreadData.value = JSON.parse(JSON.stringify(kernelThreadData.value));
  const thread = kernelCloneThreadData.value;
  const events = thread.events || [];
  if (events.length === 0) {
    return;
  }
  drawKernelEvents(ctx, events, canvasWidth, canvasHeight, { timelineStart: startTime, timelineEnd: endTime });
};
const renderCoreDetailCanvas = () => {
  const effectiveThreadName = selectedEvent.value.originalThreadName || selectedEvent.value.threadName;
  const isCore = /^(?:SCHED\d+-(?:AIC|AIV)-\d+|(?:AIC|AIV)-\d+-SCHED\d+)$/.test(effectiveThreadName);
  if (isCore) {
    selectedOriginEvent.value = JSON.parse(JSON.stringify(selectedEvent.value));
  }
  const event = selectedOriginEvent.value;
  if (coreDetailTimelineCtx.value) {
    coreDetailTimelineCtx.value.clearRect(0, 0, viewState.canvasWidth, coreDetailTimelineCanvas.value?.height);
  }
  if (coreDetailAicpuCtx.value) {
    coreDetailAicpuCtx.value.clearRect(0, 0, viewState.canvasWidth, coreDetailAicpuCanvas.value?.height);
  }
  if (coreDetailKernelCtx.value) {
    coreDetailKernelCtx.value.clearRect(0, 0, viewState.canvasWidth, coreDetailKernelCanvas.value?.height);
  }
  const threadName = event.originalThreadName || event.threadName;
  const targetThreadName = extractAicAiv(threadName).replace('-','_');
  kernalName.value = targetThreadName;
  kernalDisplayName.value = threadName;
  const {startTime, endTime} = event;
  getKernelEventsData(startTime, endTime);
  setTimeout(() => {
    const canvasContainer = document.getElementById('current-container');
    const baseWidth = canvasContainer?.clientWidth;
    containerWidth.value = hasClicked.value ? baseWidth - 10 : baseWidth;
    initCanvases();
    renderCoreDetailTimeline(startTime, endTime);
    renderCoreDetailAicpu();
    renderCoreDetailKernel({ startTime, endTime });
    hasClicked.value = true;
  });
};
const getKernelEventsData = (startTime, endTime) => {
  let kernelThreads = null;
  for (const [key, processItem] of swimDataManager.getAllProcesses()) { 
    if (processItem.type === 'kernel') {
      kernalProcessKey.value = key;
      kernelThreads = processItem.threads;
    }
    if (processItem.type === 'aicpu') {
      aiCpuProcessKey.value = key;
    }
  }
  if (kernelThreads) {
    kernelThreadData.value = getThreadByThreadName(kernalProcessKey.value, kernelThreads, startTime, endTime);
  } else {
    kernelThreadData.value = {};
  }
};
const getThreadByThreadName = (key, map, startTimeInfo, endTimeInfo) => {
  for (const [threadKey, value] of map) {
    if (value.threadName === kernalName.value) {
      const originalEvents = swimDataManager.getEventsByThread(key, threadKey);
      const filteredEvents = originalEvents.filter(item => {
        if (item.originalThreadName) {
          return false;
        }
        return item.startTime >= startTimeInfo && item.endTime <= endTimeInfo;
      });
      if (filteredEvents.length > 0) {
        return {
          ...value,
          events: filteredEvents
        };
      }
    }
  }
  return {};
};
const extractAicAiv = (str) => {
  let match = str.match(/^SCHED\d+-(?<coreType>AIC|AIV)-(?<coreId>\d+)$/);
  if (match) {
    return `${match.groups.coreType}-${match.groups.coreId}`;
  }
  match = str.match(/^(?<coreType>AIC|AIV)-(?<coreId>\d+)-SCHED\d+$/);
  if (match) {
    return `${match.groups.coreType}-${match.groups.coreId}`;
  }
  return null;
};
const handleMouseMove = (e) => {
  const mousePosition = { x: e.clientX, y: e.clientY };
  if (!coreDetailKernelCanvas.value || !mousePosition) { return };
  const rect = coreDetailKernelCanvas.value.getBoundingClientRect();
  const x = mousePosition.x - rect.left;
  const y = mousePosition.y - rect.top;
  const info = findEventAtPosition(x, y, kernalProcessKey.value);
  const hoveredEvent = info?.event;
  updateCursorState(e, hoveredEvent);
};
const handleAicpuMouseMove = (e) => {
  canvasContainerRef.value.style.cursor = 'pointer';
  showTooltip(e, selectedOriginEvent.value);
};
const updateCursorState = (e, event) => {
  const cursor = handleTooltipAndCursor(e, event) || '';
  canvasContainerRef.value.style.cursor = cursor;
};
const handleTooltipAndCursor = (e, event) => {
  let cursor = '';
  if (event && !e.altKey && !e.ctrlKey) {
    showTooltip(e, event);
    cursor = 'pointer';
  } else {
    tooltipStyle.display = 'none';
  }
  return cursor;
};
const handleMouseLeave = (e) => {
  tooltipStyle.display = 'none';
  canvasContainerRef.value.style.cursor = '';
};
const handleCanvasClick = (e) => {
  if (!kernelThreadData.value || typeof kernelThreadData.value !== 'object' || Object.keys(kernelThreadData.value).length === 0) {
    return;
  }
  const canvas = coreDetailKernelCanvas.value;
  const ctx = coreDetailKernelCtx.value;
  if (!canvas || !ctx) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const events = kernelCloneThreadData.value?.events || [];
  if (events.length === 0) {
    return;
  }
  const info = findEventAtPosition(x, y, kernalProcessKey.value);
  clickedEvent.value = info?.event;
  if (!clickedEvent.value) {
    return;
  }
  ctx.clearRect(0, 0, containerWidth.value, CANVAS_HEIGHT.value);
  handleHighKernelEvents();
  renderCoreDetailAicpu();
  selectKernelEvent();
};
const selectKernelEvent = () => {
  const process = swimDataManager.getProcess(kernalProcessKey.value);
  const kernelThreads = process.threads;
  for (const [key, thread] of kernelThreads) {
    if (thread.threadName === kernelThreadData.value.threadName) {
      const targetEvent = swimDataManager.getEventById(clickedEvent.value.id);
      scrollToEvent(targetEvent);
      selectEvent(targetEvent, kernalProcessKey.value, false);
    }
  }
};
const handleAicpuCanvasClick = (e) => {
  if (!kernelThreadData.value || typeof kernelThreadData.value !== 'object' || Object.keys(kernelThreadData.value).length === 0) {
    return;
  }
  const canvas = coreDetailKernelCanvas.value;
  const ctx = coreDetailKernelCtx.value;
  if (!canvas || !ctx) {
    return;
  }
  ctx.clearRect(0, 0, containerWidth.value, CANVAS_HEIGHT.value);
  clickedEvent.value = null;
  lastSelected.value = null;
  const event = selectedOriginEvent.value ? swimDataManager.getEventById(selectedOriginEvent.value.id) : null;
  selectEvent(event, aiCpuProcessKey.value);
  scrollToEvent(event);
}; 
const handleHighKernelEvents = () => {
  const ctx = coreDetailKernelCtx.value;
  if (!ctx || !clickedEvent.value) {
    return;
  }
  ctx.clearRect(0, 0, containerWidth.value, CANVAS_HEIGHT.value);
  const events = kernelCloneThreadData.value?.events || [];
  const colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
  const fillNoStyle = colorCfg.eventRectNoColor;
  const fontNoColor = colorCfg.eventFontNoColor;
  for (const event of events) {
    let colors;
    if (clickedEvent.value?.id === event.id) {
      colors = handleKernalEventColors(event, kernalProcessKey.value, true, true);
    } else {
      if (clickedEvent.value) {
        colors = {
          fillColor: fillNoStyle,
          strokeColor: 'transparent',
          fontColor: fontNoColor
        };
      } else {
        colors = handleKernalEventColors(event, kernalProcessKey.value, false, false);
      }
    }
    event.drawData.rectColor = colors.fillColor;
    event.drawData.strokeColor = colors.strokeColor ?? 'transparent';
    event.drawData.fontColor = colors.fontColor;
    drawHighKernelEvents(event);
  }
};
const drawHighKernelEvents = (event) => {
  const ctx = coreDetailKernelCtx.value;
  const { name, drawData, renderInfo } = event;
  const { width, x, y, height } = renderInfo;
  const { rectColor, fontColor } = drawData;
  ctx.fillStyle = rectColor;
  ctx.fillRect(x, y, width, height);
  if (width > 15) {
    ctx.fillStyle = fontColor;
    const textWidth = ctx.measureText(name).width;
    let displayText = name;
    if (textWidth > width) {
      const widthPerChar = textWidth / name.length;
      const ellipsisWidth = ctx.measureText('...').width;
      const availableWidth = width - ellipsisWidth;
      let maxCharsToFit = Math.floor(availableWidth / widthPerChar);
      if (maxCharsToFit > 0) {
        displayText = name.substring(0, maxCharsToFit) + '...';
      } else {
        displayText = '';
      }
    }
    if (displayText) {
      const displayTextWidth = ctx.measureText(displayText).width;
      const textX = x + ((width - displayTextWidth) / 2);
      const textY = y + ((height - 12) / 2);
      ctx.fillText(displayText, textX, textY);
    }
  }
};
const findEventAtPosition = (x, y, processKey) => {
  let processObj = {
    event: null
  };
  const thread = kernelCloneThreadData.value;
  if (!thread) {
    return processObj;
  }
  const [temp] = thread.events;
  if (!temp) {
    return processObj;
  }
  const label = `${processKey}@${thread.tid}`;
  const lineCount = lane2line.get(label) || 1;
  if (temp.renderInfo) {
    const minY = temp.renderInfo.y;
    const maxY = minY + (layout.threadHeight * lineCount);
    if (y < minY || y > maxY) {
      return processObj;
    }
  }
  const result = searchEventsInThread(thread, x, y);
  if (result.foundEvent) {
    processObj.event = result.foundEvent;
    return processObj;
  }
  return processObj;
};
const searchEventsInThread = (thread, x, y) => {
  for (let index = 0; index < thread.events.length; index++) {
    const event = thread.events[index];
    if (!event.renderInfo) {
      continue;
    }
    const { x: eventX, y: eventY, height: eventHeight, width } = event.renderInfo;
    if (y < eventY || y > eventY + eventHeight) {
      continue;
    }
    if (x >= eventX && x <= eventX + width) {
      return {
        foundEvent: event
      };
    } else {
      const { pixelScale } = viewState;
      const isNarrow = width * pixelScale <= NARROW_WIDTH_THRESHOLD;
      if (isNarrow && event.renderEndTime >= timelineState.startTime && event.renderStartTime <= timelineState.endTime) {
        const snapThresholdInTime = SNAP_THRESHOLD / pixelScale;
        const eventRange = [eventX - snapThresholdInTime, eventX + width];
        if (x >= eventRange[0] && x <= eventRange[1]) {
          return {
            foundEvent: event
          };
        }
      }
    }
  }
  return {
    foundEvent: null
  };
};
watch(performanceVisible, () => {
  TOTAL_TICKS.value = performanceVisible.value ? 5 : 10;
  if (!aicpuCoreDetailsExpanded.value) {
    return;
  }
  renderCoreDetailCanvas();
});
defineExpose({
  renderCoreDetailCanvas,
  handleHighKernelEvents
});
const drawSmoothLine = () => {
  if (!containerRef.value) {
    return;
  }
  const containerRect = containerRef.value.getBoundingClientRect();
  const sourceRect = sourceRef.value.getBoundingClientRect();
  const startX = sourceRect.left - containerRect.left + 4;
  const startY = ((sourceRect.top + (sourceRect.height / 2)) - containerRect.top) + 8;
  const targetRect = targetRef.value.getBoundingClientRect();
  const endX = targetRect.left - containerRect.left;
  const endY = (targetRect.top + (targetRect.height / 2)) - containerRect.top;
  const radius = 4;
  const cornerX = startX;
  const cornerY = endY;
  const arcStartX = cornerX;
  const arcStartY = cornerY - radius;
  const arcEndX = cornerX + radius;
  const arcEndY = cornerY;
  smoothPath.value = `
    M ${startX} ${startY} 
    L ${arcStartX} ${arcStartY} 
    A ${radius} ${radius} 0 0 0 ${arcEndX} ${arcEndY} 
    L ${endX} ${endY}
  `;
  const targetKernelRect = targetRefKernel.value.getBoundingClientRect();
  const endKernelX = targetKernelRect.left - containerRect.left;
  const endKernelY = (targetKernelRect.top + (targetKernelRect.height / 2)) - containerRect.top;
  const secondX = endX - 8;
  const secondY = endY - 2;
  const cornerKernelX = secondX;
  const cornerKernelY = endKernelY;
  const arcKernelStartX = cornerKernelX;
  const arcKernelStartY = cornerKernelY - radius;
  const arcKernelEndX = cornerKernelX + radius;
  const arcKernelEndY = cornerKernelY;
  smoothPathKernel.value = `
    M ${secondX} ${secondY} 
    L ${arcKernelStartX} ${arcKernelStartY} 
    A ${radius} ${radius} 0 0 0 ${arcKernelEndX} ${arcKernelEndY} 
    L ${endKernelX} ${endKernelY}
  `;
};

const startDragScroll = (e) => {
  if (e.target.closest('.relevent-content')) {
    isDragging.value = true;
    startDragX.value = e.pageX - releventRef.value.offsetLeft;
    scrollLeft.value = releventRef.value.scrollLeft;
    releventRef.value.style.cursor = 'grabbing';
  }
};

const handleDragScroll = (e) => {
  if (!isDragging.value) {
    return;
  }
  e.preventDefault();
  const x = e.pageX - releventRef.value.offsetLeft;
  const walk = (x - startDragX.value) * 1.5;
  releventRef.value.scrollLeft = scrollLeft.value - walk;
};

const endDragScroll = () => {
  isDragging.value = false;
  if (releventRef.value) {
    releventRef.value.style.cursor = 'grab';
  }
};

onMounted(() => {
  drawSmoothLine();
  window.addEventListener('resize', drawSmoothLine);
  if (releventRef.value) {
    releventRef.value.style.cursor = 'grab';
  }
});

onUpdated(() => {
  drawSmoothLine();
});
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/AicpuDetail/aicpuCoreDetail.css");
</style>