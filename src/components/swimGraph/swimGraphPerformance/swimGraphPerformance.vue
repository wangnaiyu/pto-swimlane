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
  <div v-if="true" 
    :style="{width: performanceWidth + 'px', height: '100%'}" 
    class="pmu-report">
    <div class="close-container">
      <d-icon name="close" operable @click="closeStatistics"></d-icon>
    </div>
    <div class="report-title">
      <d-icon name="line-chart" size="18px" color="var(--devui-overlay-icon)"></d-icon>
      {{ reportTitle }}
    </div>
    <d-tabs class="report-tabs" type="pills" v-model="reportTabId">
      <d-tab class="first-child" id="tab1" :title=PerformanceSummary>
      <div class="summary-container" :style="{width: performanceWidth + 'px'}">
        <div class="scheduling-gap-container-perform"
        v-if="maxGap.length > 0"
        :style="{width: subContainerWidth + 'px'}">
          <div class="left-scheduling-gap-container">
            <div class="time-task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title">{{maxSchedulingGap}}({{ formatGapUnit(maxGap[0]?.gap) }})</div>
              <div class="task-data" v-if="maxGap.length > 0">{{ formatGapValueWithUnit(maxGap[0].gap) }}</div>
            </div>
          </div>
          <div class="split-line" :style="{ height: `${54 + 52 * (maxGap.length -1 )}px` }"/>
          <div class="right-scheduling-gap-container" :style="{width: rightSchedulingGapContainerWidth + 'px'}">
            <div class="scheduling-gap-title">
              <div class="scheduling-gap-title-item">{{schedulingTask}}</div>
              <div class="scheduling-gap-title-item">{{schedulingSubTask}}</div>
            </div>
            <div class="max-scheduling-gap">
              <div v-for="(item, index) in maxGap" :key="index" class="max-scheduling-gap-item">
                <d-tooltip :content="item.parent.name">
                  <div class="max-scheduling-gap-item-task" :class="{ 'disabled': isPathLockStatus }" @click="showMaxSchedule(item)"
                  :style="{
                    '--base-bg-color': baseColor(item.parent),
                    '--hover-bg-color': lightColor(item.parent)
                  }">
                    <div class="max-scheduling-gap-item-task-text">{{item.parent.name}}</div>
                  </div>
                </d-tooltip>
                <div class="max-scheduling-gap-item-middle-container">
                  <div class="max-scheduling-gap-item-time">{{SchedulingGap}}{{parseFloat((item.gap / tsScale).toFixed(3))}} μs</div>
                  <div class="max-scheduling-gap-item-line"
                      :style="{
                      '--left-color': baseColor(item.parent),
                      '--right-color': baseColor(item.child),
                      width: gapLineWidth + 'px'
                    }"></div>
                </div>
                <d-tooltip :content="item.child.name">
                  <div class="max-scheduling-gap-item-task" :class="{ 'disabled': isPathLockStatus }" @click="showMaxSchedule(item, true)"
                    :style="{
                    '--base-bg-color': baseColor(item.child),
                    '--hover-bg-color': lightColor(item.child)
                  }">
                  <div class="max-scheduling-gap-item-task-text">{{item.child.name}}</div>
                  </div>
                </d-tooltip>
              </div>
            </div>
          </div>
        </div>

        <div class="time-consuming-container-perform"
        :style="{width: subContainerWidth + 'px'}" v-if="maxTimeTask.length > 0 && !isMsProf">

          <div class="task-statistic-item">
            <div class="left-scheduling-gap-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="time-task-item-container" :style="{width: innerContainerWidth + 'px'}">
                <div class="task-title">{{TaskMaxDuration}}({{ formatTimeUnit(maxTimeTaskVal) }})</div>
                <div class="task-data">{{ formatTimeValue(maxTimeTaskVal) }}</div>
              </div>
            </div>
            <div class="time-consuming-split-line"/>
            <div class="right-scheduling-gap-container" :style="{width: timeRightSchedulingGapContainerWidth + 'px'}">
              <div class="scheduling-gap-title">
                <div class="scheduling-gap-title-item">{{schedulingTask}}</div>
              </div>
              <div class="time-consuming-tasks-container">
                <d-tooltip v-for="(item, index) in maxTimeTask" :key="index" :content="item.name">
                  <div 
                    class="time-consuming-task"
                    :style="{
                    '--base-bg-color': baseColor(item),
                     '--hover-bg-color': lightColor(item),
                     width: timeConsumingTaskWidth +'px'
                    }"
                    :class="{ 'disabled': isPathLockStatus }"
                    @click="clickTask(item)">{{item.name}}</div>
                </d-tooltip>
              </div>
            </div>
          </div>

          <div class="task-statistic-item">
            <div class="left-scheduling-gap-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="time-task-item-container" :style="{width: innerContainerWidth + 'px'}">
                <div class="task-title">{{TaskMinDuration}}({{ formatTimeUnit(minTimeTaskVal) }})</div>
                <div class="task-data">{{ formatTimeValue(minTimeTaskVal) }}</div>
              </div>
            </div>
            <div class="time-consuming-split-line"/>
            <div class="right-scheduling-gap-container" :style="{width: timeRightSchedulingGapContainerWidth + 'px'}">
              <div class="scheduling-gap-title">
                <div class="scheduling-gap-title-item">{{schedulingTask}}</div>
              </div>
              <div class="time-consuming-tasks-container">
                <d-tooltip v-for="(item, index) in minTimeTask" :key="index" :content="item.name">
                  <div 
                    class="time-consuming-task"
                    :style="{
                    '--base-bg-color': baseColor(item),
                     '--hover-bg-color': lightColor(item),
                     width: timeConsumingTaskWidth +'px'
                    }"
                    :class="{ 'disabled': isPathLockStatus }"
                    @click="clickTask(item)">{{item.name}}</div>
                </d-tooltip>
              </div>
            </div>
          </div>

        </div>

        <div class="task-container" :style="{width: subContainerWidth + 'px'}" v-if="!isDeviceView">
          <div class="top-row-group" :style="{width: subContainerWidth + 'px', gap: aiCoreContainerColumnGap + 'px'}">
          <div class="task-item-container aicore-e2e-time" :style="{width: innerContainerWidth + 'px'}">
            <div class="task-title-container">
              <d-tooltip :content="taskOnBoardTimeTitle + ' (' + formatTimeUnit(taskOnBoardTime) + ')'">
                <div class="task-title">{{ taskOnBoardTimeTitle }} ({{ formatTimeUnit(taskOnBoardTime) }})</div>
              </d-tooltip>
                <d-tooltip :content="taskOnBoardTimeTip">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
            <div class="task-data">{{ taskOnBoardTime === -Infinity ? 0 : formatTimeValue(taskOnBoardTime) }}</div>
          </div>
          <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
            <div class="task-title-container">
              <div class="task-title">{{ totalTimeTitle }} ({{ formatTimeUnit(taskTime) }})</div>
                <d-tooltip :content="totalTimeTip">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
            <div class="task-data">{{ formatTimeValue(taskTime) }}</div>
          </div>
          </div>
          <div class="task-item-container mt10" :style="{width: innerContainerWidth + 'px'}">
            <div class="task-title">{{ icacheHitRateTitle }}</div>
            <div class="task-data">{{ icacheHitRate }}</div>
          </div>
        </div>
        <div class="Device-container" :style="{width: subContainerWidth + 'px'}" v-if="isDeviceView">
          <div class="aicore-container-column" :style="{gap: deviceContainerColumnGap + 'px'}">
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <d-tooltip :content="$t('AICPUExecution', {AICPUExecutionUint})">
                  <div class="task-title">{{ $t('AICPUExecution', {AICPUExecutionUint}) }}</div>
                </d-tooltip>
              </div>
              <div class="task-data">{{ formatTimeValue(AICPUExecutionTime) }}</div>
            </div>
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <div class="task-title">{{ $t('AICPUUtilization') }}</div>
              </div>
              <div class="task-data">{{ AICPUExecutionRate }}</div>
            </div>
          </div>
          <div class="aicore-container-column" :style="{height: 46 + 'px', marginTop: 8 + 'px', gap: deviceContainerColumnGap + 'px'}">
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <d-tooltip :content="$t('AICPUOverhead', {AICPUOverheadUint})">
                  <div class="task-title">{{ $t('AICPUOverhead', {AICPUOverheadUint}) }}</div>
                </d-tooltip>
                <d-tooltip :content="$t('AICPUOverheadTip')">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
              <div class="device-cube-rate-cycle" :class="{ 'light-theme': !isDarkTheme }">{{ formatTimeValue(AICPUBeforeHeadTime) }}</div>
            </div>
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <d-tooltip :content="$t('AICPUTail', {AICPUTailUint})">
                  <div class="task-title">{{ $t('AICPUTail', {AICPUTailUint}) }}</div>
                </d-tooltip>
                <d-tooltip :content="$t('AICPUTailTip')">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
              <div class="device-vec-rate-cycle" :class="{ 'light-theme': !isDarkTheme }">{{ formatTimeValue(AICPUAfterHeadTime) }}</div>
            </div>
          </div>
          <div class="cube-data-chart" :style="{width: cubeDataChartWidth + 'px'}">
            <div class="device-cube-time-bar" :style="{ width: deviceCubeTimeWidth + 'px' }">
              <div class="cube-time-num">{{ deviceCubeTimePercentage }}</div>
            </div>
            <div class="device-vector-time-bar" :style="{ width: deviceVectorTimeWidth + 'px' }">
              <div class="vector-time-num">{{ deviceVectorTimePercentage }}</div>
            </div>
          </div>
        </div>
        <div class="aicore-container" :style="{width: subContainerWidth + 'px'}" v-if="!isAicpu">
          <div class="aicore-container-column" :style="{gap: aiCoreContainerColumnGap + 'px'}">
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <div class="task-title">AICore Time({{ formatTimeUnit(aicoreTime) }})</div>
                <d-tooltip :content="$t('AICoreTimeTip')">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
              <div class="task-data">{{ formatTimeValue(aicoreTime) }}</div>
            </div>
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <div class="task-title">{{ aicoreRateTitle }}</div>
                <d-tooltip :content="$t('AICoreRateTip')">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
              <div class="task-data">{{ aicoreRate }}</div>
            </div>
          </div>
          <div class="aicore-container-column" :style="{height: 46 + 'px', marginTop: 8 + 'px', gap: aiCoreContainerColumnGap + 'px'}">
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <div class="task-title">Cube Cycles</div>
                <d-tooltip :content="$t('cubeTip')">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
              <div class="cube-rate-cycle">{{ cubeRateCycle }}</div>
            </div>
            <div class="task-item-container" :style="{width: innerContainerWidth + 'px'}">
              <div class="task-title-container">
                <div class="task-title">Vector Cycles</div>
                <d-tooltip :content="$t('vecTip')">
                  <d-icon name="helping" size="16px"></d-icon>
                </d-tooltip>
              </div>
              <div class="vec-rate-cycle">{{ vectorRateCycle }}</div>
            </div>
          </div>
          <div class="cube-data-chart" :style="{width: cubeDataChartWidth + 'px'}">
            <div class="cube-time-bar" :style="{ width: cubeTimeWidth + 'px' }">
              <div class="cube-time-num">{{ cubeTimePercentage }}</div>
            </div>
            <div class="vector-time-bar" :style="{ width: vectorTimeWidth + 'px' }">
              <div class="vector-time-num">{{ vectorTimePercentage }}</div>
            </div>
          </div>
        </div>
        <swim-graph-bar-chart ref="swimGraphBarChartComponent" v-if="pmuExist && iniComplete" />
      </div>
      </d-tab>
      <d-tab id="tab2" v-if="!isAicpu && !isPerfSwim" :title="$t('executionTime')">
        <div class="time-statistics-tab-content">
          <time-statistics/>
        </div>
      </d-tab>
      <d-tab id="tab3" v-if="pmuValid" title="PMU">
        <pmu-insight-tab
          :performance-width="performanceWidth"
          :sub-container-width="subContainerWidth"
        />
      </d-tab>
    </d-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, provide, inject, onMounted, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import BigNumber from 'bignumber.js';
