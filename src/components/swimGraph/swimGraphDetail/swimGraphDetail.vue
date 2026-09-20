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
    <!-- 核间数据概览 -->
    <div class="details-cores" :class="{ expanded: detailsCoresExpanded }">
      <span>{{ $t("inter-CorePerformanceOverview") }}</span>
    </div>

    <div class="details-panel" :class="[{ expanded: detailsPanelExpanded }, { 'full-expand': isDetailFullExpand }, { 'narrow-mode': isCompactMode }]">
      <div class="details-content" ref="detailsContent" id="details-content">
        <div v-if="!isThreeColumn && shouldShowExpandToggle" class="expand-toggle" @click="toggleDetailFullExpand">
          <d-icon :name="isDetailFullExpand ? 'double-down' : 'double-up'" style="font-size: 16px; width: 16px; height: 16px;" />
        </div>
        <div class="details-title" v-if="!selectedEvent && !canvasclickedEvent">{{ $t("nodeDetailsView") }}</div>
        <template v-else>
          <div class="detail-content" :class="{ 'narrow-mode': isCompactMode }" :style="isDetailFullExpand ? { maxHeight: maxDetailHeight + 'px' } : {}">
              <div class="content-one-pipe">
                <div class="pipe-content-title">
                  <div class="pipe-title">
                    <img class="picture" :src="tPath" alt="picture">
                  </div>
                  <div class="pipe-name">
                    <d-tooltip :content="getEventDisplayName(canvasclickedEvent)">
                      <span class="event-name-truncate">{{ getEventDisplayName(canvasclickedEvent) }}</span>
                    </d-tooltip>
                    <div class="pipe-subgraph">
                      <span :style="{...dynamicWidthStyle(canvasclickedEvent), width:'auto'}">{{ $t("leafNo") }} : {{ getSubGraphId(canvasclickedEvent, 'subGraph', '/') }}</span>
                    </div>
                  </div>
                </div>
                <div class="pipe-content-stat">
                  <div class="pipe-start">
                    <span class="pipe-start-up">
                      <span>Start</span><span class="ml5">({{ startTimeUnitInfo }})</span>
                      <span class="arrow-right-top"><d-icon name="icon-arrow-right-l" class="right-button"></d-icon></span>
                      <span>Duration</span><span class="ml5">({{ durationUnitInfo }})</span>
                    </span>
                    <span class="pipe-start-down">
                      <d-tooltip :content="startTimeInfoAll">
                        <span class="start-value-key start-value-key-truncate">{{ startTimeInfo }}</span>
                      </d-tooltip>
                      <span class="arrow-right"><d-icon name="icon-arrow-right-l" class="right-button"></d-icon></span>
                      <d-tooltip :content="durationInfoAll">
                        <span class="start-value-key start-value-key-truncate">{{ durationInfo }}</span>
                      </d-tooltip>
                    </span>
                  </div>
                  <div class="pipe-line"></div>
                  <div class="pipe-hit">
                    <span>{{ $t('hitRate')}}</span>
                    <d-tooltip :content="eventCacheHit">
                      <span class="start-value-key start-value-key-truncate">{{eventCacheHit}}</span>
                    </d-tooltip>
                  </div>
                </div>
              </div>
            <div class="detail-main-container">
            <div class="content-args" :class="{ 'pmu-content-host': selectedView === 'pmuDiagnosis' }">
              <div class="content-args-head">
                <div class="main-text">
                  <d-tabs v-model="selectedView" class="argsTabs" :show-content="false" @active-tab-change="selectView">
                    <d-tab id="args" :title="$t('args')"></d-tab>
                    <d-tab v-if="showPipeStatisticsTab" id="pipeStat" :title="$t('pipeStat')"></d-tab>
                    <d-tab v-if="showPmuDiagnosisTab" id="pmuDiagnosis" :title="$t('pmuTaskDiagnosis')"></d-tab>
                  </d-tabs>
                </div>
                <div class="bindbox">
                  <d-tooltip position="bottom" :content=bindToolTip>
                    <d-button variant="text" color="secondary" v-show="bindFile" @click="openBoundComGraph" class="jump-to-file"><strong class="icon-details"></strong></d-button>
                  </d-tooltip>
                  <d-button v-if="shouldShowBindButton" variant="text" color="primary" @click="bindFilePath">{{ bindButton }}</d-button>
                </div>
              </div>
              <div class="content-two" v-if="selectedView === 'args'">
                <template v-if="canvasclickedEvent?.isCounter">
                  <strong>{{ $t("countValue") }}</strong> {{ canvasclickedEvent.counterSize }}<br>
                  <strong>{{ $t("type") }}</strong> {{ $t("counterEvent") }}<br>
                </template>
                <template v-else>
                  <div class="argstime">
                    <span class="third-text">duration (μs)</span>
                    <span class="main-text">{{ formattedDuration }}</span>
                  </div>
                  <div class="argstime">
                    <span class="third-text">end_time (μs)</span>
                    <span class="main-text">{{ formattedEndTime }}</span>
                  </div>
                  <div class="argstime">
                    <span class="third-text">start_time (μs)</span>
                    <span class="main-text">{{ formattedStartTime }}</span>
                  </div>
                  <div v-for="(value, key) in canvasclickedEvent?.args ?? []" :key="key" :id="key" class="args-item">
                    <d-tooltip :content="key" v-if="value !== ''">
                      <span class="args-key third-text">{{ key }}</span>
                    </d-tooltip>
                    <span v-if="value !== '' && key === 'syncEvents'">
                      <span class="args-value main-text">{{ formatSyncEvents(value) }}</span>
                    </span>

                    <span v-if="value !== '' && key === 'ioperand-hint' ">
                      <template v-if="value.includes('rawmagic')">
                        <span class="args-value main-text" v-text="value"></span>
                      </template>
                      <span v-else class="args-value main-text"> {{ value }} </span>
                    </span>

                    <span v-if="value !== '' && key === 'ooperand-hint' ">
                      <template v-if="value.includes('rawmagic')">
                        <span class="args-value main-text" v-text="value"></span>
                      </template>
                      <span v-else class="args-value main-text"> {{ value }} </span>
                    </span>

                    <span>
                      <template v-if="['dispatch-time-us', 'finish-time-us'].includes(key)">
                        <span class="main-text">{{ subMintsFormat(value) }}</span>
                      </template>
                    </span>

                    <span>
                      <template v-if="['aicpu-duration-us', 'kernel-ready-time-us'].includes(key)">
                        <span class="main-text">{{ parseFloat(value.toFixed(3)) }}</span>
                      </template>
                    </span>
                    
                    <span v-if="!['', 'event-hint', 'ioperand-hint', 'ooperand-hint', 'syncEvents', 'dispatch-time-us', 'finish-time-us', 'aicpu-duration-us', 'kernel-ready-time-us'].includes(key)">
                      <span class="args-value main-text">{{ value }}</span>
                    </span>

                    <span class="args-button" v-if="typeof(value) === 'string' && (value.includes('rootHash') || value.includes('leafHash'))">
                      <span v-for="(item, key) in splitValue(value)">
                        <span v-if="item[0]=='rootHash' || item[0]=='leafHash'" class="main-text">
                          {{ item[0] }}:<span :id="item[0]" class="event-hint-hash" @click="jumpToComGraph(item[1])">{{ item[1] }}</span>.
                        </span>
                        <span v-else class="main-text">
                          {{ item[0] }}:{{ item[1] }},
                        </span>
                      </span>
                    </span>

                  </div>
                </template>
              </div>
              <template v-else-if="selectedView === 'pipeStat' && showPipeStatisticsTab">
                <div class="pipe-bar-chart" v-if="canvasclickedEvent.pmu_info && Object.keys(canvasclickedEvent.pmu_info).length > 0">
                  <div class="row-coord" :class="{'row-coord-active': selectedView === 'pipeStat'}">
                    <div class="row-coord-num" 
                      v-for="(coordIt, index) in rowCoordList" 
                      :key="index"
                      :style="{ left: rowCoordLoc[index]}">
                      {{rowCoordList[index]}}
                    </div>
                  </div>
                  <div class="occupy-rate-chart-container" :class="{'chart-container-active': selectedView === 'pipeStat'}" ref="barChartContainerDiv">
                    <div class="occupy-rate-chart-col-coord-container" ref="colCoordContainerDiv">
                      <div class="occupy-rate-chart-col-coord" 
                        v-for="(colCoordIt, index) in colCoordList"
                        :key="index">
                        {{colCoordIt}}
                      </div>
                    </div>
                    <div class="occupy-rate-bar-container"
                      :style="{ height: rowCoordList.length * 36 + 4 + 'px'}">
                      <div class="occupy-rate-bar-line"
                        v-for="(lineLoc, index) in backLineLoc"
                        :key="index"
                        :style="{ left: lineLoc}"> 
                      </div>

                      <div class="occupy-rate-backbar"
                        v-for="(dataLeft, index) in chartDataLeft"
                        :key="index"
                        :style="{ top: 8 + 36 * index + 'px'}">
                        <div class="occupy-rate-bar" 
                          :style="{ width: barWidthList[index] + 'px', background: pmuBarColorList[index]}"></div>
                        <div class="occupy-rate-cycle">{{ dataLeft }}</div>
                        <div class="occupy-rate-percentage">{{ chartDataRight[index] }}%</div>
                      </div>
                    </div>
                  </div>
                </div>
                <template v-else>
                  <div class="noPmu"> {{ $t('noPmu')}} </div>
                </template>
              </template>
              <pmu-task-diagnosis v-else-if="selectedView === 'pmuDiagnosis' && showPmuDiagnosisTab" :event="canvasclickedEvent" />
            </div>
            <div id="canvas-container" :style="{ height: selectedView === 'pmuDiagnosis' ? '492px' : '186px' }">
              <div class="mr10">
                <div class="relevent">Relevent</div>
                <div class="display-containner">
                  <div class="button-group">
                    <button @click="releventShowPre" :class="{'relevent-highlight': (releventDisplay == DEP_MODE.pre)}" :disabled="isPathLockStatus"><img class="left" :src="lPath" alt="left"/></button>
                    <button @click="releventShowAll" :class="{'relevent-highlight': (releventDisplay == DEP_MODE.all)}" :disabled="isPathLockStatus"><img class="all" :src="aPath" alt="all"/></button>
                    <button @click="releventShowNext" :class="{'relevent-highlight': (releventDisplay == DEP_MODE.next)}" :disabled="isPathLockStatus"><img class="right" :src="rPath" alt="right"/></button> 
                  </div>
                  <div class="detail-level display-containner">
                    <div>{{$t('taskConnectionLevel') + ':'}}</div>
                    <d-input-number class="input-number-container" :class="{'locked-style': isPathLockStatus}" ref="inputNumberRef"  v-model="connectionLevel" :step="1" :disabled=isPathLockStatus :precision="0" :min="-1" @change="onInputChange"></d-input-number> 
                    <d-tooltip :content="$t('connectionLevel')">
                      <d-icon name="icon-helping" class="help-font"></d-icon>
                    </d-tooltip>
                  </div>
                </div>
                  <div class="swim-graph-icon">
                    <div><span class="icon-span-i secondary-text">Incoming</span><d-badge class="swimGraphBadge" status="common" :count="predecessors.length"></d-badge></div>
                    <div><span class="icon-span-c secondary-text">Current</span></div>
                    <div><span class="icon-span-o secondary-text">Outgoing</span><d-badge class="swimGraphBadge" status="common" :count="successors.length"></d-badge></div>
                  </div>
                  <canvas ref="dependencyCanvasRef" class="dependency-canvas"></canvas>
              </div>
            </div>
            </div>
            <div class="close-button">
                <d-button icon="icon-close" style="width: 16px; font-size: 16px; border: none; background-color: transparent" @click="toggleDetailsPanel()"></d-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, nextTick, provide, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { clone } from 'lodash-es';
