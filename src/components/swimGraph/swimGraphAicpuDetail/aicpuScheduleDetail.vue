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
    <div class="core-details" :class="{ expanded: aicpuScheduleDetailsExpanded }">
      <div class="core-details-content">
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
              <div class="title">AICPU_DEV_TASK</div>
              <div class="content" :style="{...dynamicWidthStyle(aicpuBuildTask), width:'auto'}">{{ getEventDisplayName(aicpuBuildTask) }}</div>
            </div>
            <gradientDashedLine :left-color="buildTaskColor" :right-color="stopColor" />
            <div class="sched-content">
              <div class="title">Schedule NO.</div>
              <div class="sched"> {{ getThreadDisplayName(canvasclickedEvent) }} </div>
            </div>
            <gradientDashedLine :left-color="stopColor" :right-color="currentTaskColor" />
            <div class="current-content">
              <div class="title current">Current</div>
              <div class="content" :style="{...dynamicWidthStyle(canvasclickedEvent), width:'auto'}">{{ getEventDisplayName(canvasclickedEvent) }}</div>
            </div>
            <gradientDashedLine :left-color="currentTaskColor" :right-color="stopColor" />
            <div class="cube-content">
              <div class="schedule-title">{{$t('aiCubeSched')}}</div>
              <aic-cube-schedule-detail
              :aic-dispatch-numstart="aicCubeStart" 
              :aic-dispatch-numend="aicCubeEnd"
              :aic-thread-num="aicThreadNum"/>
            </div>
            <div class="vec-content">
              <div class="schedule-title">{{$t('aiVectorSched')}}</div>
              <aiv-cube-schedule-detail 
              :aiv-dispatch-numstart="aivCubeStart" 
              :aiv-dispatch-numend="aivCubeEnd"
              :aic-end-num="aicEndmax"
              :aiv-thread-num="aivThreadNum"/>
            </div>
          </div>
          <template v-else>
            <aicpu-detail-nodata />
          </template>
        </div>
        <div class="close-button">
          <d-button icon="icon-close" style="width: 16px; font-size: 16px; border: none; background-color: transparent"
            @click="aicpuScheduleDetailsPanel()"></d-button>
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
import gradientDashedLine from './gradientDashedLine.vue';
import aicCubeScheduleDetail from './aicCubeScheduleDetail.vue';
import aivCubeScheduleDetail from './aivCubeScheduleDetail.vue';
import { getBaseColor } from '../swimGraphProcesses/processInfo';
import { getThreadDisplayName, getEventDisplayName } from '../swimGraphUtils';
import { swimDataManager } from '../swimData';

const { t: $t } = useI18n();
// 注入父组件提供的状态和方法
const releventRef = ref(null);
let isDragging = ref(false);
let startX = ref(0);
let scrollLeft = ref(0);
const {
    aicpuScheduleDetailsExpanded,
    selectedEvent,
    isDarkTheme,
    aicpuBuildTask,
    kernelColorRending,
    aicpuHasRelevent,
    aicpuScheduleMaps,
    canvasclickedEvent
} = inject('swimGraphState');

const {
  dynamicWidthStyle,
} = inject('swimGraphMethods');

const aicpuScheduleDetailsPanel = () => {
  aicpuScheduleDetailsExpanded.value = !aicpuScheduleDetailsExpanded.value;
};

const aicmin = ref(0);
const aivmin = ref(0);
const aicmax = ref(0);
const aivmax = ref(0);
const aicendmax = ref(0);
const aicThreadNum = ref(0);
const aivThreadNum = ref(0);

let buildTaskColor = computed(() => {
  return getBaseColor(aicpuBuildTask.value, { processes: swimDataManager.getAllProcesses(), isDarkTheme, kernelColorRending });
});
let currentTaskColor = computed(() => {
  return getBaseColor(selectedEvent.value, { processes: swimDataManager.getAllProcesses(), isDarkTheme, kernelColorRending });
});

let stopColor = computed(() => {
  return isDarkTheme.value ? '#ffffff' : '#000000';
});

let aicCubeStart = computed(() => {
  return aicmin.value;
});

