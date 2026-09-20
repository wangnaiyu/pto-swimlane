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
  <div class="processes-container" ref="processesContainer" :style="containerStyle">
    <template v-if="isE2ESwim">
      <div class="process-section aicpu-section" :style="aicpuContainerStyle" ref="aicpuSection">
        <swim-graph-process-item 
          v-for="(processEntry, index) in aicpuProcesses" 
          :key="processEntry"
          :process-key="processEntry"
          :process="swimDataManager.getProcess(processEntry)"
          :labelRender="labelRender"
        />
      </div>
      <div class="process-section kernel-section" :style="kernelContainerStyle" ref="kernelSection">
        <swim-graph-process-item 
          v-for="(processEntry, index) in kernelProcesses" 
          :key="processEntry"
          :process-key="processEntry"
          :process="swimDataManager.getProcess(processEntry)"
          :labelRender="labelRender"
        />
      </div>
    </template>
    <template v-else>
      <swim-graph-process-item 
        v-for="(processEntry, index) in processKeyList" 
        :key="processEntry"
        :process="swimDataManager.getProcess(processEntry)"
        :process-key="processEntry"
        :labelRender="labelRender"
      />
    </template>
  </div>
</template>

<script setup>
import { inject, provide, ref, watch, computed, onUnmounted } from 'vue';
import SwimGraphProcessItem from './SwimGraphProcessItem.vue';
import { getThreadHeight, getThreadStartY } from '../swimGraphUtils';
import { swimDataManager } from '../swimData';
import { throttle } from 'lodash-es';

// 注入父组件提供的状态
const {
  tsScale,
  processExpanded,
  viewState,
  layout,
  lane2line,
  swimlaneContainer,
  swimMainView,
  selectedEvent,
  globalMeasureCanvas,
  canvasclickedEvent,
  pathLockedEvent,
  highlightedPaths,
  mixRelatedPaths,
  detailsPanelExpanded,
  timeLineX,
  sliderValue,
  sliderMax,
  initialScale,
  tooltip,
  tooltipStyle,
  lineTooltip,
  lineTooltipStyle,
  timelineState,
  isDarkTheme,
  mulDetailsExpanded,
  measureDetailsData,
  rootHashes,
  leafHashes,
  isLockStatus,
  leafHashMap,
  dependencyLinesInfo,
  isThreeColumn,
  isPerfSwim,
  isMsProf,
  searchedEvent,
  kernelColorRending,
  labelRender,
  childContextMap,
  isPathLockStatus,
  isAicpu,
  isE2ESwim,
  isMixMode,
  isMaxSchedule,
  aicpuControlDetailsExpanded,
  aicpuScheduleDetailsExpanded,
  aicpuCoreDetailsExpanded,
  globalDependencyLinesInfo,
  globalConnectionCanvas,
  isMeasureModel,
  measureDetailsExpanded,
  isFromPerformanceClick,
  freezeVisibleRange,
  focusedWrapId,
  pathLockedWrapId,
  pathLockedHighlightStyle,
  pathLockedHighlightEvent,
  pathLockedHighlightProcessKey,
  draggingSelection,
  draggingSelectionProcessKey,
  deviceDataMap,
  isDeviceView,
} = inject('swimGraphState');

const curThread = ref('');
const aicpuSection = ref(null);
const kernelSection = ref(null);
provide('curThread', curThread);

const processKeyList = computed(() => {
  swimDataManager.getUpdateFlag().value;
  const result = swimDataManager.getAllProcesses().keys();
  return Array.from(result);
});

const aicpuProcesses = computed(() => {
  const result = [];
  for (const entry of swimDataManager.getAllProcesses()) {
    if (entry[1].type === 'aicpu') {
      result.push(entry[0]);
    }
  }
  return result;
});

const kernelProcesses = computed(() => {
  const result = [];
  for (const entry of swimDataManager.getAllProcesses()) {
    if (entry[1].type !== 'aicpu') {
      result.push(entry[0]);
    }
  }
  return result;
});

const hasAicpuExpanded = computed(() => {
  return aicpuProcesses.value.some(([key]) => processExpanded.get(key));
});

const hasKernelExpanded = computed(() => {
  return kernelProcesses.value.some(([key]) => processExpanded.get(key));
});

const aicpuContainerStyle = computed(() => {
  return {
    flex: hasAicpuExpanded.value ? '1' : 'none',
    overflowY: 'auto',
    overflowX: 'hidden',
    maxHeight: hasAicpuExpanded.value ? 'none' : '50%',
    scrollbarGutter: isE2ESwim.value ? 'stable': 'auto',
  };
});