import { formatTimeWithUnit, COLOR_CFG, DEP_MODE } from '../swimGraphUtils';
import { getSubGraphId } from '../swimGraphProcesses/processInfo';
import { useViewServer } from '../../../core/use-view-server';
import { swimDataManager } from '../swimData';
import { canvasPool } from '../render/canvasPool';
import { detailDependencyRenderer } from '../render/detailDependencyRenderer';
import PmuTaskDiagnosis from './pmuTaskDiagnosis.vue';

const { server } = useViewServer();
const { t: $t } = useI18n();
const useDynamicWidth = ref(true);
const detailsContent = ref(null);
const bindToolTip = ref($t("openComputationalGraphJsonFile"));
const ioperandHtml = ref('');
const ooperandHtml = ref('');
const releventDisplay = ref(DEP_MODE.all);
const dependencyCanvasRef = ref(null);
// 注入父组件提供的状态和方法
const {
  tsScale,
  minTs,
  selectedEvent,
  canvasclickedEvent,
  viewState,
  detailsPanelExpanded,
  detailsCoresExpanded,
  bindFile,
  bindButton,
  isDarkTheme,
  highlightedPaths,
  isPathLockStatus,
  layout,
  isMixMode,
  isThreeColumn,
  processExpanded,
} = inject('swimGraphState');