import { getBaseColor, getLightColor } from '../swimGraphProcesses/processInfo';
import SwimGraphBarChart from '../swimGraphBarChart/swimGraphBarChart.vue';
import TimeStatistics from './timeStatistics/timeStatistics.vue';
import PmuInsightTab from './pmuInsightTab.vue';
import { executionTimeData, formatTimeUnit, formatTimeValue, US_TO_MS_THRESHOLD, US_TO_S_THRESHOLD, UNIT_US, UNIT_MS, UNIT_S } from './utils';
import { swimDataManager } from '../swimData';
import { eventTextSize } from '../swimGraphUtils';
const swimGraphBarChartComponent = ref(null);

const { t: $t } = useI18n();
const reportTabId = ref('tab1');

const pmuRowCoordList = ref([]);
const pmuColCoordList = ref([]);
const pmuRowCoordLoc = ref([]);
const pmuBarColorList = ref([]);
const pmuBarBorderColorList = ref([]);
const pmuChartDataLeft = ref([]);
const pmuChartDataRight = ref([]);
const pmuBackLineLoc = ref([]);

const pmuExist = ref(true);
const reportTitle = ref($t('PerformanceStatus'));
const icacheHitRateTitle = ref($t('ICacheHitRate'));
const aicoreRateTitle = ref($t('aiCoreUtilization'));
const occupyRateTitle = ref($t('occupyRateTitle'));
const taskOnBoardTimeTitle = ref($t('taskOnBoardTimeTitle'));
const taskOnBoardTimeTip = ref($t('taskOnBoardTimeTip'));
const totalTimeTitle = ref($t('totalTime'));
const totalTimeTip = ref($t('totalTimeTip'));
const taskTime = ref(0);
const taskOnBoardTime = ref(0);
const aicoreTime = ref(0);
const aicoreRate = ref(0);
const icacheHitRate = ref('/');

const AICPUExecutionTime = ref(0);
const AICPUExecutionRate = ref(0);
const AICPUBeforeHeadTime = ref(0);
const AICPUAfterHeadTime = ref(0);

const cubeTimeWidth = ref(203);
const vectorTimeWidth = ref(203);
const cubeTimePercentage = ref(50);
const vectorTimePercentage = ref(50);

