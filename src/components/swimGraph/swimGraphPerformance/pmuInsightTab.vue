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
  <div class="summary-container pmu-tab-content" :style="{ width: performanceWidth + 'px' }">
    <template v-if="pmuInsight.hasData">
      <div class="pmu-group-panel" :style="{ width: isWideScreen ? '440px' : '330px' }">
        <strong>{{ deviceName }} <span class="pmu-group-badge">{{ groupLabel }}</span></strong>
        <div class="pmu-diagnosis-text">{{ $t('pmuG2Diagnosis') }}</div>
      </div>

      <template v-if="activePmuGroup === 'G2'">
        <PmuFullDataTable
          v-if="showFullDataTable"
          :tasks="pmuInsight.allTasks"
          :container-width="subContainerWidth"
          @back="showFullDataTable = false"
          @task-click="handleFullDataTaskClick"
        />
        <div v-else class="pmu-task-section" :style="{ width: subContainerWidth + 'px' }">
          <div class="pmu-task-section-header">
            <div class="pmu-task-section-title">{{ $t('pmuCycleGapTopTasks') }}</div>
            <div class="pmu-task-section-right">
              <d-icon name="view-report" size="16px"></d-icon>
              <span
                v-if="hasHiddenPmuTasks"
                class="pmu-toggle-full-data"
                @click="showFullDataTable = true"
              >{{ pmuShowAllTasks ? $t('pmuCollapseFullData') : $t('pmuViewFullData') }}</span>
            </div>
          </div>
          <div
            v-for="(task, index) in visiblePmuGapTasks"
            :key="task.id"
            class="pmu-task-card pmu-insight-clickable"
            :class="{ disabled: isPathLockStatus }"
            @click="clickPmuEvent(task.event)"
          >
            <div class="pmu-card-rank">{{ index + 1 }}</div>
            <div class="pmu-card-header">
              <div class="pmu-task-identity">
                <span class="pmu-lane-name">{{ task.laneName }}</span>
                <d-tooltip :content="task.taskName">
                  <span class="pmu-task-name">{{ task.taskName }}</span>
                </d-tooltip>
              </div>
              <d-tooltip :content="task.wrapLabel">
                <div v-if="task.event.args?.wrapId !== undefined && task.event.args?.wrapId !== null" class="pmu-wrap-badge">{{ task.wrapLabel }}</div>
              </d-tooltip>
            </div>
            <div class="pmu-card-metrics">
              <span class="pmu-card-metric">{{ $t('pmuTotalCost') }}</span>
              <span class="pmu-card-metric-value">{{ task.totalTime }}</span>
              <span class="pmu-card-metric-divider">|</span>
              <span class="pmu-card-metric">{{ $t('pmuClockCycle') }}</span>
              <span class="pmu-card-metric-value">{{ task.cycleTime }}</span>
            </div>
            <div class="pmu-card-metrics pmu-card-gap-row">
              <span class="pmu-card-metric">{{ $t('pmuCycleGap') }}</span>
              <span :class="task.gapClass">{{ task.gapText }} · {{ task.gapRatio }}</span>
            </div>
            <div class="pmu-card-divider"></div>
            <div class="pmu-stage-label">{{ $t('pmuLongestPipelineStage') }}</div>
            <div class="pmu-stage-row">
              <span class="pmu-stage-dot" style="background: rgba(246, 158, 57, 1)"></span>
              <span class="pmu-stage-name">{{ task.counterLabel }}</span>
              <span class="pmu-stage-value">{{ task.counterValue }} · {{ task.counterRatio }}</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="time-consuming-container-perform pmu-empty-container" :style="{ width: subContainerWidth + 'px' }">
        <div class="task-title">{{ $t('pmuGroupNotAvailable') }}</div>
      </div>
    </template>
    <div v-else class="time-consuming-container-perform pmu-empty-container" :style="{ width: subContainerWidth + 'px' }">
      <div class="task-title">{{ $t('pmuNoData') }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref} from 'vue';
import { useI18n } from 'vue-i18n';
import { swimDataManager } from '../swimData';
import PmuFullDataTable from './pmuFullDataTable.vue';

defineProps({
  performanceWidth: {
    type: Number,
    default: 0
  },
  subContainerWidth: {
    type: Number,
    default: 480
  }
});