const isAicpuEvent = computed(() => {
  if (!canvasclickedEvent.value) return false;
  const processKey = String(canvasclickedEvent.value.pid);
  const process = swimDataManager.getProcess(processKey);
  return process?.type === 'aicpu' || canvasclickedEvent.value.isAicpuProcess; // 兼容旧逻辑
});

const shouldShowBindButton = computed(() => {
  return !isAicpuEvent.value && selectedView.value === 'args';
});

const eventCacheHit = computed(() => {
  return getEventCacheHit(canvasclickedEvent.value);
});

const {
  toggleDetailsPanel,
  renderDependencyLines,
  postMessage,
  selectEvent,
  overflowText,
  scrollToEvent,
  highlightDependencyEvent,
  toggleProcess,
} = inject('swimGraphMethods');
const { userConfig } = inject('swimGraphCfg');
const { pmuValid } = inject('swimGraphPmuTotal') || { pmuValid: ref(false) };
const { isFromPerformanceClick, isFromPerformancePmuTabClick } = inject('swimGraphState');
const { pinnedThreadsList } = inject('swimGraphPinnedState', { pinnedThreadsList: ref([]) });
const connectionLevel = computed({
  get: () => userConfig.get('connectionLevel') ?? -1,
  set: (value) => {
    userConfig.set('connectionLevel', value);
  }
});
let startTimeInfo = ref('0');
let startTimeInfoAll = ref('');
let startTimeUnitInfo = ref('us');
let durationInfo = ref('0');
let durationInfoAll = ref('');
let durationUnitInfo = ref('us');
const inputNumberRef = ref(null);
const isDetailFullExpand = ref(false);
const detailsPanelWidth = ref(0);
const isCompactMode = computed(() => detailsPanelWidth.value > 0 && detailsPanelWidth.value < 1218);
const maxDetailHeight = computed(() => Math.max(600 - pinnedThreadsList.value.length * 18, 0));
const shouldShowExpandToggle = computed(() => maxDetailHeight.value >= 300);
function syncPanelHeight() {
  const panel = document.querySelector('.details-panel');
  const content = document.getElementById('details-content');
  if (!panel || !content) {
    return;
  }
  const detailContentEl = content.querySelector('.detail-content');
  const naturalHeight = detailContentEl ? detailContentEl.scrollHeight : 0;
  const barEl = content.querySelector('.expand-toggle');
  const barHeight = barEl ? barEl.offsetHeight : 0;
  const displayHeight = Math.min(naturalHeight, maxDetailHeight.value);
  panel.style.height = (barHeight + displayHeight) + 'px';
  panel.style.overflow = 'hidden';
  if (detailContentEl) {
    detailContentEl.style.height = naturalHeight + 'px';
  }
}
function resetPanelStyle() {
  const panel = document.querySelector('.details-panel');
  if (panel) {
    panel.style.height = '';
    panel.style.overflow = '';
  }
  const detailContentEl = document.querySelector('.detail-content');
  if (detailContentEl) {
    detailContentEl.style.height = '';
  }
}
function recalcExpandHeight() {
  if (!isDetailFullExpand.value) {
     return;
  }
  syncPanelHeight();
}
function toggleDetailFullExpand() {
  isDetailFullExpand.value = !isDetailFullExpand.value;
  nextTick(() => {
    if (isDetailFullExpand.value) {
      recalcExpandHeight();
    } else {
      resetPanelStyle();
    }
  });
}
const rowCoordLoc = ref(['0%', '18%', '36%', '54%', '72%', '88%']);
const backLineLoc = ref(['20%', '40%', '60%', '80%']);
const rowCoordList = ref(['0%', '20%', '40%', '60%', '80%', '100%']);
const colCoordList = ref(['Vector Cycles', 'Cube Cycles', 'Scalar Cycles', 'MTE1 Cycles', 
                            'MTE2 Cycles', 'MTE3 Cycles']);