const deviceCubeTimeWidth = ref(203);
const deviceVectorTimeWidth = ref(203);
const deviceCubeTimePercentage = ref(50);
const deviceVectorTimePercentage = ref(50);

const vectorRateWidth = ref(0);
const cubeRateWidth = ref(0);
const scalarRateWidth = ref(0);
const mte1RateWidth = ref(0);
const mte2RateWidth = ref(0);
const mte3RateWidth = ref(0);

const vectorRateCycle = ref('/');
const cubeRateCycle = ref('/');
const scalarRateCycle = ref('/');
const mte1RateCycle = ref('/');
const mte2RateCycle = ref('/');
const mte3RateCycle = ref('/');

const vectorRatePercentage = ref(0);
const cubeRatePercentage = ref(0);
const scalarRatePercentage = ref(0);
const mte1RatePercentage = ref(0);
const mte2RatePercentage = ref(0);
const mte3RatePercentage = ref(0);
const iniComplete = ref(false);
const AICPUExecutionUint = ref('μs');
const AICPUOverheadUint = ref('μs');
const AICPUTailUint = ref('μs');


const maxGap = ref([]);
const maxGapVal = ref(0);
const maxTimeTask = ref([]);
const maxTimeTaskVal = ref(0);
const minTimeTask = ref([]);
const minTimeTaskVal = ref(0);

const {
  pmuTotal,
  pmuValid
} = inject('swimGraphPmuTotal');

const {
  tsScale,
  viewState,
  isPerfSwim,
  sliderMax,
  sliderMaxCount,
  timeLineX,
  processExpanded,
  detailsPanelExpanded,
  selectedEvent,
  highlightedPaths,
  swimlaneContainer,
  isMeasureModel,
  measureDragStartX,
  measureDragEndX,
  isDarkTheme,
  mulDetailsExpanded,
  isLockStatus,
  isCfgEditing,
  isShortcutKeyShow,
  searchedEvent,
  isThreeColumn,
  fileName,
  isAicpu,
  isSwimGraphActive,
  isSwimFullscreen,
  isPathLockStatus,
  timelineComponent,
  layout,
  lane2line,
  performanceVisible,
  performanceWidth,
  isWideScreen,
  isMaxSchedule,
  isE2ESwim,
  childContextMap,
  kernelColorRending,
  isMixMode,
  canvasclickedEvent,
  isFromPerformanceClick,
  isFromPerformancePmuTabClick,
  isMsProf,
  isDeviceView
} = inject('swimGraphState');

const {
  showDependencies,
  selectEvent,
  toggleProcess,
  showMaxScheduleEvent,
  resetMaxScheduleState,
  scrollToEvent,
  canvasStatusReset,
  autoExpandkernelProcess
} = inject('swimGraphMethods');

provide('swimGraphPmuBarChartInfo', {pmuRowCoordList, pmuColCoordList, pmuRowCoordLoc, pmuBarColorList, pmuBarBorderColorList, pmuChartDataLeft, pmuChartDataRight, reportTitle, pmuBackLineLoc, isDarkTheme, pmuValid});

const schedulingTask = ref($t('schedulingTask'));
const schedulingSubTask = ref($t('schedulingSubTask'));
const maxSchedulingGap = ref($t('maxSchedulingGap'));
const SchedulingGap = ref($t('SchedulingGap'));
const TaskMinDuration = ref($t('TaskMinDuration'));
const TaskMaxDuration = ref($t('TaskMaxDuration'));
const PerformanceSummary = ref($t('PerformanceSummary'));

const clickTask = async (clickEvent, fromTab3 = false) => {
  isFromPerformanceClick.value = true;
  isFromPerformancePmuTabClick.value = fromTab3;
  let event = JSON.parse(JSON.stringify(clickEvent));
  if (isMaxSchedule.value) {
    resetMaxScheduleState();
  }
  const key = event.pid.toString();
  if (isE2ESwim.value) {
    await autoExpandkernelProcess();
  } else if (isPerfSwim.value && !processExpanded.get(key)) {
    toggleProcess(key);
    childContextMap.threadEvent.eraseEventLine('over');
    await nextTick();
  } else if (!processExpanded.get(key)){
    toggleProcess(key);
    childContextMap.threadEvent.eraseEventLine('over');
    await nextTick();
  }
  showDependencies(event, 'both');
  const wasPanelClosed = !detailsPanelExpanded.value;
  selectEvent(event, key);
  if (wasPanelClosed) {
    await new Promise(resolve => {
      const detailPanel = document.querySelector('.details-panel');
      if (detailPanel) {
        detailPanel.addEventListener('transitionend', resolve, { once: true });
        setTimeout(resolve, 350);
      } else {
        resolve();
      }
    });
  }
  scrollToEvent(event);
};

const showMaxSchedule = async (item, isChild = false) => {
  const key = item.child.pid.toString();
  if (!processExpanded.get(key)){
    toggleProcess(key);
    childContextMap.threadEvent.eraseEventLine('over');
    await nextTick();
  }
  canvasclickedEvent.value = isChild ? item.child : item.parent;
  const subParentEvents = swimDataManager.getSubEvents(item.parent.id);
  const subChildEvents = swimDataManager.getSubEvents(item.child.id);
  const useSubEvent = isChild && isMixMode?.value && swimDataManager.hasMixConfig();
  const parentEvent = useSubEvent && subParentEvents.length > 0
    ? subParentEvents[subParentEvents.length - 1]
    : item.parent;
  const childEvent = useSubEvent && subChildEvents.length > 0
    ? subChildEvents[0]
    : item.child;
  await showMaxScheduleEvent(parentEvent, childEvent);
  scrollToEvent(isChild ? childEvent : parentEvent);
};

const subContainerWidth = ref(480);
const subContainerGap = ref(16);
const innerContainerWidth = ref(109);
const timeConsumingTaskWidth = ref(276);
const cubeDataChartWidth = ref(450);
const aiCoreContainerColumnGap = ref(16);
const deviceContainerColumnGap = ref(16);
const rightSchedulingGapContainerWidth =ref(308);
const timeRightSchedulingGapContainerWidth = ref(308);
const gapLineWidth = ref(173.5);

SchedulingGap.value = isWideScreen.value? $t('SchedulingGap') : '';
subContainerWidth.value = isWideScreen.value? 440 : 330;
subContainerGap.value = isWideScreen.value? 16 : 8;
innerContainerWidth.value = isWideScreen.value? 109 : 101;
timeConsumingTaskWidth.value = isWideScreen.value? 268 : 160;
cubeDataChartWidth.value = isWideScreen.value? 450 : 270;
cubeTimeWidth.value = isWideScreen.value? 243 : 133;
vectorTimeWidth.value = isWideScreen.value? 243 : 133;
aiCoreContainerColumnGap.value = isWideScreen.value? 120 : 75;
deviceContainerColumnGap.value = isWideScreen.value? 110 : 65;
rightSchedulingGapContainerWidth.value = isWideScreen.value? 266: 150;
timeRightSchedulingGapContainerWidth.value = isWideScreen.value? 264: 160;
gapLineWidth.value = isWideScreen.value? 213.5 : 66.5;

const baseColor = (event) => {
  return getBaseColor(event, { processes: swimDataManager.getAllProcesses(), kernelColorRending, isDarkTheme });
};

