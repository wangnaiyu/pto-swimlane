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
  <div class="time-range-graph-content">
    <div v-if="timelineGroups.length > 0" ref="timelineContainer" class="timeline-container">
      <div class="timeline-header mr20">
        <div class="label">{{ timeConsumingLabel }}</div>
        <div class="ticks">
          <div v-for="(tick, index) in ticks" :key="index" class="tick" :style="{ '--pos': tick.pos }">
            <span :style="{ 'padding-left': index === ticks.length  - 1 ? '15px' : '' }">{{ tick.label }}</span>
            <div class="line"></div>
          </div>
        </div>
      </div>
      <div v-for="group in timelineGroups" :key="group.id" class="timeline-group mr20 time-group-height">
        <div class="id-row">
          <d-tooltip :content="String(group.id)">
            <div class="label-header" @click="drillDownSubGraphTiming(group)" :class="{ 'label-cursor': state.timeType.value === 'id' }">
            {{ group.id }}
            </div>
          </d-tooltip>
          <div class="progress-container mt0">
            <d-tooltip :content="group.tooltipText" v-if="group.showMarker">
            <div class="progress-bar" :style="{ left: group.start + '%', width: group.width }" v-if="group.showMarker">
                <div class="text">{{ group.text }}</div>
            </div>
            </d-tooltip>
            <d-tooltip :content="group.tooltipText" v-if="group.showMarker">
              <div class="dot" :style="{ left: group.start + '%', '--base-bg-range-color': getBaseColor(group.event)}"></div>
            </d-tooltip>
            <d-tooltip :content="group.tooltipText">
              <div class="dot" :style="{ left: group.width , '--base-bg-range-color': getBaseColor(group.event) }"></div>
            </d-tooltip>
          </div>
        </div>
        <div class="marker-row">
          <div class="label"></div>
          <div class="markers">
            <div v-for="(marker, idx) in group.markers" :key="idx" class="time-range-marker">
              <div v-if="marker.showMarker" class="marker" :class="{ 'disabled': isPathLockStatus }" :style="{ left: marker.left, '--base-bg-range-color': getBaseColor(group.event) }">
              <d-tooltip :content="marker.globalText">
                <div class="text" @click="clickTask(marker.event)">{{ marker.text }}</div>
              </d-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-data-style">{{ $t('noDataText') }}</div>
  </div>
</template>
<script setup>
import { ref, inject, onMounted, watch, onUnmounted, computed } from 'vue';
import { getSubGraphId, getEventColorByMode } from '../../swimGraphProcesses/processInfo';
import { useI18n } from 'vue-i18n';
import { executionTimeData, formatTimeUnit, formatTimeValue, US_TO_MS_THRESHOLD, US_TO_S_THRESHOLD, UNIT_MS, UNIT_S } from '../utils';
import { swimDataManager } from '../../swimData';