const pmuBarColorList = ref([]);
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
if (isDarkTheme.value) {
  pmuBarColorList.value = ['rgba(135, 52, 0, 1)', 'rgba(181, 78, 4, 1)', 'rgba(3, 97, 66, 1)', 
                          'rgba(70, 94, 184, 1)', 'rgba(158, 63, 0, 1)', 'rgba(72, 142, 32, 1)'];
} else {
  pmuBarColorList.value = ['rgba(255, 200, 201, 1)', 'rgba(255, 201, 138, 1)', 'rgba(0, 238, 237, 1)', 
                          'rgba(171, 217, 255, 1)', 'rgba(231, 216, 0, 1)', 'rgba(0, 242, 186, 1)'];
}

const barWidthList = ref([]);
const chartDataLeft = ref([]);
const chartDataRight = ref([]);

const selectedView = ref('args');
const selectView = (view) => {
  selectedView.value = view;
};
const hasPmuDiagnosisData = (event) => {
  if (!pmuValid?.value) {
    return false;
  }
  if (isMixMode?.value && swimDataManager.hasMixConfig()) {
    const mixCondition = event?.parentEventId || event?.subEventIds;
    if (mixCondition && !isFromPerformanceClick.value) {
      return false;
    }
  }
  const pmuInfo = event?.pmu_info;
  return !!pmuInfo && Object.keys(pmuInfo).length > 0 && Number(pmuInfo['total cycle']) > 0;
};
const showPmuDiagnosisTab = computed(() => hasPmuDiagnosisData(canvasclickedEvent.value));
const showPipeStatisticsTab = computed(() => {
  if (showPmuDiagnosisTab.value) {
    return false;
  }
  if (isMixMode?.value && swimDataManager.hasMixConfig()) {
    if (canvasclickedEvent?.value?.parentEventId || canvasclickedEvent?.value?.subEventIds) {
      return false;
    }
  }
  return true;
});
const normalizeSelectedView = (event) => {
  if (isFromPerformancePmuTabClick?.value && hasPmuDiagnosisData(event)) {
    if (selectedView.value === 'args' || selectedView.value === 'pipeStat') {
      selectedView.value = 'pmuDiagnosis';
    }
    return;
  }
  if (selectedView.value === 'pmuDiagnosis') {
    selectedView.value = 'args';
  }
  if (selectedView.value === 'pipeStat' && hasPmuDiagnosisData(event)) {
    selectedView.value = 'args';
  }
};
const getEventCacheHit = (event) => {
  if (!event) {
    return '/';
  }
  if (event.pmu_calc_info?.icache_hit) {
    let hitRate = event.pmu_calc_info.icache_hit * 100;
    return hitRate === 100 ? '100%' : hitRate.toFixed(2) + '%';
  }
  if (event.pmu_info?.icache_hit) {
    let hitRate = event.pmu_info.icache_hit * 100;
    return hitRate === 100 ? '100%' : hitRate.toFixed(2) + '%';
  }
  return '/';
};

const subMintsFormat = (time) => {
  const ns = Math.round((time * 1000) - (minTs.value * 1000));
  const us = (ns / 1000).toFixed(3);
  return parseFloat(us);
};

const formatSyncEvents = (value) => {
  if (!value) {
    return '';
  }
  
  try {
    let syncEventsArray;
    
    if (typeof value === 'string') {
      syncEventsArray = JSON.parse(value);
    } else if (Array.isArray(value)) {
      syncEventsArray = value;
    } else {
      return value;
    }
    
    if (!Array.isArray(syncEventsArray)) {
      return value;
    }
    
    const formattedEvents = syncEventsArray.map(event => {
      if (event && typeof event.time !== 'undefined') {
        const scaledTime = event.time / tsScale.value;
        const formattedTime = parseFloat(scaledTime.toFixed(3));
        
        return {
          ...event,
          time: formattedTime,
        };
      }
      return event;
    });
    
    return JSON.stringify(formattedEvents, null, 2);
  } catch (error) {
    return value;
  }
};