const lightColor = (event) => {
  return getLightColor(event, { processes: swimDataManager.getAllProcesses(), kernelColorRending, isDarkTheme });
};

const closeStatistics = () => {
  performanceVisible.value = false;
  performanceWidth.value = 0;
};

const formatGapValue = (gap) => {
  return Number.isInteger(gap) ? gap : parseFloat(gap.toFixed(3));
};

const formatGapUnit = (gap) => {
  if (!gap) return UNIT_US;
  const valueInUs = gap / tsScale.value;
  if (valueInUs >= US_TO_S_THRESHOLD) return UNIT_S;
  if (valueInUs >= US_TO_MS_THRESHOLD) return UNIT_MS;
  return UNIT_US;
};

const formatGapValueWithUnit = (gap) => {
  if (!gap) return 0;
  const valueInUs = parseFloat((gap / tsScale.value).toFixed(3));
  if (valueInUs >= US_TO_S_THRESHOLD) {
    return parseFloat((valueInUs / US_TO_S_THRESHOLD).toFixed(3));
  }
  if (valueInUs >= US_TO_MS_THRESHOLD) {
    return parseFloat((valueInUs / US_TO_MS_THRESHOLD).toFixed(3));
  }
  return valueInUs;
};

const getEventDuration = (event) => {
  return event.duration || (event.endTime - event.startTime);
};

const updateExtremeValues = (
  event,
  taskDur,
  stats
) => {
  if (taskDur > stats.maxTime) {
    stats.maxTime = taskDur;
    stats.maxTimeEvents = [event];
  } else if (taskDur === stats.maxTime) {
    stats.maxTimeEvents.push(event);
  }

  if (taskDur < stats.minTime) {
    stats.minTime = taskDur;
    stats.minTimeEvents = [event];
  } else if (taskDur === stats.minTime) {
    stats.minTimeEvents.push(event);
  }
};

const calculateGapStatistics = (
  event,
  stats
) => {
  if (event.originalThreadName) {
    return;
  }
  for (const childId of event.dependencies.successors) {
    const child = swimDataManager.getEventById(childId);
    if (!child) {
      continue;
    }
    if (child.originalThreadName) {
      continue;
    }

    const gap = child.startTime - event.endTime;
    
    if (gap > stats.maxGap) {
      stats.maxGap = gap;
      stats.maxGapEvents = [{
        parent: event,
        child,
        gap: formatGapValue(gap)
      }];
    } else if (gap === stats.maxGap) {
      stats.maxGapEvents.push({
        parent: event,
        child,
        gap: formatGapValue(gap)
      });
    }
  }
};

const calculateStatistics = () => {
  const stats = {
    maxTime: -Infinity,
    minTime: Infinity,
    maxGap: -Infinity,
    maxTimeEvents: [],
    minTimeEvents: [],
    maxGapEvents: []
  };

  const mod = tsScale.value;

  for (const [processKey, processInfo] of Array.from(swimDataManager.processInfo.entries())) {
    if (isE2ESwim.value && processInfo.type !== 'kernel') {
      continue;
    }

    for (const threadInfo of Array.from(processInfo.threads.values())) {
      if (threadInfo.isCounter || threadInfo.threadName.includes('Fake Core')) {
        continue;
      }

      for (const eventId of threadInfo.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        if (!event) {
          continue;
        }
        if (event.originalThreadName) {
          continue;
        }

        const taskDur = getEventDuration(event);
        updateExtremeValues(event, taskDur, stats);
        calculateGapStatistics(event, stats);
      }
    }
  }

  const maxTimeTaskValue = stats.maxTime / mod;
  const minTimeTaskValue = stats.minTime / mod;

  maxGap.value = stats.maxGapEvents;
  maxTimeTask.value = stats.maxTimeEvents;
  maxTimeTaskVal.value = Number.isInteger(maxTimeTaskValue) ? maxTimeTaskValue : parseFloat(maxTimeTaskValue.toFixed(3));
  minTimeTask.value = stats.minTimeEvents;
  minTimeTaskVal.value = Number.isInteger(minTimeTaskValue) ? minTimeTaskValue : parseFloat(minTimeTaskValue.toFixed(3));
};


const calculateAicoreInfo = () => {
  let aicTaskTimeSum = 0;
  let totalCnt = 0;
  let minTs = Infinity;
  let maxTs = -Infinity;

  for (const [processKey, processInfo] of Array.from(swimDataManager.processInfo.entries())) {
    const isValidType = ['kernel', '', undefined].includes(processInfo.type);
    const isNotExcludedPerfSwim = processInfo.type === 'PerfSwim' && processInfo.name === 'AICore View';
    if (!isValidType && !isNotExcludedPerfSwim) {
      continue;
    }

    for (const threadInfo of Array.from(processInfo.threads.values())) {
      if (threadInfo.isCounter || threadInfo.threadName.includes('Fake Core')) {
        continue;
      }

      const threadName = threadInfo.threadName.toLowerCase();
      const parentThreadName = threadInfo.parentThreadName;
      const isMsProfAicOrAiv = parentThreadName && (parentThreadName.includes('-aic') || parentThreadName.includes('-aiv'));
      if (!threadName.startsWith('aic') && !threadName.startsWith('aiv') && !isMsProfAicOrAiv) {
        continue;
      }

      let threadTimeSum = 0;
      for (const eventId of threadInfo.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        if (!event) {
          continue;
        }
        if (event.originalThreadName) {
          continue;
        }

        threadTimeSum += event.duration || 0;
        minTs = Math.min(event.startTime, minTs);
        maxTs = Math.max(event.endTime, maxTs);
      }
      if (threadTimeSum > 0) {
        totalCnt += 1;
        aicTaskTimeSum += threadTimeSum;
      }
    }
  }

  aicoreTime.value = parseFloat((aicTaskTimeSum / tsScale.value).toFixed(2));
  const aicoreRateBigNumber = ((new BigNumber(aicTaskTimeSum)).dividedBy(new BigNumber(totalCnt * taskOnBoardTime.value))).div(new BigNumber(tsScale.value));
  aicoreRate.value = isMsProf.value ? '/' : parseFloat((aicoreRateBigNumber * 100).toFixed(2)) + '%';
};

const collectSortedEvents = (threadInfo) => {
  const events = [];
  for (const eventId of threadInfo.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event) {
      continue;
    }
    events.push(event);
  }
  events.sort((a, b) => a.startTime - b.startTime);
  return events;
};

const processAicpuThread = (threadName, events) => {
  const result = { executionTime: 0, schedExecTime: 0, schedThreadCount: 0 };
  const isAicpuCtrl0 = threadName === 'AICPU-CTRL-0';
  const isAicpuSched = threadName.startsWith('AICPU-SCHED-');
  if (!isAicpuCtrl0 && !isAicpuSched) {
    return result;
  }
  for (const event of events) {
    result.executionTime += event.duration || 0;
  }
  if (isAicpuSched) {
    result.schedThreadCount = 1;
    for (const event of events) {
      if (event.name && event.name.startsWith('DEV_TASK_SCHED_EXEC')) {
        result.schedExecTime += event.duration || 0;
      }
    }
  }
  return result;
};

const extractEventIndex = (eventName) => {
  if (!eventName) {
    return -1;
  }
  const match = eventName.match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : -1;
};

