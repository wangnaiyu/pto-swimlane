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
    <div class="control-details" :class="{ expanded: aicpuControlDetailsExpanded }">
      <div class="control-details-content">
        <!-- 详情页面具体内容 -->
        <aicpu-detail-content />
        <div class="relevent" 
             ref="releventRef">
          <div class="relevent-title">Relevent</div>
          <div class="relevent-content" 
               v-if="aicpuHasRelevent"
               @mousedown="startDragScroll"
               @mousemove="handleDragScroll"
               @mouseup="endDragScroll"
               @mouseleave="endDragScroll">
            <div class="build-content">
              <div class="title">Current</div>
              <div class="current-content" ref="currentContent" :style="{...dynamicWidthStyle(canvasclickedEvent), width:'auto'}">{{ getEventDisplayName(canvasclickedEvent) }}</div>
            </div>
            <svg class="connection-svg" ref="connectionSvg">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" id="startStop" :style="{stopColor: startColor, stopOpacity: 1}" />
                  <stop offset="100%" id="endStop" :style="{stopColor: stopColor, stopOpacity: 1}" />
                </linearGradient>
              </defs>
              <path
                v-for="(item, index) in scheduleList" 
                :key="index"
                :d="getPathData(index)"
                stroke="url(#grad1)"
                stroke-width="1"
                fill="none"
                stroke-dasharray="4,4"
              />
            </svg>
            <div class="sched-content">
              <div class="title">Schedule NO.</div>
              <div class="scheds">
                <div class="schedules" v-for="(item, index) in scheduleList" :key="index" ref="schedItem"> {{item }} </div>
              </div>
            </div>
            <svg class="connection-svg" ref="connectionSvg1">
              <defs>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" id="startStop" :style="{stopColor: stopColor, stopOpacity: 1}" />
                  <stop offset="100%" id="endStop" :style="{stopColor: stopColor, stopOpacity: 1}" />
                </linearGradient>
              </defs>
              <path
                v-for="(item, index) in scheduleList" 
                :key="index"
                :d="getScedPathData(index)"
                stroke="url(#grad2)"
                stroke-width="1"
                fill="none"
                stroke-dasharray="4,4"
              />
            </svg>            
            <div class="cube-content" ref="cubes">
              <div class="schedule-title">{{$t('aiCubeSched')}}</div>
              <template v-for="(key, index) in sortedResultKeys" :key="key">
                <aic-cube-schedule-detail
                  :aic-dispatch-numstart="aicpuScheduleData.get(key).aic.min"
                  :aic-dispatch-numend="aicpuScheduleData.get(key).aic.max"
                  :aic-thread-num="globalAicMax"/>
              </template>
            </div>
            <div class="vec-content">
              <div class="schedule-title">{{$t('aiVectorSched')}}</div>
              <template v-for="(key, index) in sortedResultKeys" :key="key">
                <aiv-cube-schedule-detail
                  :aiv-dispatch-numstart="aicpuScheduleData.get(key).aiv.min"
                  :aiv-dispatch-numend="aicpuScheduleData.get(key).aiv.max"
                  :aic-end-num="globalAicMax"
                  :aiv-thread-num="aivThreadNum"/>
              </template>
            </div>
          </div>
          <template v-else>
            <aicpu-detail-nodata />
          </template>
        </div>
        <div class="close-button">
          <d-button icon="icon-close" style="width: 16px; font-size: 16px; border: none; background-color: transparent"
            @click="AicpuControlDetailsPanel()"></d-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, computed, onMounted} from 'vue';
import { useI18n } from 'vue-i18n';
import aicpuDetailContent from './aicpuDetailContent.vue';
import aicpuDetailNodata from './aicpuDetailNoData.vue';
import aicCubeScheduleDetail from './aicCubeScheduleDetail.vue';
import aivCubeScheduleDetail from './aivCubeScheduleDetail.vue';
const { t: $t } = useI18n();
import { getEventDisplayName } from '../swimGraphUtils';
import { getBaseColor } from '../swimGraphProcesses/processInfo';
import { swimDataManager } from '../swimData';
// 注入父组件提供的状态和方法
const currentContent = ref();
const connectionSvg = ref();
const connectionSvg1 = ref();
const schedItem = ref();
const cubes = ref();
const releventRef = ref(null);
let isDragging = ref(false);
let startDragX = ref(0);
let scrollLeft = ref(0);
const {
    aicpuControlDetailsExpanded,
    scheduleList,
    selectedEvent,
    isDarkTheme,
    aicpuHasRelevent,
    aicpuScheduleMaps,
    canvasclickedEvent
} = inject('swimGraphState');

const {
  dynamicWidthStyle,
  kernelColorRending,
} = inject('swimGraphMethods');

const aicpuScheduleData = ref(new Map());
let aivThreadNum = 0;
let globalAicMax = 0;

const AicpuControlDetailsPanel = () => {
  aicpuControlDetailsExpanded.value = !aicpuControlDetailsExpanded.value;
};