const updateEventPmu = (event) => {
  if (event.pmu_info) {
    let pmuData = event.pmu_info;
    let pmucalcData = event.pmu_calc_info ? event.pmu_calc_info : pmuData;
    vectorRateCycle.value = pmuData.vec_busy_cycles;
    cubeRateCycle.value = pmuData.cube_busy_cycles;
    scalarRateCycle.value = pmuData.scalar_busy_cycles;
    mte1RateCycle.value = pmuData.mte1_busy_cycles;
    mte2RateCycle.value = pmuData.mte2_busy_cycles;
    mte3RateCycle.value = pmuData.mte3_busy_cycles;

    vectorRatePercentage.value = Math.round(pmucalcData.vec_ratio * 100);
    cubeRatePercentage.value = Math.round(pmucalcData.cube_ratio * 100);
    scalarRatePercentage.value = Math.round(pmucalcData.scalar_ratio * 100);
    mte1RatePercentage.value = Math.round(pmucalcData.mte1_ratio * 100);
    mte2RatePercentage.value = Math.round(pmucalcData.mte2_ratio * 100);
    mte3RatePercentage.value = Math.round(pmucalcData.mte3_ratio * 100);

    chartDataLeft.value = [vectorRateCycle.value, cubeRateCycle.value, scalarRateCycle.value,
                            mte1RateCycle.value, mte2RateCycle.value, mte3RateCycle.value];
    chartDataRight.value = [vectorRatePercentage.value, cubeRatePercentage.value, scalarRatePercentage.value,
                              mte1RatePercentage.value, mte2RatePercentage.value, mte3RatePercentage.value];
    const barChartContainerDivWidth = 340;
    barWidthList.value = [];
    for (const percent of chartDataRight.value) {
      barWidthList.value.push(barChartContainerDivWidth * percent / 100);
    }
  }
};

const dynamicWidthStyle = (event) => {
  if (!useDynamicWidth) {
    return {};
  }
  if (!event) {
    return {};
  }
  const eventName = getEventTruncateText(event);
  const width = `${((eventName.length * 7) + 4)}px`;
  let eventColor = '';
  if (isMixMode?.value && swimDataManager.hasMixConfig() && event?.parentEventId) {
    eventColor = event?.drawData?.rectColor;
  } else {
    eventColor = isDarkTheme.value ? event.color.dark : event.color.light;
  }
  const colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
  let fillColor = eventColor ? eventColor.base : 'rgba(10, 89, 247, 0.3)';
  const fontColor = colorCfg.eventFont;
  return {width, background:fillColor, color: fontColor};
};

function bindFilePath() {
  if (bindFile.value) {
    return server.unbindComGraph();
  }
  return server.bindComGraphJson();
}

function openBoundComGraph() {
  server.openBoundComGraph();
}

function jumpToComGraph(value) {
  server.jumpToComGraph({paramObj: { hash: value }});
}

function splitValue(value) {
  const splitString = value.split(', ');
  const splitMap = new Map(splitString.map(pair => {
    const [argKey, argValue] = pair.split(':');
    return [argKey, argValue];
  }));

  return splitMap;
}

function releventShowPre() {
  releventDisplay.value = DEP_MODE.pre;
  viewState.depMode = releventDisplay.value;
  renderDependencyLines();
}
function releventShowAll() {
  releventDisplay.value = DEP_MODE.all;
  viewState.depMode = releventDisplay.value;
  renderDependencyLines();
}
function releventShowNext() {
  releventDisplay.value = DEP_MODE.next;
  viewState.depMode = releventDisplay.value;
  renderDependencyLines();
}
let tPath = isDarkTheme.value ? ref(`${window.staticPath}/static-assets/circle.svg`) : ref(`${window.staticPath}/static-assets/circle_light.svg`);
const lPath = ref(`${window.staticPath}/static-assets/swim_left.svg`);
let aPath = isDarkTheme.value ? ref(`${window.staticPath}/static-assets/swim_all.svg`) : ref(`${window.staticPath}/static-assets/swim_all_light.svg`);
const rPath = ref(`${window.staticPath}/static-assets/swim_right.svg`);

const predecessors = computed(() => {
  if (!canvasclickedEvent.value?.dependencies?.predecessors) return [];
  if (!canvasclickedEvent.value?.parentEventId && !isPathLockStatus.value) {
    if (selectedEvent.value) {
      return selectedEvent.value.dependencies.predecessors.map(id =>
        swimDataManager.getEventById(id)
      ).filter(e => e);
    }
  }
  return canvasclickedEvent.value.dependencies.predecessors.map(id =>
    swimDataManager.getEventById(id)
  ).filter(e => e);
});