const isAicpuEvent = (event) => {
  return event.originalThreadName !== undefined && event.originalThreadName !== null;
};

const isKernelEvent = (event) => {
  return !isAicpuEvent(event);
};

const isBeginOrInitEvent = (eventName) => {
  if (!eventName) {
    return false;
  }
  return eventName.startsWith('BEGIN') || eventName.startsWith('INIT');
};

const hasKernelInRound = (events, startIndex, currentRound) => {
  for (let i = startIndex; i < events.length; i++) {
    const eventRound = extractEventIndex(events[i].name || '');
    if (eventRound !== -1 && eventRound !== currentRound) {
      break;
    }
    if (isKernelEvent(events[i])) {
      return true;
    }
  }
  return false;
};

const collectFirstValidRoundHeadTime = (events) => {
  let i = 0;

  let headTime = 0;
  while (i < events.length && isBeginOrInitEvent(events[i].name || '')) {
    headTime += events[i].duration || 0;
    i++;
  }

  if (i >= events.length) {
    return 0;
  }

  const firstRound = extractEventIndex(events[i].name || '');
  if (firstRound === -1) {
    if (isKernelEvent(events[i])) {
      return headTime;
    }
    return headTime + (events[i].duration || 0);
  }

  if (!hasKernelInRound(events, i, firstRound)) {
    while (i < events.length) {
      const currentRound = extractEventIndex(events[i].name || '');
      if (currentRound !== firstRound) {
        break;
      }
      if (!isKernelEvent(events[i])) {
        headTime += events[i].duration || 0;
      }
      i++;
    }
    const remainingHeadTime = collectFirstValidRoundHeadTime(events.slice(i));
    return headTime + remainingHeadTime;
  }

  for (let j = i; j < events.length; j++) {
    const eventRound = extractEventIndex(events[j].name || '');
    if (eventRound !== -1 && eventRound !== firstRound) {
      break;
    }
    if (isKernelEvent(events[j])) {
      break;
    }
    headTime += events[j].duration || 0;
  }

  return headTime;
};

const collectLastValidRoundTailTime = (events) => {
  if (events.length === 0) {
    return 0;
  }

  let kernelIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (isKernelEvent(events[i])) {
      kernelIndex = i;
      break;
    }
  }

  if (kernelIndex === -1) {
    return 0;
  }

  let validRound = -1;
  for (let i = kernelIndex + 1; i < events.length; i++) {
    if (!isKernelEvent(events[i])) {
      const round = extractEventIndex(events[i].name || '');
      if (round !== -1) {
        validRound = round;
        break;
      }
    }
  }

  if (validRound === -1) {
    return 0;
  }

  let tailTime = 0;
  for (let i = kernelIndex + 1; i < events.length; i++) {
    const eventRound = extractEventIndex(events[i].name || '');
    if (eventRound !== -1 && eventRound !== validRound) {
      break;
    }
    if (!isKernelEvent(events[i])) {
      tailTime += events[i].duration || 0;
    }
  }

  return tailTime;
};

const calculateDeviceBarMetrics = (beforeHead, afterHead) => {
  const deviceBarWidth = 450;
  const minBarWidth = 70;
  const deviceBarGap = 0;
  if (beforeHead + afterHead > 0) {
    const totalTime = beforeHead + afterHead;
    const rawCubeWidth = deviceBarWidth * beforeHead / totalTime;
    const rawVectorWidth = deviceBarWidth * afterHead / totalTime;
    deviceCubeTimePercentage.value = (beforeHead / totalTime * 100).toFixed(2) + '%';
    deviceVectorTimePercentage.value = String((100 - beforeHead / totalTime * 100).toFixed(2)) + '%';
    if (rawCubeWidth < minBarWidth && rawVectorWidth > minBarWidth) {
      deviceCubeTimeWidth.value = minBarWidth + deviceBarGap;
      deviceVectorTimeWidth.value = deviceBarWidth - minBarWidth;
    } else if (rawVectorWidth < minBarWidth && rawCubeWidth > minBarWidth) {
      deviceVectorTimeWidth.value = minBarWidth + deviceBarGap;
      deviceCubeTimeWidth.value = deviceBarWidth - minBarWidth;
    } else {
      deviceCubeTimeWidth.value = rawCubeWidth;
      deviceVectorTimeWidth.value = rawVectorWidth;
    }
  } else {
    deviceCubeTimePercentage.value = '--';
    deviceVectorTimePercentage.value = '--';
    deviceCubeTimeWidth.value = deviceBarWidth / 2;
    deviceVectorTimeWidth.value = deviceBarWidth / 2;
  }
};

const hasKernelEventInThread = (events) => {
  for (const event of events) {
    if (isKernelEvent(event)) {
      return true;
    }
  }
  return false;
};

const calculateDevice = () => {
  let aicpuExecutionTimeSum = 0;
  let aicpuSchedExecTimeSum = 0;
  let aicpuSchedThreadCount = 0;

  const aicAivThreadInfo = [];
  let firstValidThreadEvents = null;
  let lastValidThreadEvents = null;
  let minKernelStartTime = 0;
  let maxKernelEndTime = 0;

  for (const [processKey, processInfo] of Array.from(swimDataManager.processInfo.entries())) {
    for (const threadInfo of Array.from(processInfo.threads.values())) {
      if (threadInfo.isCounter || threadInfo.threadName.includes('Fake Core')) {
        continue;
      }
      const { threadName } = threadInfo;
      const isAicpuCtrl0 = threadName === 'AICPU-CTRL-0';
      const isAicpuSched = threadName.startsWith('AICPU-SCHED-');
      const isAicOrAiv = threadName.startsWith('AIC_') || threadName.startsWith('AIV_');
      if (!isAicpuCtrl0 && !isAicpuSched && !isAicOrAiv) {
        continue;
      }
      const events = collectSortedEvents(threadInfo);
      if (events.length === 0) {
        continue;
      }
      if (isAicpuCtrl0 || isAicpuSched) {
        const aicpuResult = processAicpuThread(threadName, events);
        aicpuExecutionTimeSum += aicpuResult.executionTime;
        aicpuSchedExecTimeSum += aicpuResult.schedExecTime;
        aicpuSchedThreadCount += aicpuResult.schedThreadCount;
      }
      if (isAicOrAiv) {
        const hasKernel = hasKernelEventInThread(events);
        aicAivThreadInfo.push({ hasKernel, events });
        if (hasKernel) {
          for (const event of events) {
            if (isKernelEvent(event)) {
              if (firstValidThreadEvents === null || event.startTime < minKernelStartTime) {
                minKernelStartTime = event.startTime;
                firstValidThreadEvents = events;
              }
              if (lastValidThreadEvents === null || event.endTime > maxKernelEndTime) {
                maxKernelEndTime = event.endTime;
                lastValidThreadEvents = events;
              }
            }
          }
        }
      }
    }
  }

  AICPUExecutionTime.value = parseFloat((aicpuExecutionTimeSum / tsScale.value).toFixed(2));
  AICPUExecutionUint.value = formatTimeUnit(AICPUExecutionTime.value);

  if (aicpuSchedThreadCount > 0 && viewState.timeRange > 0) {
    const rate = (aicpuSchedExecTimeSum / tsScale.value) / (viewState.timeRange * aicpuSchedThreadCount / tsScale.value);
    AICPUExecutionRate.value = parseFloat((rate * 100).toFixed(2)) + '%';
  } else {
    AICPUExecutionRate.value = '--';
  }

  let firstThreadHeadTime = 0;
  let lastThreadTailTime = 0;

  if (firstValidThreadEvents !== null) {
    firstThreadHeadTime = collectFirstValidRoundHeadTime(firstValidThreadEvents);
  }

  if (lastValidThreadEvents !== null) {
    lastThreadTailTime = collectLastValidRoundTailTime(lastValidThreadEvents);
  }

  AICPUBeforeHeadTime.value = parseFloat((firstThreadHeadTime / tsScale.value).toFixed(2));
  AICPUAfterHeadTime.value = parseFloat((lastThreadTailTime / tsScale.value).toFixed(2));
  AICPUOverheadUint.value = formatTimeUnit(AICPUBeforeHeadTime.value);
  AICPUTailUint.value = formatTimeUnit(AICPUAfterHeadTime.value);

  const beforeHead = AICPUBeforeHeadTime.value;
  const afterHead = AICPUAfterHeadTime.value;
  calculateDeviceBarMetrics(beforeHead, afterHead);
};