let aicCubeEnd = computed(() => {
  return aicmax.value;
});

let aivCubeStart = computed(() => {
  return aivmin.value;
});

let aivCubeEnd = computed(() => {
  return aivmax.value;
});

let aicEndmax = computed(() => {
  return aicendmax.value;
});

const updateScheduleRange = (entry, type, number) => {
  if (entry[type].min === null) {
    entry[type].min = number;
    entry[type].max = number;
  } else {
    entry[type].min = Math.min(entry[type].min, number);
    entry[type].max = Math.max(entry[type].max, number) + 1;
  }
};

const processScheduleKey = (key, result, controlGroups) => {
  const aicMatch = key.match(/^SCHED(?<group>\d+)-AIC-(?<number>\d+)$/) || key.match(/^AIC-(?<number>\d+)-SCHED(?<group>\d+)$/);
  const aivMatch = key.match(/^SCHED(?<group>\d+)-AIV-(?<number>\d+)$/) || key.match(/^AIV-(?<number>\d+)-SCHED(?<group>\d+)$/);

  if (aicMatch && controlGroups.has(aicMatch.groups.group)) {
    const keyName = `AICPU-CTRL-${aicMatch.groups.group}`;
    updateScheduleRange(result.get(keyName), 'aic', parseInt(aicMatch.groups.number));
  }

  if (aivMatch && controlGroups.has(aivMatch.groups.group)) {
    const keyName = `AICPU-CTRL-${aivMatch.groups.group}`;
    updateScheduleRange(result.get(keyName), 'aiv', parseInt(aivMatch.groups.number));
  }
};

const scheduleGraphData = () => {
  const result = new Map();
  if (!aicpuScheduleMaps.value) {
    return result;
  }

  const controlGroups = new Set();

  for (const [key, value] of aicpuScheduleMaps.value.entries()) {
    const ctrlMatch = key.match(/^AICPU-SCHED-(?<number>\d+)$/);
    if (ctrlMatch) {
      controlGroups.add(ctrlMatch.groups.number);
    }
  }

  if (controlGroups.size === 0) {
    return result;
  }

  for (const group of controlGroups) {
    result.set(`AICPU-CTRL-${group}`, {
      aic: { min: null, max: null },
      aiv: { min: null, max: null }
    });
  }

  for (const [key, value] of aicpuScheduleMaps.value.entries()) {
    processScheduleKey(key, result, controlGroups);
  }
  let globalAicMax = 0;
  let globalAivMax = 0;
  for (const data of result.values()) {
    if (data.aic.max !== null && data.aic.max > globalAicMax) {
      globalAicMax = data.aic.max;
    }
    if (data.aiv.max !== null && data.aiv.max > globalAivMax) {
      globalAivMax = data.aiv.max;
    }
  }
  aicThreadNum.value = globalAicMax > 0 ? globalAicMax - 1 : 0;
  aivThreadNum.value = globalAicMax > 0 ? globalAivMax - globalAicMax : 0;
  aicendmax.value = globalAicMax;
  return result;
};

watch(selectedEvent, (newEvent) => {
  if (aicpuHasRelevent) {
    const smap = scheduleGraphData();
    if (newEvent) {
      const effectiveThreadName = newEvent.originalThreadName || newEvent.threadName;
      const match = effectiveThreadName.match(/^AICPU-SCHED-(?<number>\d+)$/);
        if(match && match.groups.number) {
          const groupNumber = match.groups.number;
          const keyName = `AICPU-CTRL-${groupNumber}`;
          if (smap.has(keyName)) {
            const data = smap.get(keyName);
            aicmin.value = data.aic.min;
            aicmax.value = data.aic.max;
            aivmin.value = data.aiv.min;
            aivmax.value = data.aiv.max;
          }
        }
    }
  }
});

const startDragScroll = (e) => {
  if (e.target.closest('.relevent-content')) {
    isDragging.value = true;
    startX.value = e.pageX - releventRef.value.offsetLeft;
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
  const walk = (x - startX.value) * 1.5;
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
@import url("../css/swimGraph/AicpuDetail/aicpuScheduleDetail.css");
</style>