const successors = computed(() => {
  if (!canvasclickedEvent.value?.dependencies?.successors) return [];
  if (!canvasclickedEvent.value?.parentEventId && !isPathLockStatus.value) {
    if (selectedEvent.value) {
      return selectedEvent.value.dependencies.successors.map(id =>
        swimDataManager.getEventById(id)
      ).filter(e => e);
    }
  }
  return canvasclickedEvent.value.dependencies.successors.map(id =>
    swimDataManager.getEventById(id)
  ).filter(e => e);
});

const formatDuration = (value, minTime = 0) => {
  if (!value) {
    return '0';
  }
  let duration = (value - minTime) / tsScale.value;
  const decimalPlaces = duration.toString().split('.')[1]?.length || 0;
  const placesToKeep = Math.min(decimalPlaces, 3);
  return placesToKeep === 0 ? duration.toString() : duration.toFixed(placesToKeep);
};
const formattedDuration = computed(() => formatDuration(canvasclickedEvent.value?.duration));
const formattedStartTime = computed(() => formatDuration(canvasclickedEvent.value?.startTime, viewState.minTime));
const formattedEndTime = computed(() => formatDuration(canvasclickedEvent.value?.endTime, viewState.minTime));

const getEventDisplayName = (event) => {
  if (!event) {
    return '';
  }
  return event.isCounter ? event.displayName : (event.name || 'Event');
};
const getEventTruncateText = (event) => {
  const eventName = getEventDisplayName(event);
  let actualWidth = 140;
  const [truncatedText] = overflowText(actualWidth, eventName);
  return truncatedText;
};
window.jumpRawMagic = (value, hintValue) => {
  server.jumpRawMagic({paramObj: { rawmagic: value, ascendHint: hintValue}});
};

const createHint = (event, operate) => {
  if (!event.args) {
    return;
  }
  let value = event.args[operate];
  let eventhint = event.args['event-hint'] || '';
  eventhint = eventhint.replace(/\n/g, '');
  const regex = /'rawmagic':\s*(?<rawmagic>\d+)/g;
  let matches;
  let result = value;
  while ((matches = regex.exec(value)) !== null) {
    const rawmagicValue = matches.groups.rawmagic;
    const spanvalue = `<span class="event-hint-hash" onclick="jumpRawMagic('${rawmagicValue}', '${eventhint}')">${rawmagicValue}</span>`;
    result = result.replace(matches[0], `'rawmagic': ${spanvalue}`);
  }
  if (operate === 'ioperand-hint') {
    ioperandHtml.value = result;
  } else {
    ooperandHtml.value = result;
  }
};

const showEventDetail = (newEvent) => {
  if (newEvent) {
    normalizeSelectedView(newEvent);
    const duration = newEvent.duration !== undefined ? newEvent.duration : (newEvent.endTime - newEvent.startTime);
    startTimeInfo.value = formatTimeWithUnit((newEvent.startTime - viewState.minTime) * 1000 / tsScale.value).value;
    startTimeUnitInfo.value = formatTimeWithUnit((newEvent.startTime - viewState.minTime) * 1000 / tsScale.value).unit;
    startTimeInfoAll.value = startTimeInfo.value + startTimeUnitInfo.value;
    durationInfo.value = formatTimeWithUnit(duration * 1000 / tsScale.value).value;
    durationUnitInfo.value = formatTimeWithUnit(duration * 1000 / tsScale.value).unit;
    durationInfoAll.value = durationInfo.value + durationUnitInfo.value;
    nextTick(() => {
      createHint(newEvent, 'ioperand-hint');
      createHint(newEvent, 'ooperand-hint');
      showDependencies(newEvent, 'both');
      updateEventPmu(newEvent);
      getEventCacheHit(newEvent);
    });
  }
};


watch(canvasclickedEvent, (newEvent) => {
  if (isPathLockStatus.value) {
    showEventDetail(newEvent);
  }
});
watch(isDarkTheme, () => {
  updateTheme();
});
watch(detailsPanelExpanded, (val) => {
  if (val) {
    if (isCompactMode.value || isDetailFullExpand.value) {
      nextTick(() => syncPanelHeight());
    }
  } else {
    if (isDetailFullExpand.value) {
      isDetailFullExpand.value = false;
    }
    resetPanelStyle();
    nextTick(() => {
      if (canvasResizeObserver) {
        canvasResizeObserver.disconnect();
        canvasResizeObserver = null;
      }  
    });
  }
  if (val && !canvasResizeObserver) {
    nextTick(() => {
      initCanvasResizeObserver();
    });
  }
}, { immediate: true });
watch(isCompactMode, (val) => {
  nextTick(() => {
    if (!detailsPanelExpanded.value) return;
    if (val || isDetailFullExpand.value) {
      syncPanelHeight();
    } else {
      resetPanelStyle();
    }
  });
});
watch(selectedView, () => {
  if (isDetailFullExpand.value) {
    nextTick(() => recalcExpandHeight());
  }
});
watch(selectedEvent, (newEvent) => {
  showEventDetail(newEvent);
  if (isDetailFullExpand.value) {
    nextTick(() => recalcExpandHeight());
  }
});
const updateTheme = () => {
  tPath.value =  isDarkTheme.value ?`${window.staticPath}/static-assets/circle.svg`: `${window.staticPath}/static-assets/circle_light.svg`;
  aPath.value = isDarkTheme.value ? `${window.staticPath}/static-assets/swim_all.svg` : `${window.staticPath}/static-assets/swim_all_light.svg`;
  if (isDarkTheme.value) {
    pmuBarColorList.value = ['rgba(135, 52, 0, 1)', 'rgba(181, 78, 4, 1)', 'rgba(3, 97, 66, 1)', 
                            'rgba(70, 94, 184, 1)', 'rgba(158, 63, 0, 1)', 'rgba(72, 142, 32, 1)'];
  } else {
    pmuBarColorList.value = ['rgba(255, 200, 201, 1)', 'rgba(255, 201, 138, 1)', 'rgba(0, 238, 237, 1)', 
                            'rgba(171, 217, 255, 1)', 'rgba(231, 216, 0, 1)', 'rgba(0, 242, 186, 1)'];
  }
};
const onInputChange = (newValue, oldValue) => {
  userConfig.value.connectionLevel = newValue;
  const selectedEventTemp = clone(selectedEvent);
  highlightedPaths.clear();
  const processKey = String(selectedEventTemp.value.pid);
  selectEvent(null, processKey);
  selectEvent(selectedEventTemp.value, processKey);
  changeUserCfgConnection(newValue);
};
function changeUserCfgConnection(connectionLevelInfo) {
    server.changeUserCfgConnection({paramObj: {level: connectionLevelInfo}});
};