const { t: $t } = useI18n();
const { isPathLockStatus, isWideScreen } = inject('swimGraphState');
const { clickTask } = inject('swimGraphPmuBarMethod', { clickTask: () => {} });

const PMU_REQUIRED_FIELDS = [
  'pmu_idc_aic_vec_busy_o', 'cube_instr_busy', 'scalar_instr_busy',
  'mte1_instr_busy', 'mte2_instr_busy', 'mte3_instr_busy',
  'pmu_fix_instr_busy', 'icache_req', 'icache_miss'
];

const activePmuGroup = ref('G2');
const pmuShowAllTasks = ref(false);
const showFullDataTable = ref(false);

const pmuInsight = reactive({
  hasData: false,
  gapTasks: [],
  allTasks: [],
  totalCount: 0
});

const visiblePmuGapTasks = computed(() => {
  return pmuShowAllTasks.value ? pmuInsight.allTasks : pmuInsight.gapTasks;
});

const hasHiddenPmuTasks = computed(() => {
  return pmuInsight.totalCount > 5;
});

const toFiniteNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatCycleNumber = (value) => {
  return Math.round(toFiniteNumber(value)).toLocaleString();
};

const formatRatioValue = (value) => {
  if (!Number.isFinite(value)) {
    return '/';
  }
  return `${(value * 100).toFixed(1)}%`;
};

const getPmuWrapLabel = (wrapId) => {
  return wrapId !== undefined && wrapId !== null ? `Wrap ${wrapId}` : 'Wrap /';
};

const isValidPmuProcess = (processInfo) => {
  const isValidType = ['kernel', '', undefined].includes(processInfo.type);
  const isPerfAicoreView = processInfo.type === 'PerfSwim' && processInfo.name === 'AICore View';
  return isValidType || isPerfAicoreView;
};

const hasPmuData = (event) => {
  if (!event?.pmu_info || Object.keys(event.pmu_info).length === 0) {
    return false;
  }
  return PMU_REQUIRED_FIELDS.some(field => toFiniteNumber(event.pmu_info[field]) > 0);
};

const normalizePmuLaneName = (laneName) => {
  if (!laneName) {
    return 'Unknown';
  }
  return String(laneName).replace(/^(?<type>AIC|AIV)(?<index>\d+)$/, '$<type>_$<index>');
};

const deviceName = computed(() => 'Dav_3510: ');
const groupLabel = computed(() => 'Group 2');

const getPmuTaskDisplayName = (event) => {
  return String(event?.name || event?.id || '/').split('(')[0].trim();
};

const derivePmuTask = (event, threadInfo) => {
  const pmuInfo = event.pmu_info;
  const totalCycle = toFiniteNumber(pmuInfo['total cycle']);
  const calculatedCycle = 
    toFiniteNumber(pmuInfo['pmu_idc_aic_vec_busy_o']) +
    toFiniteNumber(pmuInfo['cube_instr_busy']) +
    toFiniteNumber(pmuInfo['scalar_instr_busy']) +
    toFiniteNumber(pmuInfo['mte1_instr_busy']) +
    toFiniteNumber(pmuInfo['mte2_instr_busy']) +
    toFiniteNumber(pmuInfo['mte3_instr_busy']) +
    toFiniteNumber(pmuInfo['pmu_fix_instr_busy']);
  
  const newPmuFields = {
    ['pmu_idc_aic_vec_busy_o']: toFiniteNumber(pmuInfo['pmu_idc_aic_vec_busy_o']),
    ['cube_instr_busy']: toFiniteNumber(pmuInfo['cube_instr_busy']),
    ['scalar_instr_busy']: toFiniteNumber(pmuInfo['scalar_instr_busy']),
    ['mte1_instr_busy']: toFiniteNumber(pmuInfo['mte1_instr_busy']),
    ['mte2_instr_busy']: toFiniteNumber(pmuInfo['mte2_instr_busy']),
    ['mte3_instr_busy']: toFiniteNumber(pmuInfo['mte3_instr_busy']),
    ['pmu_fix_instr_busy']: toFiniteNumber(pmuInfo['pmu_fix_instr_busy'])
  };

  let maxNewPmuKey = 'pmu_idc_aic_vec_busy_o';
  let maxNewPmuValue = newPmuFields['pmu_idc_aic_vec_busy_o'];
  for (const [key, value] of Object.entries(newPmuFields)) {
    if (value > maxNewPmuValue) {
      maxNewPmuValue = value;
      maxNewPmuKey = key;
    }
  }

  return {
    id: event.id,
    event,
    taskName: getPmuTaskDisplayName(event),
    laneName: normalizePmuLaneName(event?.threadName || threadInfo?.threadName || event?.tid || 'Unknown'),
    wrapLabel: getPmuWrapLabel(event.args?.wrapId),
    totalCycle,
    calculatedCycle,
    newDominantCounterKey: maxNewPmuKey,
    newDominantCounterValue: maxNewPmuValue
  };
};

