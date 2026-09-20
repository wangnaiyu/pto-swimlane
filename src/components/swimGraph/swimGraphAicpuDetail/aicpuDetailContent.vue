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
    <div class="content-one-pipe">
      <div class="pipe-content-title">
        <div class="pipe-title">
          <img class="picture" :src="tPath" alt="picture">
        </div>
        <div class="pipe-name">
          <d-tooltip :content="getEventDisplayName(canvasclickedEvent)">
            <div class="pipe-name-key" :class="{ 'centered': aicpuControlDetailsExpanded}">{{ getEventTruncateText(canvasclickedEvent) }}</div>
          </d-tooltip>
          <div v-if="!aicpuControlDetailsExpanded" class="pipe-schedule">
            <span class="schedule-key">Schedule: {{ getScheduleKey(canvasclickedEvent) }}</span>
          </div>
        </div>
      </div>
      <div class="pipe-content-stat">
        <div class="pipe-start">
          <span class="pipe-start-up">
              <span>Start</span><span class="ml5">({{ startTimeUnitInfo }})</span>
              <span class="arrow-right-top"><d-icon name="icon-arrow-right-l" class="right-button"></d-icon></span>
              <span>End</span><span class="ml5">({{ endTimeUnitInfo }})</span>
              <span class="arrow-right-top"><d-icon name="icon-arrow-right-l" class="right-button"></d-icon></span>
              <span>Duration</span><span class="ml5">({{ durationUnitInfo }})</span>
          </span>
          <span class="pipe-start-down">
              <d-tooltip :content=startTipTimeInfo>
                <span class="start-value-key">{{ startTimeInfo }}</span>
              </d-tooltip>
              <span class="arrow-right"><d-icon name="icon-arrow-right-l" class="right-button"></d-icon></span>
              <d-tooltip :content=endTipTimeInfo>
                <span class="start-value-key">{{ endTimeInfo }}</span>
              </d-tooltip>
              <span class="arrow-right"><d-icon name="icon-arrow-right-l" class="right-button"></d-icon></span>
              <d-tooltip :content=durationTipTimeInfo>
                <span class="start-value-key">{{ durationInfo }}</span>
              </d-tooltip>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getEventDisplayName } from '../swimGraphUtils';

const { t } = useI18n();
// 注入父组件提供的状态和方法
const {
    selectedEvent,
    isDarkTheme,
    viewState,
    aicpuControlDetailsExpanded,
    canvasclickedEvent,
    tsScale
} = inject('swimGraphState');

const {
    overflowText,
} = inject('swimGraphMethods');

let tPath = isDarkTheme.value ? ref(`${window.staticPath}/static-assets/circle.svg`) : ref(`${window.staticPath}/static-assets/circle_light.svg`);
let startTimeInfo = ref('0');
let startTimeUnitInfo = ref('us');
let endTimeInfo = ref('0');
let endTimeUnitInfo = ref('us');
let durationInfo = ref('0');
let durationUnitInfo = ref('us');
let startTipTimeInfo = ref('μs');
let endTipTimeInfo = ref('μs');
let durationTipTimeInfo = ref('μs');

const getEventTruncateText = (event) => {
  const eventName = getEventDisplayName(event);
  let actualWidth = 210;
  const [truncatedText] = overflowText(actualWidth, eventName);
  return truncatedText;
};

const getScheduleKey = (event) => {
  if (!event) {
    return '';
  }
  const name = event.originalThreadName || event.threadName;
  if (!name) {
    return '';
  }
  const match = name.match(/SCHED-?(?<num>\d+)/);
  return match ? `SCHED-${match.groups.num}` : '';
};

const aicpuFormatTimeWithUnit = (timeInNanoseconds) => {
  const nanoseconds = (timeInNanoseconds * 1000) / tsScale.value;
  const microseconds = nanoseconds / 1000;
  const milliseconds = microseconds / 1000;
  const seconds = milliseconds / 1000;
  const minutes = seconds / 60;
  if (!nanoseconds) {
     return {
      value: '', unit: ''
     };
  }
   if (minutes >= 1) {
    return { value: parseFloat(minutes.toFixed(2)), unit: 'min' };
  } else if (seconds >= 1) {
    return { value: parseFloat(seconds.toFixed(2)), unit: 's' };
  } else if (milliseconds >= 1) {
    return { value: parseFloat(milliseconds.toFixed(2)), unit: 'ms' };
  } else if (microseconds >= 1) {
    return { value: parseFloat(microseconds.toFixed(2)), unit: 'μs' };
  } else {
    return { value: parseFloat(nanoseconds.toFixed(2)), unit: 'ns' };
  }
};


watch(canvasclickedEvent, (newEvent) => {
  if (newEvent) {
    const startFormatted = aicpuFormatTimeWithUnit(canvasclickedEvent.value.startTime - viewState.minTime);
    const durationFormatted = aicpuFormatTimeWithUnit(canvasclickedEvent.value.duration);

    startTimeInfo.value = startFormatted.value;
    startTimeUnitInfo.value = startFormatted.unit;
    durationInfo.value = durationFormatted.value;
    durationUnitInfo.value = durationFormatted.unit;

    if (startFormatted.unit && startFormatted.unit === durationFormatted.unit) {
      endTimeInfo.value = parseFloat((startFormatted.value + durationFormatted.value).toFixed(2));
      endTimeUnitInfo.value = startFormatted.unit;
    } else {
      const endFormatted = aicpuFormatTimeWithUnit(canvasclickedEvent.value.endTime - viewState.minTime);
      endTimeInfo.value = endFormatted.value;
      endTimeUnitInfo.value = endFormatted.unit;
    }

    startTipTimeInfo.value = startFormatted.value + startFormatted.unit;
    durationTipTimeInfo.value = durationFormatted.value + durationFormatted.unit;
    endTipTimeInfo.value = endTimeInfo.value + endTimeUnitInfo.value;
  }
});

</script>

<style scoped lang="scss">
@import url("../css/swimGraph/AicpuDetail/aicpuContent.css");
</style>