const resetReleventState = () => {
  releventDisplay.value = DEP_MODE.all;
  viewState.depMode = releventDisplay.value;
  connectionLevel.value = -1;
  userConfig.value.connectionLevel = -1;
  highlightedPaths.clear();
  changeUserCfgConnection(-1);
};

const locateDependencyEvent = (eventId) => {
  const targetEvent = swimDataManager.getEventById(eventId);
  if (!targetEvent) {
    return;
  }
  const processKey = String(targetEvent.pid);
  if (processExpanded && !processExpanded.get(processKey)) {
    toggleProcess(processKey);
  }
  nextTick(() => {
    highlightDependencyEvent(targetEvent);
    scrollToEvent(targetEvent);
  });
};

const onDependencyNodeClick = (eventId, type) => {
  locateDependencyEvent(eventId);
};

const showDependencies = (event, type) => {
  const displayName = event.isCounter ? event.displayName : event.name || 'Event';
  const eventPredecessors = event.dependencies?.predecessors?.map((id) => swimDataManager.getEventById(id)).filter((e) => e) || [];
  const eventSuccessors = event.dependencies?.successors?.map((id) => swimDataManager.getEventById(id)).filter((e) => e) || [];
  const canvasContainer = document.getElementById('canvas-container');

  // 如果 dependencyCanvasRef.value 为 null，直接使用 document.querySelector 获取
  let canvasEl = dependencyCanvasRef.value;
  if (!canvasEl) {
    canvasEl = document.querySelector('.dependency-canvas');
  }

  if (!canvasContainer || !canvasEl) {
    return;
  }

  // 确保 canvas 已注册到 CanvasPool
  const poolCanvas = canvasPool.getCanvas('dependency-canvas', '_default');

  // 确保 pool 中没有注册，或者pool中的canvas与当前ref不同，则重新注册，防止再次打开canvas元素引用不一致的问题
  if (!poolCanvas || poolCanvas !== canvasEl) {
    canvasPool.register('dependency-canvas', '_default', canvasEl);
  }
  // 计算填充色
  let fillColor = '';
  const colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
  if (isMixMode?.value && swimDataManager.hasMixConfig() && event?.parentEventId) {
    fillColor = event.drawData?.rectColor || '';
  } else {
    const eventColor = isDarkTheme.value ? event.color?.dark : event.color?.light;
    fillColor = eventColor?.light || '';
  }
  // 委托渲染器绘制
  detailDependencyRenderer.render(
    {
      displayName,
      predecessors: eventPredecessors.map(pre => ({
        name: pre.name,
        displayName: pre.displayName,
        isCounter: pre.isCounter,
        eventId: pre.id,
      })),
      successors: eventSuccessors.map(dep => ({
        name: dep.name,
        displayName: dep.displayName,
        isCounter: dep.isCounter,
        eventId: dep.id,
      })),
      fillColor,
      currentEventId: event.id,
      type,
    },
    {
      getCanvasWidth: () => canvasContainer.clientWidth - dependencyCanvasRef.value.offsetLeft - layout.marginRight,
      marginRight: layout.marginRight,
      colorCfg,
      overflowText,
    },
    {
      show: showTooltip,
      hide: hideTooltip,
    },
    onDependencyNodeClick
  );
};