const collectPmuTasks = () => {
  const tasks = [];
  for (const [, processInfo] of Array.from(swimDataManager.processInfo.entries())) {
    if (!isValidPmuProcess(processInfo)) {
      continue;
    }
    for (const threadInfo of Array.from(processInfo.threads.values())) {
      if (threadInfo.isCounter || threadInfo.threadName.includes('Fake Core')) {
        continue;
      }
      for (const eventId of threadInfo.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        if (!hasPmuData(event)) {
          continue;
        }
        tasks.push(derivePmuTask(event, threadInfo));
      }
    }
  }
  return tasks;
};

const buildPmuGapTasks = (tasks, limit = 5) => {
  const filteredTasks = limit > 0 
    ? tasks.filter(task => task.calculatedCycle < task.totalCycle)
    : tasks;

  const sortedTasks = [...filteredTasks].sort((left, right) => {
    const leftRatio = left.totalCycle > 0 ? Math.abs((left.calculatedCycle - left.totalCycle) / left.totalCycle) : 0;
    const rightRatio = right.totalCycle > 0 ? Math.abs((right.calculatedCycle - right.totalCycle) / right.totalCycle) : 0;
    return rightRatio - leftRatio;
  });
  const tasksToProcess = limit > 0 ? sortedTasks.slice(0, limit) : sortedTasks;

  return tasksToProcess.map((task) => {
    const gapValue = task.calculatedCycle - task.totalCycle;
    const gapSign = gapValue > 0 ? '+' : '';
    const gapText = gapSign + formatCycleNumber(gapValue);
    const gapRatio = task.totalCycle > 0 ? gapValue / task.totalCycle : 0;

    const pmuFields = {
      ['pmu_idc_aic_vec_busy_o']: toFiniteNumber(task.event.pmu_info['pmu_idc_aic_vec_busy_o']),
      ['cube_instr_busy']: toFiniteNumber(task.event.pmu_info['cube_instr_busy']),
      ['scalar_instr_busy']: toFiniteNumber(task.event.pmu_info['scalar_instr_busy']),
      ['mte1_instr_busy']: toFiniteNumber(task.event.pmu_info['mte1_instr_busy']),
      ['mte2_instr_busy']: toFiniteNumber(task.event.pmu_info['mte2_instr_busy']),
      ['mte3_instr_busy']: toFiniteNumber(task.event.pmu_info['mte3_instr_busy']),
      ['pmu_fix_instr_busy']: toFiniteNumber(task.event.pmu_info['pmu_fix_instr_busy'])
    };
    const pmuSum = Object.values(pmuFields).reduce((sum, val) => sum + val, 0);
    const counterRatio = pmuSum > 0 ? task.newDominantCounterValue / pmuSum : 0;

    return {
      id: task.id,
      event: task.event,
      laneName: task.laneName,
      taskName: task.taskName,
      wrapLabel: task.wrapLabel,
      totalTime: formatCycleNumber(task.totalCycle),
      cycleTime: formatCycleNumber(task.calculatedCycle),
      gapText,
      gapRatio: formatRatioValue(gapRatio),
      gapClass: gapValue < 0 ? 'pmu-gap-negative' : 'pmu-gap-positive',
      counterLabel: task.newDominantCounterKey,
      counterValue: formatCycleNumber(task.newDominantCounterValue),
      counterRatio: formatRatioValue(counterRatio)
    };
  });
};

const calculatePmuInsight = () => {
  const tasks = collectPmuTasks();
  if (tasks.length === 0) {
    Object.assign(pmuInsight, { hasData: false, gapTasks: [], allTasks: [], totalCount: 0 });
    return;
  }
  pmuShowAllTasks.value = false;
  Object.assign(pmuInsight, {
    hasData: true,
    gapTasks: buildPmuGapTasks(tasks, 5),
    allTasks: buildPmuGapTasks(tasks, 0),
    totalCount: tasks.length
  });
};