const { t: $t } = useI18n();
const state = inject('subGraphTimingState');
const { clickTask } = inject('swimGraphPmuBarMethod');
const {
  isE2ESwim,
  kernelColorRending,
  isPathLockStatus,
  hashOrderRending,
} = inject('swimGraphState');
const { isDarkTheme } = inject('root');
const timeConsumingLabel = computed(() =>
  state.timeType.value === 'id' ? $t('subGraphId') : $t('taskLabel')
);
const ticks = ref([
  { pos: '0%', label: '+0us' },
  { pos: '33.33%', label: '+20us' },
  { pos: '66.66%', label: '+40us' },
  { pos: '99.99%', label: '+60us' },
]);
const mod = 1000;
const timelineGroups = ref([
  {
    id: 0,
    start: 0,
    width: 33.33,
    text: 'Text 0',
    markers: [
      { pos: 0, text: 'Marker 0' },
      { pos: 33.33, text: 'Marker 1' },
    ],
  },
  {
    id: 1,
    start: 0,
    width: 67,
    text: 'Text 1',
    markers: [
      { pos: 0, text: 'Marker 0' },
      { pos: 67, text: 'Marker 1' },
    ],
  },
]);
const emit = defineEmits(['update-data']);
const isProcessing = ref(false);
const drillDownSubGraphTiming = (group) => {
  if (isProcessing.value) {
    return;
  }
  isProcessing.value = true;
  emit('update-data', {
    id: group.id,
    timelineGroups,
    color: isDarkTheme.value ? group.event.color.dark.base :  group.event.color.light.base
  });
  setTimeout(() => {
    isProcessing.value = false;
  }, 0);
};
const timelineContainer = ref(null);
const updateLineHeight = () => {
  if (!timelineContainer.value) {
    return;
  }
  setTimeout(() => {
    const height = timelineContainer.value.scrollHeight;
    timelineContainer.value.style.setProperty('--container-height', `${height}px`);
  }, 0);
};
onMounted(() => {
  updateLineHeight();
  window.addEventListener('resize', updateLineHeight);
  initData();
});
const initData = () => {
  const validatedTimelineGroup = executionTimeData.timelineGroupsMap.size > 0 && executionTimeData.timelineGroupsMap.has(state.timeType.value);
  const validatedTick = executionTimeData.ticksMap.size > 0 && executionTimeData.ticksMap.has(state.timeType.value);
  if (validatedTimelineGroup && validatedTick) {
    timelineGroups.value = executionTimeData.timelineGroupsMap.get(state.timeType.value);
    ticks.value = executionTimeData.ticksMap.get(state.timeType.value);
    return;
  }
  const groups = new Map();
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if (isE2ESwim.value && process.type === 'aicpu') {
      continue;
    }
    for (const [threadKey, thread] of process.threads.entries()) {
      if (thread.isCounter) {
        continue;
      }
      for (const eventId of thread.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        processEvent(event, groups);
      }
    }
  }
  const { timelineList, globalMaxDuration } = buildTimelineGroups(groups);
  timelineGroups.value = timelineList;
  executionTimeData.timelineGroupsMap.set(state.timeType.value, [...timelineGroups.value]);
  ticks.value = getTicks(globalMaxDuration);
  executionTimeData.ticksMap.set(state.timeType.value, [...ticks.value]);
};
const processEvent = (event, groups) => {
  if (event?.isFakeCore || event.ph === 'C') {
    return;
  }
  if (event?.originalThreadName) {
    return;
  }
  let leafIndex = '';
  if (state.timeType.value === 'id') {
    leafIndex = event.leafIndex || getSubGraphId(event, 'subGraph', '/');
    state.leafIndexName.value = event.leafIndex ? $t('subgraphBasedLeafIndex') : $t('subgraphBasedName');
  } else {
    const match = event.name.match(/\((?<opName>[^)]+)\)/);
    leafIndex = match?.groups?.opName ?? '';
  }
  if (leafIndex === '' || (typeof leafIndex === 'number' && Number.isNaN(leafIndex))) {
    return;
  }
  const taskDur = event.duration ?? (event.endTime - event.startTime);
  if (!groups.has(leafIndex)) {
    groups.set(leafIndex, {
      min: taskDur,
      max: taskDur,
      nameMin: event.name,
      nameMax: event.name,
      eventMin: event,
      eventMax: event
    });
  } else {
    const current = groups.get(leafIndex);
    const updated = { ...current };
    if (taskDur < current.min) {
      updated.min = taskDur;
      updated.nameMin = event.name;
      updated.eventMin = event;
    }
    if (taskDur > current.max) {
      updated.max = taskDur;
      updated.nameMax = event.name;
      updated.eventMax = event;
    }
    groups.set(leafIndex, updated);
  }
};
const buildTimelineGroups = (groups) => {
  let globalMaxDuration = 0;
  for (const { min, max } of groups.values()) {
    globalMaxDuration = Math.max(globalMaxDuration, max - min);
  }
  if (globalMaxDuration === 0) {
    globalMaxDuration = 1;
  }
  const maxDurationUs = globalMaxDuration / mod;
  let maxAxisUs;
  if (maxDurationUs <= 5) {
    maxAxisUs = Math.ceil(maxDurationUs);
  } else if (maxDurationUs <= 10) {
    maxAxisUs = 10;
  } else {
    maxAxisUs = Math.ceil(maxDurationUs / 10) * 10;
  }
  globalMaxDuration = maxAxisUs * mod;
  const TEXT_FULL_THRESHOLD_PERCENT = state.isWideScreen.value ?  34 : 65;
  const TEXT_SHORT_THRESHOLD_PERCENT = state.isWideScreen.value ? 24 : 46;
  const TEXT_NUMBER_THRESHOLD_PERCENT = state.isWideScreen.value ? 18 : 34;
  const timelineList = Array.from(groups.entries()).map(([leafIndex, data]) => {
    const { min, max, nameMin, nameMax, eventMin, eventMax } = data;
    const showMarkerFlag = nameMin !== nameMax;
    const diff = !showMarkerFlag ? max : max - min;
    const diffWidthPercent = (diff / globalMaxDuration) * 100;
    const diffClampedWidth = Math.min(diffWidthPercent, 100);
    const MIN_PIXEL_DISTANCE = 82;
    const minDiffForSpacing = (MIN_PIXEL_DISTANCE / 100) * globalMaxDuration;
    const needsOffset = diff < minDiffForSpacing;
    const minText = min / mod;
    const maxText = max / mod;
    const diffText = showMarkerFlag ? diff / mod : 0;
    let displayText = '';
    if (diffClampedWidth >= TEXT_FULL_THRESHOLD_PERCENT) {
      displayText = `${$t('timeRange')} ${formatTimeValue(formatMicroseconds(diffText))} ${formatTimeUnit(formatMicroseconds(diffText))}`;
    } else if (diffClampedWidth >= TEXT_SHORT_THRESHOLD_PERCENT) {
      displayText = `${formatTimeValue(formatMicroseconds(diffText))} ${formatTimeUnit(formatMicroseconds(diffText))}`;
    } else if (diffClampedWidth >= TEXT_NUMBER_THRESHOLD_PERCENT) {
      displayText = `${formatTimeValue(formatMicroseconds(diffText))}`;
    } else {
      displayText = '';
    }
    let maxMarkerLeft;
    if (!showMarkerFlag) {
      maxMarkerLeft = '-41px';
    } else if (needsOffset) {
      maxMarkerLeft = '42px';
    } else {
      maxMarkerLeft = `calc(${diffClampedWidth}% - 51px)`;
    }
    return {
      id: leafIndex,
      start: 0,
      width: showMarkerFlag ? `calc(${diffClampedWidth}%)` : 0,
      tooltipText: `${$t('timeRange')} ${formatTimeValue(formatMicroseconds(diffText))} ${formatTimeUnit(formatMicroseconds(diffText))}`,
      text: displayText, 
      event: eventMin,
      showMarker: showMarkerFlag,
      markers: [
        {
          globalText: `${nameMin} (${formatTimeValue(formatMicroseconds(minText))} ${formatTimeUnit(formatMicroseconds(minText))})`,
          text: `${truncateWithEllipsis(nameMin)} (${formatTimeValue(formatMicroseconds(minText))} ${formatTimeUnit(formatMicroseconds(minText))})`,
          left: `calc(0% - 41px)`,
          event: eventMin,
          showMarker: showMarkerFlag
        },
        {
          globalText: `${nameMax} (${formatTimeValue(formatMicroseconds(maxText))} ${formatTimeUnit(formatMicroseconds(maxText))})`,
          text: `${truncateWithEllipsis(nameMax)} (${formatTimeValue(formatMicroseconds(maxText))} ${formatTimeUnit(formatMicroseconds(maxText))})`,
          left: maxMarkerLeft,
          event: eventMax,
          showMarker: true
        }
      ]
    };
  });
  if (state.timeType.value === 'id') {
    timelineList.sort((a, b) => a.id - b.id);
  } else {
    timelineList.sort((a, b) => a.id.localeCompare(b.id));
  }
  return { timelineList, globalMaxDuration };
};
const truncateWithEllipsis = (str, maxLength = 2) => {
  if (!str || str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
};
const formatMicroseconds = (value) => {
  return parseFloat(value.toFixed(1));
};
const getTicks = (globalMaxDuration) => {
  const maxDurationUs = globalMaxDuration / mod;
  const unit = formatTimeUnit(maxDurationUs);
  const divisor = unit === UNIT_S ? US_TO_S_THRESHOLD : unit === UNIT_MS ? US_TO_MS_THRESHOLD : 1;
  let numTicks;
  let stepUs;
  if (maxDurationUs <= 5) {
    numTicks = Math.ceil(maxDurationUs) + 1;
    stepUs = maxDurationUs / (numTicks - 1);
  } else if (maxDurationUs <= 10) {
    numTicks = 6;
    stepUs = 2;
  } else {
    if (maxDurationUs % 3 === 0) {
      numTicks = 4;
    } else {
      numTicks = 6;
    }
    stepUs = maxDurationUs / (numTicks - 1);
  }
  return Array.from({ length: numTicks }, (_, i) => {
    const valUs = Math.round(i * stepUs);
    const displayValue = parseFloat((valUs / divisor).toFixed(3));
    const isLast = i === numTicks - 1;
    let label;
    if (valUs === 0) {
      label = '0';
    } else if (isLast) {
      label = `+${displayValue} ${unit}`;
    } else {
      label = `+${displayValue}`;
    }
    return {
      pos: `${(i / (numTicks - 1) * 100).toFixed(2)}%`,
      label
    };
  });
};
watch(timelineGroups, updateLineHeight);
watch(
  () => state.timeType.value,
  (newVal, oldVal) => {
    initData();
    if (!timelineContainer.value) {
      return;
    }
    timelineContainer.value.style.removeProperty('--container-height');
  }
);
onUnmounted(() => {
  window.removeEventListener('resize', updateLineHeight);
});
const getBaseColor = (event) => {
  if (!event) {
    return undefined;
  }
  if (!event.color || !event.color.dark) {
    const process = Array.from(swimDataManager.getAllProcesses().values()).find(p => p.pid === event.pid);
    const processType = process?.type || process?.args?.type || 'kernel';
    event.color = getEventColorByMode(event, kernelColorRending.value, processType, hashOrderRending.value);
  }
  if (isDarkTheme.value) {
    return event.color.dark.base;
  } else {
    return event.color.light.base;
  }
};
</script>
<style lang="scss">
@import url("../../css/swimGraph/Header/timeRangeChart.css");
</style>