// tooltip DOM 操作（由组件负责，渲染器回调）
const showTooltip = (e, text) => {
  let tooltip = document.getElementById('dependency-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'dependency-tooltip';
    tooltip.style.cssText = `
    position: absolute;
    background: var(--devui-tooltip-bg);
    color: var(--devui-primary-text);
    padding: 4px 8px;
    boder-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    pointer-events: none;`;
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
  const { canvasCssWidth } = viewState;
  if (e.clientX + 100 > canvasCssWidth) {
    tooltip.style.left = e.clientX - 100 + 'px';
  } else {
    tooltip.style.left = e.clientX + 10 + 'px';
  }
  tooltip.style.top = e.clientY + 10 + 'px';
  tooltip.style.display = 'block';
};
const hideTooltip = () => {
  const tooltip = document.getElementById('dependency-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
};

// 向 CanvasPool 注册 dependency-canvas 实例
onMounted(() => {
  if (dependencyCanvasRef.value) {
    canvasPool.register('dependency-canvas', '_default', dependencyCanvasRef.value);
  }
});

onBeforeUnmount(() => {
  canvasPool.unregister('dependency-canvas', '_default');
});

// 暴露方法给父组件
defineExpose({
  connectionLevel,
  resetReleventState,
  showDependencies,
  showEventDetail,
});

let canvasResizeObserver = null;
let panelResizeObserver = null;

onMounted(() => {
  const panel = document.querySelector('.details-panel');
  if (panel) {
    panelResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        detailsPanelWidth.value = entry.contentRect.width;
      }
    });
    panelResizeObserver.observe(panel);
    detailsPanelWidth.value = panel.getBoundingClientRect().width;
  }
});

const initCanvasResizeObserver = () => {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    return;
  }

  if (!(canvasContainer instanceof Element)) {
    return;
  }
  
  canvasResizeObserver = new ResizeObserver((entries) => {
    const event = isPathLockStatus.value ? canvasclickedEvent.value : selectedEvent.value;
    if (event) {
      showDependencies(event, 'both');
    }
  });

  canvasResizeObserver.observe(canvasContainer);
};

onUnmounted(() => {
  if (canvasResizeObserver) {
    canvasResizeObserver.disconnect();
    canvasResizeObserver = null;
  }
  if (panelResizeObserver) {
    panelResizeObserver.disconnect();
    panelResizeObserver = null;
  }
});
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/Detail/detail.css");

.swimGraphBadge :deep(.devui-badge__content) {
  color: var(--devui-secondary-text) !important;
  font-family: monospace;
}

.swimGraphBadge :deep(.devui-badge--common) {
  color: var(--devui-secondary-text) !important;
  background: var(--devui-font-badge-bg);
}

.details-panel {
  overflow: hidden;
}

.details-panel.narrow-mode.expanded {
  height: 266px;
}

.detail-content.narrow-mode {
  height: 250px;
}

.expand-toggle {
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 100%;
  box-shadow: var(--devui-detail-boxshadow);
  background: var(--devui-swim-detail-bg);
}

.details-content {
  overflow: hidden;
}

.details-panel.full-expand .detail-content {
  height: auto;
  overflow: auto;
}

.details-panel.full-expand .content-args {
  height: auto;
  min-height: 186px;
  max-height: none;
  overflow: visible;
}

.details-panel.full-expand .pmu-content-host {
  height: auto;
  max-height: none;
  overflow: visible;
}

.details-panel.full-expand #canvas-container {
  height: auto !important;
  min-height: 186px;
}

.pmu-content-host {
  max-height: 186px;
  min-height: 186px;
  overflow: auto;
  min-width: 464px;
  flex: 0 0 auto;
  width: auto;
}

.pmu-content-host:has(.ultra-compact-mode) {
  min-width: 300px;
}

.detail-main-container:has(.ultra-compact-mode) {
  width: 100% !important;
}

.pmu-content-host .content-args-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding-bottom: 4px;
  background: var(--devui-swim-detail-bg);
}

:deep() {
  .input-number-container {
    margin-left: 10px;
    :deep() {
      .devui-input-number__input-box {
        border-radius: 0 var(--devui-border-radius) var(--devui-border-radius) 0;
      }
    }
  }

  .input-number-container.devui-input-number--md {
    height: 28px;
  }

  .input-number-container .devui-input-number__control-buttons .control-button.control-dec svg {
    bottom: 0;
  }
  
  .input-number-container .devui-input-number__control-buttons .control-button.control-inc svg {
    top: 0;
  }

  .input-number-container.locked-style {
    background-color: var(--devui-input-bg) !important;
    height: 28px;
    border-color: transparent;
    input {
      background-color: transparent !important;
      border-color: transparent;
    }
    .disabled {
      opacity: 0.8;
      color: rgba(153, 153, 153, 1);
    }
  }
  .argsTabs {
    .devui-tabs__nav--tabs li {
      margin-bottom: 0px;
    }
    .devui-tabs__nav--tabs {
      border-bottom: 1px var(--devui-swim-border-color) solid;
    }
    .devui-tabs__nav--tabs li.active a, .devui-tabs__nav--tabs li:hover:not(.disabled) a, .devui-tabs__nav--pills li.active a, .devui-tabs__nav--pills li:hover:not(.disabled) a {
      color: var(--devui-title-text);
    }
    .devui-tabs__nav--tabs li.active:after, .devui-tabs__nav--pills li.active:after {
      background: var(--devui-slider-bar);
    }
    .devui-tab__content {
      margin-top: 0;
      padding: 0;
    }
  }
  .bindbox.devui-button--text--primary {
    color: var(--devui-link-text);

    &:hover {
      color: var(--devui-hover-icon);
    }
  }
}
</style>
<style>
.event-hint-hash {
  color: #526ECC !important;
  margin: 0 2px 0 2px !important;
}

.event-hint-hash:hover{
  color: #344899 !important;
  cursor: pointer !important;
}
</style>