const isPmuDataVaild = () => {
  return pmuTotal.value !== undefined && Object.keys(pmuTotal.value).length > 0 && pmuTotal.value['total cycle'] !== 0;
};

const initializePmuDefaults = () => {
    cubeRateCycle.value = '/';
    vectorRateCycle.value = '/';
    scalarRateCycle.value = '/';
    mte1RateCycle.value = '/';
    mte2RateCycle.value = '/';
    mte3RateCycle.value = '/';
    cubeTimePercentage.value = '/';
    vectorTimePercentage.value = '/';
    pmuExist.value = false;
};

const calculateCacheHitRate = () => {
  const icacheReq = pmuTotal.value.icache_req || 0;
  const icacheMiss = pmuTotal.value.icache_miss || 0;
  const icacheHitRateValue = icacheReq > 0 ? (icacheReq - icacheMiss) / icacheReq : 0;
  icacheHitRate.value = String(Math.round(icacheHitRateValue * 100)) + '%';
};

const calculateTimeMetrics = () => {
  const cubeTime = Number(pmuTotal.value.cube_busy_cycles || pmuTotal.value.cube_instr_busy || 0);
  const vectorTime = Number(pmuTotal.value.vec_busy_cycles || pmuTotal.value.pmu_idc_aic_vec_busy_o || 0);
  const barWidth = 406;
  cubeTimePercentage.value = Math.floor(cubeTime / (cubeTime + vectorTime) * 100) + '%';
  vectorTimePercentage.value = String(100 - Math.floor(cubeTime / (cubeTime + vectorTime) * 100)) + '%';
  cubeTimeWidth.value = barWidth * cubeTime / (cubeTime + vectorTime);
  vectorTimeWidth.value = barWidth * vectorTime / (cubeTime + vectorTime);
};

const calculateRateCycles = () => {
  vectorRateCycle.value = pmuTotal.value.vec_busy_cycles || pmuTotal.value.pmu_idc_aic_vec_busy_o || '/';
  cubeRateCycle.value = pmuTotal.value.cube_busy_cycles || pmuTotal.value.cube_instr_busy || '/';
  scalarRateCycle.value = pmuTotal.value.scalar_busy_cycles || pmuTotal.value.scalar_instr_busy || '/';
  mte1RateCycle.value = pmuTotal.value.mte1_busy_cycles || pmuTotal.value.mte1_instr_busy || '/';
  mte2RateCycle.value = pmuTotal.value.mte2_busy_cycles || pmuTotal.value.mte2_instr_busy || '/';
  mte3RateCycle.value = pmuTotal.value.mte3_busy_cycles || pmuTotal.value.mte3_instr_busy || '/';
};

const calculateRatePercentages = () => {
  const vecCycles = Number(pmuTotal.value.vec_busy_cycles || pmuTotal.value.pmu_idc_aic_vec_busy_o || 0);
  const cubeCycles = Number(pmuTotal.value.cube_busy_cycles || pmuTotal.value.cube_instr_busy || 0);
  const scalarCycles = Number(pmuTotal.value.scalar_busy_cycles || pmuTotal.value.scalar_instr_busy || 0);
  const mte1Cycles = Number(pmuTotal.value.mte1_busy_cycles || pmuTotal.value.mte1_instr_busy || 0);
  const mte2Cycles = Number(pmuTotal.value.mte2_busy_cycles || pmuTotal.value.mte2_instr_busy || 0);
  const mte3Cycles = Number(pmuTotal.value.mte3_busy_cycles || pmuTotal.value.mte3_instr_busy || 0);

  let totalCycles = vecCycles + cubeCycles + scalarCycles + mte1Cycles + mte2Cycles + mte3Cycles;

  if (pmuValid.value) {
    const fixCycles = Number(pmuTotal.value.pmu_fix_instr_busy || 0);
    totalCycles += fixCycles;
  }

  if (totalCycles === 0) {
    vectorRatePercentage.value = 0;
    cubeRatePercentage.value = 0;
    scalarRatePercentage.value = 0;
    mte1RatePercentage.value = 0;
    mte2RatePercentage.value = 0;
    mte3RatePercentage.value = 0;
    return;
  }
  vectorRatePercentage.value = Math.round((vecCycles / totalCycles) * 100);
  cubeRatePercentage.value = Math.round((cubeCycles / totalCycles) * 100);
  scalarRatePercentage.value = Math.round((scalarCycles / totalCycles) * 100);
  mte1RatePercentage.value = Math.round((mte1Cycles / totalCycles) * 100);
  mte2RatePercentage.value = Math.round((mte2Cycles / totalCycles) * 100);
  mte3RatePercentage.value = Math.round((mte3Cycles / totalCycles) * 100);
};

const calculateRateWidth = () => {
  const barWidth = 406;
  vectorRateWidth.value = pmuTotal.value.vec_ratio * barWidth;
  cubeRateWidth.value = pmuTotal.value.cube_ratio * barWidth;
  scalarRateWidth.value = pmuTotal.value.scalar_ratio * barWidth;
  mte1RateWidth.value = pmuTotal.value.mte1_ratio * barWidth;
  mte2RateWidth.value = pmuTotal.value.mte2_ratio * barWidth;
  mte3RateWidth.value = pmuTotal.value.mte3_ratio * barWidth;
};