const kernelContainerStyle = computed(() => {
  return {
    flex: hasKernelExpanded.value ? '1' : 'none',
    overflowY: 'auto',
    overflowX: 'hidden',
    maxHeight: hasKernelExpanded.value ? 'none' : '50%',
    scrollbarGutter: isE2ESwim.value ? 'stable': 'auto',
  };
});

const containerStyle = computed(() => {
  if (isE2ESwim.value) {
    return {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    };
  }
  return {};
});

provide('swimGraphState', {
  tsScale,
  viewState,
  layout,
  processExpanded,
  lane2line,
  swimlaneContainer,
  swimMainView,
  aicpuSection,
  kernelSection,
  selectedEvent,
  globalMeasureCanvas,
  canvasclickedEvent,
  pathLockedEvent,
  highlightedPaths,
  mixRelatedPaths,
  detailsPanelExpanded,
  timeLineX,
  sliderValue,
  sliderMax,
  initialScale,
  tooltip,
  tooltipStyle,
  lineTooltip,
  lineTooltipStyle,
  timelineState,
  isDarkTheme,
  mulDetailsExpanded,
  measureDetailsData,
  rootHashes,
  leafHashes,
  leafHashMap,
  isLockStatus,
  dependencyLinesInfo,
  isThreeColumn,
  isPerfSwim,
  isMsProf,
  searchedEvent,
  kernelColorRending,
  childContextMap,
  isPathLockStatus,
  isAicpu,
  isE2ESwim,
  isMixMode,
  isMaxSchedule,
  aicpuControlDetailsExpanded,
  aicpuScheduleDetailsExpanded,
  aicpuCoreDetailsExpanded,
  globalDependencyLinesInfo,
  globalConnectionCanvas,
  isMeasureModel,
  measureDetailsExpanded,
  isFromPerformanceClick,
  freezeVisibleRange,
  focusedWrapId,
  pathLockedWrapId,
  pathLockedHighlightStyle,
  pathLockedHighlightEvent,
  pathLockedHighlightProcessKey,
  draggingSelection,
  draggingSelectionProcessKey,
  deviceDataMap,
  isDeviceView,
});

const {
  leftmove,
  rightmove,
  flagRender,
  toggleProcess,
  findEventAtPosition,
  selectEvent,
  handleWheel,
  timeToX,
  durationToWidth,
  getTimelineCanvas,
  render,
  renderEvent,
  transform,
  transformVerticalScroll,
  measureDetailGet,
  xToTime,
  xToFixedTime,
  processThreadEventSearch,
  postMessageInfo,
  highlightPinnedEvent,
  getDisplayName,
  changeScale,
  resetState,
  resetMaxScheduleState,
  findWrapAtPosition,
  setHashOrderTipColor,
  isCoreUtilizationSupported,
  processAICPUThreadEventSearch,
  processAicpuThreadCoreEventSearch,
  processThreadEventSearchWithOriginalThreadName,
  calculateAndAddAICPUusage,
  calculateAndAddCoreWaitTime,
  calculateAndAddCoreExecutTime,
} = inject('swimGraphMethods');

provide('swimGraphMethods', {
  leftmove,
  rightmove,
  flagRender,
  toggleProcess,
  findEventAtPosition,
  selectEvent,
  handleWheel,
  timeToX,
  durationToWidth,
  getTimelineCanvas,
  render,
  renderEvent,
  transform,
  transformVerticalScroll,
  measureDetailGet,
  xToTime,
  xToFixedTime,
  processThreadEventSearch,
  postMessageInfo,
  highlightPinnedEvent,
  getDisplayName,
  changeScale,
  resetState,
  resetMaxScheduleState,
  findWrapAtPosition,
  setHashOrderTipColor,
  isCoreUtilizationSupported,
  processAICPUThreadEventSearch,
  processAicpuThreadCoreEventSearch,
  processThreadEventSearchWithOriginalThreadName,
  calculateAndAddAICPUusage,
  calculateAndAddCoreWaitTime,
  calculateAndAddCoreExecutTime,
});

const processesContainer = ref(null);

const {
  addChildContext,
} = inject('swimGraphContext');

provide('swimGraphContext', {
  addChildContext,
});

const handleKernelScroll = throttle(() => {
  clearMeasureFun();
  transformVerticalScroll();
}, 32);

const handleAicpuScroll = throttle(() => {
  clearMeasureFun();
  transformVerticalScroll();
}, 32);
const clearMeasureFun = () => {
  if (globalMeasureCanvas.value && globalMeasureCanvas.value.clearMeasure) {
    globalMeasureCanvas.value.clearMeasure();
  }
};
let kernelScrollHandler = null;
let aicpuScrollHandler = null;