const clickPmuEvent = (event) => {
  if (!event || isPathLockStatus.value) {
    return;
  }
  clickTask(event, true);
};

const handleFullDataTaskClick = (task) => {
  if (task.event) {
    clickPmuEvent(task.event);
  }
};

onMounted(() => {
  calculatePmuInsight();
});
</script>

<style lang="scss" scoped>
.summary-container {
  overflow-y: auto;
  height: calc(100vh - 110px);
}

.time-consuming-container-perform {
  margin-top: 12px;
  width: 440px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  border: 1px solid var(--devui-category-search-bg);
  border-radius: 8px;
  background: var(--devui-category-search-bg);
}

.task-title {
  height: 18px;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  font-weight: 400;
  gap: 1px;
  display: flex;
  flex-direction: row;
  white-space: nowrap;
}

.disabled {
  cursor: not-allowed !important;
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
}

.pmu-tab-content {
  padding-top: 8px;
  box-sizing: border-box;
}

.pmu-group-panel {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--devui-swim-split-line);
}

.pmu-group-panel strong,
.pmu-group-panel .pmu-diagnosis-text {
  position: relative;
  z-index: 1;
}

.pmu-diagnosis-text {
  color: var(--devui-secondary-text);
  font-size: 13px;
  line-height: 18px;
}

.pmu-group-badge {
  background: var(--devui-swim-split-line);
  border-radius: 5px;
  padding: 3px 8px;
}

.pmu-task-section {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pmu-task-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pmu-task-section-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pmu-task-section-title {
  color: var(--devui-text);
  font-size: 14px;
  font-weight: 700;
  line-height: 24px;
}

.pmu-toggle-full-data {
  color: var(--devui-text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.pmu-toggle-full-data:hover {
  color: var(--devui-brand);
  text-decoration: underline;
}

.pmu-task-card {
  position: relative;
  min-height: 132px;
  padding: 14px 16px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: var(--devui-category-search-bg);
  overflow: hidden;
  cursor: pointer;
}

.pmu-task-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pmu-card-rank {
  position: absolute;
  right: 18px;
  bottom: -18px;
  color: rgba(255, 255, 255, 0.03);
  font-size: 88px;
  font-weight: 700;
  line-height: 88px;
  pointer-events: none;
}

.pmu-card-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.pmu-task-identity {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.pmu-lane-name {
  color: var(--devui-secondary-text);
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  white-space: nowrap;
}

.pmu-task-name {
  min-width: 0;
  color: var(--devui-text);
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pmu-wrap-badge {
  width: 90px;
  flex: 0 0 90px;
  padding: 3px 8px;
  box-sizing: border-box;
  border-radius: 5px;
  background: var(--devui-swim-split-line);
  color: var(--devui-secondary-text);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pmu-card-metrics {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0 7px;
  color: var(--devui-secondary-text);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
}

.pmu-card-metric {
  flex: 0 0 auto;
}

.pmu-card-metric-value {
  flex: 0 0 auto;
  color: var(--devui-text);
}

.pmu-card-metric-divider {
  flex: 0 0 auto;
  color: var(--devui-secondary-text);
}

.pmu-card-gap-row {
  margin-top: 6px;
}

.pmu-card-gap-row .pmu-card-metric {
  color: var(--devui-secondary-text);
}

.pmu-gap-negative {
  color: rgba(238, 105, 111, 1);
}

.pmu-gap-positive {
  color: var(--devui-text);
}

.pmu-card-divider {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  border-top: 1px dashed var(--devui-secondary-text);
}

.pmu-stage-label {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  color: var(--devui-secondary-text);
  font-size: 12px;
  line-height: 16px;
}

.pmu-stage-row {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  display: grid;
  grid-template-columns: 14px minmax(96px, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: var(--devui-text);
  font-size: 14px;
  line-height: 20px;
}

.pmu-stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.pmu-stage-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pmu-stage-value {
  color: var(--devui-text);
  white-space: nowrap;
}

.pmu-empty-container {
  margin-top: 12px;
  height: auto;
}
</style>