const setPmuConfigurations = () => {
  pmuRowCoordLoc.value = ['0%', '18%', '36%', '54%', '72%', '88%'];
  pmuBackLineLoc.value = ['20%', '40%', '60%', '80%'];
  pmuRowCoordList.value = ['0%', '20%', '40%', '60%', '80%', '100%'];

  const baseColCoordList = ['Vector Cycles', 'Cube Cycles', 'Scalar Cycles', 'MTE1 Cycles', 
                             'MTE2 Cycles', 'MTE3 Cycles'];
  const baseDarkColors = ['rgba(0, 117, 102, 1)', 'rgba(0, 113, 113, 1)', 'rgba(26, 116, 62, 1)',
                           'rgba(137, 93, 0, 1)', 'rgba(155, 83, 3, 1)', 'rgba(164, 75, 50, 1)'];
  const baseLightColors = ['rgba(0, 240, 213, 1)', 'rgba(0, 233, 255, 1)', 'rgba(91, 239, 143, 1)',
                            'rgba(255, 202, 70, 1)', 'rgba(255, 201, 149, 1)', 'rgba(255, 201, 182, 1)'];
  const baseDarkBorderColors = ['rgba(0, 117, 102, 0.3)', 'rgba(0, 113, 113, 0.3)', 'rgba(26, 116, 62, 0.3)',
                                 'rgba(137, 93, 0, 0.3)', 'rgba(155, 83, 3, 0.3)', 'rgba(164, 75, 50, 0.3)'];
  const baseLightBorderColors = ['rgba(0, 240, 213, 1)', 'rgba(0, 233, 255, 1)', 'rgba(91, 239, 143, 1)',
                                  'rgba(255, 202, 70, 1)', 'rgba(255, 201, 149, 1)', 'rgba(255, 201, 182, 1)'];
  
  if (pmuValid.value) {
    baseColCoordList.push('FixP Cycles');
    baseDarkColors.push('rgba(88, 110, 15, 1)');
    baseLightColors.push('rgba(188, 277, 66, 1)');
    baseDarkBorderColors.push('rgba(88, 110, 15, 0.3)');
    baseLightBorderColors.push('rgba(188, 277, 66, 1)');
  }

  pmuColCoordList.value = baseColCoordList;
  pmuBarColorList.value = isDarkTheme.value ? baseDarkColors : baseLightColors;
  pmuBarBorderColorList.value = isDarkTheme.value ? baseDarkBorderColors : baseLightBorderColors;
};

const setPmuChartData = () => {
  const baseChartDataLeft =  [vectorRateCycle.value, cubeRateCycle.value, scalarRateCycle.value,
                               mte1RateCycle.value, mte2RateCycle.value, mte3RateCycle.value];
  const baseChartDataRight =  [vectorRatePercentage.value, cubeRatePercentage.value, scalarRatePercentage.value,
                                mte1RatePercentage.value, mte2RatePercentage.value, mte3RatePercentage.value];
  
  if (pmuValid.value) {
    baseChartDataLeft.push(pmuTotal.value.pmu_fix_instr_busy || '/');
    const vecCycles = Number(pmuTotal.value.vec_busy_cycles || pmuTotal.value.pmu_idc_aic_vec_busy_o || 0);
    const cubeCycles = Number(pmuTotal.value.cube_busy_cycles || pmuTotal.value.cube_instr_busy || 0);
    const scalarCycles = Number(pmuTotal.value.scalar_busy_cycles || pmuTotal.value.scalar_instr_busy || 0);
    const mte1Cycles = Number(pmuTotal.value.mte1_busy_cycles || pmuTotal.value.mte1_instr_busy || 0);
    const mte2Cycles = Number(pmuTotal.value.mte2_busy_cycles || pmuTotal.value.mte2_instr_busy || 0);
    const mte3Cycles = Number(pmuTotal.value.mte3_busy_cycles || pmuTotal.value.mte3_instr_busy || 0);
    const fixCycles = Number(pmuTotal.value.pmu_fix_instr_busy || 0);
    const totalSevenCycles = vecCycles + cubeCycles + scalarCycles + mte1Cycles + mte2Cycles + mte3Cycles + fixCycles;
    baseChartDataRight.push( Math.round((fixCycles / totalSevenCycles) * 100));
  }

  pmuChartDataLeft.value = baseChartDataLeft;
  pmuChartDataRight.value = baseChartDataRight;
};

const calculatePmuMetrics = () => {
  calculateCacheHitRate();
  calculateTimeMetrics();
  calculateRateCycles();
  calculateRatePercentages();
  calculateRateWidth();
  setPmuConfigurations();
  setPmuChartData();
  iniComplete.value = true;
};

const initializePerformance = () => {
  calculateStatistics();
  
  isCfgEditing.value = false;
  isShortcutKeyShow.value = false;

  const mod = tsScale.value;

  if (Number.isInteger(viewState.timeRange)) {
    taskTime.value = parseFloat((viewState.timeRange / mod).toFixed(3));
  } else {
    taskTime.value = (viewState.timeRange / mod).toFixed(2);
  }
  taskOnBoardTime.value = parseFloat(getTaskOnBoardTime().toFixed(3));
  if (isAicpu.value) {
    aicoreTime.value = '/';
    aicoreRate.value = '/';
  } else {
    calculateAicoreInfo();
  }

  if (isDeviceView.value) {
    calculateDevice();
  }
  
  if (!isPmuDataVaild()) {
    initializePmuDefaults();
    return;
  }

  calculatePmuMetrics();
};

const getTaskOnBoardTime = () => {
  let minStart = Infinity;
  let maxEnd = 0;
  const mod = tsScale.value;
  for (const [, process] of swimDataManager.getAllProcesses().entries()) {
    const isValidType = ['kernel', '', undefined].includes(process.type);
    const isNotExcludedPerfSwim = process.type === 'PerfSwim' && process.name === 'AICore View';
    if (isValidType || isNotExcludedPerfSwim) {
      for (const [, thread] of process.threads.entries()) {
        if (thread.isCounter || thread.threadName.includes('Fake Core') || (isMsProf.value && thread?.parentThreadName === undefined)) {
          continue;
        }
        const { eventIds } = thread;
        if (!eventIds || eventIds.length === 0) {
          continue;
        }
        const validEvents = eventIds
          .map(id => swimDataManager.getEventById(id))
          .filter(e => e && !e.originalThreadName);
        if (validEvents.length === 0) {
          continue;
        }
        const [firstEvent] = validEvents;
        const lastEvent = validEvents[validEvents.length - 1];
        if (firstEvent.startTime < minStart) {
          minStart = firstEvent.startTime;
        }
        if (lastEvent.endTime > maxEnd) {
          maxEnd = lastEvent.endTime;
        }
      }
    }
  }
  return (maxEnd - minStart) / mod;
};
const handleClickOutside = (e) => {
  if (isPathLockStatus.value) {
    return;
  }
  const composedPath = e.composedPath();
  const index = composedPath.findIndex(
    (item) =>
      item.classList?.contains('time-consuming-task') ||
      item.classList?.contains('max-scheduling-gap-item-task')||
      item.classList?.contains('pmu-insight-clickable') ||
      item.classList?.contains('pmu-group-button') ||
      item.classList?.contains('pmu-full-data-button') ||
      item.classList?.contains('pmu-b-copy-button') ||
      item.classList?.contains('time-range-marker') || 
      item.classList?.contains('time-statistics-table') ||
      item.classList?.contains('event-container') ||
      ['tab1', 'tab2', 'tab3'].includes(item.id)
  );
  if (index !== -1) {
    return;
  }
  if (isMaxSchedule.value) {
    resetMaxScheduleState();
  } else {
    canvasStatusReset();
  }
};
onMounted(() => {
  initializePerformance();
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  clearExecutionTimeData();
});
const clearExecutionTimeData = () => {
  executionTimeData.echartsMap.clear();
  executionTimeData.tableData.length = 0;
  executionTimeData.ticksMap.clear();
  executionTimeData.timelineGroupsMap.clear();
};
// 提供方法给子组件
provide('swimGraphPmuBarMethod', {
  clickTask
});
</script>