const getScedPathData = (index) => {
  const svg = connectionSvg1.value;
  const startEl = schedItem.value;
  const endEl = cubes.value;
  if (!startEl || ! endEl) {
    return '';
  }
  if (index < 0 || index >= startEl.length) {
    return '';
  }
  const startRect = startEl[index].getBoundingClientRect();
  const endRect = endEl.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const startX = startRect.right - svgRect.left;
  const startY = startRect.top + (startRect.height / 2) - svgRect.top;
  const endX = endRect.left - svgRect.left;
  const endY = startY - 1;

  return `M${startX}, ${startY} L${endX}, ${endY}`;
};


const getPathData = (index) => {
  const svg = connectionSvg.value;
  const startEl = currentContent.value;
  const endEl = schedItem.value;
  if (!startEl || ! endEl) {
    return '';
  }
  if (index < 0 || index >= endEl.length) {
    return '';
  }
  const startRect = startEl.getBoundingClientRect();
  const endRect = endEl[index].getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const startX = startRect.right - svgRect.left;
  const startY = startRect.top + (startRect.height / 2) - svgRect.top;
  const endX = endRect.left - svgRect.left;
  let endY = endRect.top + (endRect.height / 2) - svgRect.top;
  const deltaY = endY - startY;
  if (Math.abs(deltaY) < 10) {
    if (startY === endY) {
      endY += 1;
    }
    return `M${startX}, ${startY} L${endX}, ${endY}`;
  }
  const curveHeight = Math.abs(deltaY) * 0.3;
  const curveDirection = deltaY > 0 ? 1 : -1;
  return `M${startX},${startY}
          C${startX + (curveHeight * curveDirection)}, ${startY + (curveHeight * curveDirection)}
          ${endX - (curveHeight * curveDirection)},${endY - (curveHeight * curveDirection)}
          ${endX},${endY}`;
};
let startColor = computed(() => {
  return getBaseColor(selectedEvent.value, { processes: swimDataManager.getAllProcesses(), isDarkTheme, kernelColorRending });
});
let stopColor = computed(() => {
  return isDarkTheme.value ? '#ffffff' : '#000000';
});
const updateScheduleRange = (current, type, number) => {
  if (current[type].min === null) {
    current[type].min = number;
    current[type].max = number;
  } else {
    current[type].min = Math.min(current[type].min, number);
    current[type].max = Math.max(current[type].max, number) + 1;
  }
};
const collectControlGroups = (scheduleMaps) => {
  const controlGroups = new Set();
  for (const [key] of scheduleMaps.entries()) {
    const ctrlMatch = key.match(/^AICPU-SCHED-(?<number>\d+)$/);
    if (ctrlMatch) {
      controlGroups.add(ctrlMatch.groups.number);
    }
  }
  return controlGroups;
};
const fillScheduleRanges = (scheduleMaps, result, controlGroups) => {
  for (const [key] of scheduleMaps.entries()) {
    const aicMatch = key.match(/^SCHED(?<group>\d+)-AIC-(?<number>\d+)$/) || key.match(/^AIC-(?<number>\d+)-SCHED(?<group>\d+)$/);
    const aivMatch = key.match(/^SCHED(?<group>\d+)-AIV-(?<number>\d+)$/) || key.match(/^AIV-(?<number>\d+)-SCHED(?<group>\d+)$/);
    if (aicMatch && controlGroups.has(aicMatch.groups.group)) {
      updateScheduleRange(result.get(`AICPU-CTRL-${aicMatch.groups.group}`), 'aic', parseInt(aicMatch.groups.number));
    }
    if (aivMatch && controlGroups.has(aivMatch.groups.group)) {
      updateScheduleRange(result.get(`AICPU-CTRL-${aivMatch.groups.group}`), 'aiv', parseInt(aivMatch.groups.number));
    }
  }
};
const scheduleGraphData = () => {
  const result = new Map();
  if (!aicpuScheduleMaps.value) {
    return result;
  }

  const controlGroups = collectControlGroups(aicpuScheduleMaps.value);
  if (controlGroups.size === 0) {
    return result;
  }

  for (const group of controlGroups) {
    result.set(`AICPU-CTRL-${group}`, {
      aic: { min: null, max: null },
      aiv: { min: null, max: null }
    });
  }

  fillScheduleRanges(aicpuScheduleMaps.value, result, controlGroups);

  globalAicMax = 0;
  let globalAivMax = 0;
  for (const data of result.values()) {
    if (data.aic.max !== null && data.aic.max > globalAicMax) {
      globalAicMax = data.aic.max;
    }
    if (data.aiv.max !== null && data.aiv.max > globalAivMax) {
      globalAivMax = data.aiv.max;
    }
  }
  aivThreadNum = globalAicMax > 0 ? globalAivMax - globalAicMax : 0;
  return result;
};

const sortedResultKeys = computed(() => {
  return Array.from(aicpuScheduleData.value.keys()).sort((a, b) => {
    const numA = parseInt(a.split('-')[2]);
    const numB = parseInt(b.split('-')[2]);
    return numA - numB;
  });
});

watch(selectedEvent, (newEvent) => {
  aicpuScheduleData.value = scheduleGraphData();
});

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
  if (releventRef.value) {
    releventRef.value.style.cursor = 'grab';
  }
});
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/AicpuDetail/aicpuControlDetail.css");
</style>