watch(kernelSection, (newVal, oldVal) => {
  if (oldVal && kernelScrollHandler) {
    oldVal.removeEventListener('scroll', kernelScrollHandler);
  }
  if (newVal) {
    kernelScrollHandler = handleKernelScroll;
    newVal.addEventListener('scroll', kernelScrollHandler);
  }
});

watch(aicpuSection, (newVal, oldVal) => {
  if (oldVal && aicpuScrollHandler) {
    oldVal.removeEventListener('scroll', aicpuScrollHandler);
  }
  if (newVal) {
    aicpuScrollHandler = handleAicpuScroll;
    newVal.addEventListener('scroll', aicpuScrollHandler);
  }
});

onUnmounted(() => {
  handleKernelScroll.cancel();
  handleAicpuScroll.cancel();
  if (kernelSection.value && kernelScrollHandler) {
    kernelSection.value.removeEventListener('scroll', kernelScrollHandler);
  }
  if (aicpuSection.value && aicpuScrollHandler) {
    aicpuSection.value.removeEventListener('scroll', aicpuScrollHandler);
  }
});


const getProcessContainerHeight = () => {
  if (!processesContainer.value) return 1000;
  const rect = processesContainer.value.getBoundingClientRect();
  return rect.height;
}

watch( curThread, (newValue, oldValue) => {
  //highlight thread when label hovered
  let oriProcessKeyStr = oldValue.split('-')[0];
  let oriProcessKey = parseInt(oriProcessKeyStr);
  let processKeyStr = newValue.split('-')[0];
  let processKey = parseInt(processKeyStr);

  //if leave old process, clear old process background
  if (oldValue != '') {
    const oriBackgroundCanvasRef = document.querySelector(`[data-background-process-key="${oriProcessKey}"]`);
    try{
      const oriBackgroundCanvasCtx = oriBackgroundCanvasRef.getContext('2d');
      oriBackgroundCanvasCtx.clearRect(0, 0, oriBackgroundCanvasRef.width, oriBackgroundCanvasRef.height);}
    catch(err){
      console.error(err);
    }
  }

  //if mouse not on canvas, return
  if (newValue == '') {
    return;
  }
  let threadIdx = parseInt(newValue.split('-')[1]);
  let curY = 0;
  let curHeight = 0;
  
  if (isMixMode?.value && swimDataManager.hasMixConfig()) {
    const swimLaneOrder = swimDataManager.getSwimLaneOrder();
    if (threadIdx >= 0 && threadIdx < swimLaneOrder.length) {
      curY = swimLaneOrder[threadIdx].y;
      curHeight = swimLaneOrder[threadIdx].height;
    }
  } else {
    const threads = [];
    const curProcess = swimDataManager.getProcess(processKeyStr);
    for (const [threadKey, thread] of curProcess.threads.entries()) {
      threads.push(thread);
    }

    for (let index = 0; index < threads.length; index++) {
      let thread = threads[index];
      if (index >= threadIdx) {
        const key = thread.isCounter ? thread.threadName : thread.tid;
        curY = getThreadStartY(curProcess, processKey, key, lane2line, layout);
        curHeight = getThreadHeight(processKey, key, lane2line, layout, thread.isCounter);
        break;
      }
    }
  }
  
  const backgroundCanvasRef = document.querySelector(`[data-background-process-key="${processKey}"]`);
  if (!backgroundCanvasRef) return;
  const backgroundCanvasCtx = backgroundCanvasRef.getContext('2d');
  backgroundCanvasCtx.clearRect(0, 0, viewState.canvasCssWidth, backgroundCanvasRef.offsetHeight);
  backgroundCanvasCtx.fillStyle = isDarkTheme.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  backgroundCanvasCtx.fillRect(0, curY, viewState.canvasCssWidth, curHeight);
});

const measureMaskHandleWheel = (e) => {
  const aicpuRect = aicpuSection.value.getBoundingClientRect();
  if (isPointInRect(e.clientX, e.clientY, aicpuRect)) {
    e.preventDefault();
    aicpuSection.value.scrollTop += e.deltaY;
    return;
  }
  const kernelRect = kernelSection.value.getBoundingClientRect();
  if (isPointInRect(e.clientX, e.clientY, kernelRect)) {
    e.preventDefault();
    kernelSection.value.scrollTop += e.deltaY;
    return;
  }
};

const isPointInRect = (x, y, rect) => {
  return (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
};
addChildContext('process', {
  measureMaskHandleWheel
});
defineExpose({
  getProcessContainerHeight,
});
</script>

<style scoped>
@import url("../css/swimGraph/Processes/processes.css");
</style>