<style lang="scss" scoped>
.pmu-report {
  padding: 20px;
  position: fixed;
  background: var(--devui-card-bg);
  top:0;
  bottom:0;
  right:0;
  z-index: 100;
  border-left: 1px solid var(--devui-category-search-bg);
}

.summary-container {
  overflow-y: auto; 
  height:calc(100vh - 110px);
}

.close-container {
  width: 16px;
  height: 16px;
  position: absolute;
  right: 20px;
  top: 20px;
}

.report-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 26px;
  font-size: 18px;
  line-height: 18px;
  font-weight: 700;
  text-align: left;
}

.scheduling-gap-container-perform {
  margin-top: 12px;
  width: 440px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--devui-category-search-bg);
}

.left-scheduling-gap-container {
  width: 109px;
  height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.right-scheduling-gap-container {
  display: flex;
  flex-direction: column;
  width: 268px;
  gap: 6px;
}

.scheduling-gap-title {
  height: 18px;
  display: flex;
  justify-content: space-between;
}

.scheduling-gap-title-item {
  font-size: 12px;
  color: rgba(153, 153, 153, 1);
}

.max-scheduling-gap {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}

.max-scheduling-gap-item {
  height: 36px;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.max-scheduling-gap-item-task {
  max-width: 48px;
  height: 16px;
  padding: 0px 4px 0px 4px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--base-bg-color);
  cursor: pointer;
}

.max-scheduling-gap-item-task:hover {
  background: var(--hover-bg-color);
}

.disabled {
  cursor: not-allowed !important;
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
}

.max-scheduling-gap-item-task-text {
  text-overflow: ellipsis;
  white-space: nowrap; 
  overflow: hidden; 
  font-size: 12px;
  justify-content: center;
}

.max-scheduling-gap-item-task-text:hover {
  color: black;
}

.max-scheduling-gap-item-middle-container {
  align-self: flex-start;
  height: 19px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.max-scheduling-gap-item-time {
  height: 16px;
  color: rgba(153, 153, 153, 1);
  text-align: center;
}

.max-scheduling-gap-item-line {
  width: 173.5px;
  height: 1px;
  background: linear-gradient(
    to right,
    var(--left-color, #ccc),
    var(--right-color, #ccc)
  );
}

.time-task-item-container {
  width: 109px;
  height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
}

.split-line {
  margin-top: 3px;
  width: 0px;
  border: 1px solid var(--devui-category-search-bg);
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
  border-radius: 8px;
  background: var(--devui-category-search-bg);
}

.task-statistic-item {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.time-consuming-split-line {
  margin-top: 24px;
  width: 0px;
  border: 1px solid var(--devui-category-search-bg);
}

.time-consuming-tasks-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-consuming-task {
  width: 236px;
  height: 16px;
  line-height: 16px;
  justify-content: flex-start;
  padding: 0px 4px 0px 4px;
  text-align: center;
  font-size: 12px;
  border-radius: 4px;
  background: var(--base-bg-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.time-consuming-task:hover {
  background: var(--hover-bg-color);
  color: black;
}
.top-row-group {
  display: flex;
  flex-direction: row;
}
.mt10 {
  margin-top: 10px;
}
.task-container {
  margin-top: 12px;
  width: 440px;
  height: 176px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--devui-category-search-bg);
}

.task-item-container {
  width: 196px;
  height: 58px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  margin-right: 6px;
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

.task-title-container {
  height: 18px;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  font-weight: 400;
  gap: 1px;
  display: flex;
  flex-direction: row;
}

.aicore-e2e-time .task-title-container {
  overflow: hidden;
  max-width: 100%;
}

.aicore-e2e-time .task-title-container .task-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
  display: block;
}

.aicore-e2e-time .task-title-container d-icon {
  flex-shrink: 0;
}

.task-data {
  height: 32px;
  font-size: 24px;
  font-weight: 500;
}

.aicore-container {
  margin-top: 16px;
  width: 440px;
  height: 192px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--devui-category-search-bg);
  padding: 16px;
}

.Device-container {
  margin-top: 16px;
  width: 440px;
  height: 192px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--devui-category-search-bg);
  padding: 16px;

  .task-title-container {
    max-width: 110px;
    overflow: hidden;
  }

  .task-title {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.aicore-container-column {
  display: flex;
  flex-direction: row;
  gap: 8px; 
}

.cube-rate-cycle {
  height: 20px;
  color: var(--cube-rate-cycle-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 20px;
}

.vec-rate-cycle {
  height: 20px;
  color: var(--vec-rate-cycle-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 20px;
}

.device-cube-rate-cycle {
  height: 20px;
  color: rgba(143, 229, 194, 1);
  font-size: 18px;
  font-weight: 700;
  line-height: 20px;
}

.device-vec-rate-cycle {
  height: 20px;
  color: rgba(198, 233, 168, 1);
  font-size: 18px;
  font-weight: 700;
  line-height: 20px;
}

.light-theme.device-cube-rate-cycle {
  color: rgba(13, 170, 112, 1);
}

.light-theme.device-vec-rate-cycle  {
  color: rgba(98, 180, 46, 1);
}

.cube-data-chart {
  position: relative;
  height: 16px;
  width: 410px;
  gap: 2px;
  display: flex;
  flex-direction: row;
  margin-top: 12px;
}

.cube-time-bar {
  position: relative;
  height: 20px;
  border-radius: 4px;
  background: var(--cube-rate-cycle-bg);
  border: 1px solid var(--cube-rate-cycle-bg);
}

.vector-time-bar {
  position: relative;
  height: 20px;
  border-radius: 4px;
  background: var(--vec-rate-cycle-bg);
  border: 1px solid var(--vec-rate-cycle-bg);
  display: flex;
  flex-direction: row-reverse;
}

.device-cube-time-bar {
  position: relative;
  height: 16px;
  border-radius: 4px;
  background: rgba(54, 193, 141, 1);
  border: 1px solid rgba(54, 193, 141, 1);
}

.device-vector-time-bar {
  position: relative;
  height: 16px;
  border-radius: 4px;
  background: rgba(135, 200, 89, 1);
  border: 1px solid rgba(135, 200, 89, 1);
  display: flex;
  flex-direction: row-reverse;
}

.cube-time-num {
  position: absolute;
  width: 100%;
  height: 12px;
  font-size: 12px;
  top: 0px;
  text-align: center;
  bottom: 6px;
  z-index: 1;
  color: var(--devui-primary-text);
}

.vector-time-num {
  position: absolute;
  width: 100%;
  height: 12px;
  font-size: 12px;
  top: 0px;
  text-align: center;
  bottom: 6px;
  z-index: 1;
  color: var(--devui-primary-text);
}

.time-statistics-tab-content {
  height: calc(100vh - 110px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
  }
}

:deep(.devui-tabs__nav--pills li.active a),
:deep(.devui-tabs__nav--pills li:hover:not(.disabled) a) {
  color: var(--devui-text);
}

:deep(.devui-tabs__nav--pills li.active:after) {
  width: 100%;
  background: var(--devui-text);
}
</style>