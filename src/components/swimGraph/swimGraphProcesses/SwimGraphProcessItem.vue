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
  <div class="process-section">
    <!-- 进程头部 -->
    <span :data-processKey="processKey" :data-process="processKey"></span>
    <swim-graph-process-header 
      v-if="labelRender"
      :process-key="processKey" 
      :process="process"
    />

    <!-- 线程和事件区域 -->
    <div class="threads-container" v-if="hasThreads" v-show="isExpanded">
      <!-- 线程标签区域 -->
      <swim-graph-thread-labels 
        v-if="labelRender"
        :process-key="processKey" 
        :process="process"
      />

      <!-- 线程事件区域 -->
      <swim-graph-thread-events 
        :process-key="processKey" 
        :process="process"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject, provide, ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import SwimGraphProcessHeader from './swimGraphProcessHeader.vue';
import SwimGraphThreadLabels from './swimGraphThreadLabels.vue';
import SwimGraphThreadEvents from './swimGraphThreadEvents.vue';

const props = defineProps({
  process: {
    type: Object,
    required: true
  },
  processKey: {
    type: String,
    required: true
  },
  labelRender: {
    type: Boolean,
    default: true
  }
});

const { t: $t } = useI18n();

const {
  processExpanded,
  isDeviceView,
} = inject('swimGraphState');

const isExpanded = computed(() => {
  return processExpanded.get(props.processKey);
});

const hasThreads = computed(() => {
  return props.process && props.process.threads && props.process.threads.size > 0;
});

const cycleDisplay = ref('none');
const selectedOption = ref(isDeviceView.value ? 'execUtilization' : 'clockCycle');
const selectOptions = computed(() => {
  if (isDeviceView.value) {
    return [
      { name: $t('execUtilization'), value: 'execUtilization', disabled: false },
    ];
  }
  return[
    { name: $t('clockCycle'), value: 'clockCycle', disabled: false },
    { name: $t('cacheHit'), value: 'cacheHit', disabled: false },
    { name: $t('task'), value: 'task', disabled: false },
    { name: $t('utilization'), value: 'utilization', disabled: false },
  ];
});
const options = reactive(selectOptions.value);

onMounted(() => {
  if (isDeviceView.value) {
    selectedOption.value = 'execUtilization';
  }
});

provide('swimCycleDisplay', { 
  cycleDisplay, 
  selectedOption, 
  options 
});

</script>

<style scoped>
@import url("../css/swimGraph/Processes/processes.css");
</style>
