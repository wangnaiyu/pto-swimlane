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
  <div style="z-index: 11;">
    <div class="measure-details" :class="{ expanded: mulDetailsExpanded, 'no-tabs': !isDeviceView }">
      <div class="measure-details-content" :class="{ 'no-tabs': !isDeviceView }">
        <div class="measure-detail-tabs-header" v-if="isDeviceView">
          <d-tabs v-model="selectedTab" class="measure-detail-tabs" :show-content="false"
            @active-tab-change="selectTab">
            <d-tab id="device" :title="$t('DeviceOverview')"></d-tab>
            <d-tab id="cores" :title="$t('CoreStatistics')"></d-tab>
          </d-tabs>
        </div>
        <div class="measure-detail-tabs-content">
          <!-- Device概览 -->
          <div v-show="selectedTab === 'device' || (!isDeviceView && isAicpu)" class="measure-detail-device-content">
            <div class="measure-detail-left-section">
              <div class="measure-detail-data-area">
                <div class="measure-detail-data-uparea">
                  <div class="measure-detail-data-item">
                    <div class="data-title-row">
                      <div class='data-title'>{{ $t('AICPUUtilization') }}</div>
                      <d-tooltip :content="$t('AICPUUtilizationTip')">
                        <d-icon name="helping" size="16px"></d-icon>
                      </d-tooltip>
                    </div>
                    <div class="data-value">{{ AICPUUsage }}</div>
                  </div>
                  <div class="measure-detail-data-item">
                    <div class="data-title-row">
                      <div class='data-title'>{{ $t('AICore') }}</div>
                      <d-tooltip :content="$t('CubeUtilizationTIP')">
                        <d-icon name="helping" size="16px"></d-icon>
                      </d-tooltip>
                    </div>
                    <div class="data-value">{{ AICoreUsage }}</div>
                  </div>
                </div>
                <div class="measure-detail-data-downarea">
                  <div class="measure-detail-data-downarea-time">
                    <div class="measure-detail-data-item">
                      <div class="data-title-row">
                        <d-tooltip :content="$t('coreHeadToTail', {coreWaitTimeUint})">
                          <div class='data-title'>{{ $t('coreHeadToTail', {coreWaitTimeUint}) }}</div>
                        </d-tooltip>
                        <d-tooltip :content="$t('coreHeadToTailTip')">
                          <d-icon name="helping" size="16px"></d-icon>
                        </d-tooltip>
                      </div>
                      <div class="device-cube-time-value" :class="{ 'light-theme': !isDarkTheme }">{{ formatNumber(coreWaitTime) }}</div>
                    </div>
                    <div class="measure-detail-data-item">
                      <div class="data-title-row">
                        <d-tooltip :content="$t('coreExecutionTime', {coreExecutTimeUint})">
                          <div class='data-title'>{{ $t('coreExecutionTime', {coreExecutTimeUint}) }}</div>
                        </d-tooltip>
                        <d-tooltip :content="$t('coreExecutionTimeTip')">
                          <d-icon name="helping" size="16px"></d-icon>
                        </d-tooltip>
                      </div>
                      <div class="device-vector-time-value" :class="{ 'light-theme': !isDarkTheme }">{{ formatNumber(coreExecutTime) }}</div>
                    </div>
                  </div>
                  <div class="measure-detail-data-downarea-time-ratio">
                    <div v-if="coreWaitTimeBarVisible" class="device-cube-time-bar"
                      :style="getDeviceCubeBarStyle()">
                      <d-tooltip v-if="coreWaitTimeRate === '···'" :content="`${coreWaitTimeRateOriginal}%`">
                        <div class="cube-time-num">{{ coreWaitTimeRate }}</div>
                      </d-tooltip>
                      <div v-else class="cube-time-num">{{ coreWaitTimeRate }}</div>
                    </div>
                    <div v-if="coreExecutTimeBarVisible" class="device-vector-time-bar"
                      :style="getDeviceVectorBarStyle()">
                      <d-tooltip v-if="coreExecutTimeRate === '···'" :content="`${coreExecutTimeRateOriginal}%`">
                        <div class="vector-time-num">{{ coreExecutTimeRate }}</div>
                      </d-tooltip>
                      <div v-else class="vector-time-num">{{ coreExecutTimeRate }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="measure-detail-right-section" v-if="!isPerfSwim">
              <div class="measure-detail-search-area">
                <d-category-search class="measure-detail-category-search" :category="deviceCategory"
                  :extend-config="{ save: { show: false } }" @selectedTagsChange="onDeviceMeasureSearch" style="width: 58%;"
                  :default-search-field="deviceDefaultSearchField" @search="onDeviceSearch"
                  :placeholder="$t('measureCategoryPlaceholder')" :text-config="textConfig"
                  :show-search-category="searchConfig">
                </d-category-search>
                <div class="event-num">{{ $t('totalCoreEvents', { coreEventNum }) }}</div>
              </div>
              <div class="measure-detail-data-table">
                <d-data-grid :data = "deviceMeasureDetailTableData"
                :columns ="deviceMeasureColumnData"
                :show-overflow-tooltip = "showOverflowTooltip"
                :show-head-overflow-tooltip = "showOverflowTooltip"
                class="mulDetailTable" fix-header style="width: 100%"></d-data-grid>
              </div>
            </div>
          </div>
          <!-- 核内统计 -->
          <div v-show="selectedTab === 'cores' || (!isDeviceView && !isAicpu)" class="measure-detail-cores-content">
            <div class="measure-detail-left-section">
              <div class="measure-detail-data-area">
                <div class="measure-detail-data-uparea">
                  <div class="measure-detail-data-item">
                    <div class="data-title-row">
                      <div class='data-title'>{{ $t('AICore') }}</div>
                      <d-tooltip :content="$t('AICoreTIP')">
                        <d-icon name="helping" size="16px"></d-icon>
                      </d-tooltip>
                    </div>
                    <div class="data-value">{{ AICoreUsage }}</div>
                  </div>
                  <div class="measure-detail-data-item">
                    <div class="data-title-row">
                      <div class='data-title'>{{ $t('CubeUtilization') }}</div>
                      <d-tooltip :content="$t('CubeUtilizationTIP')">
                        <d-icon name="helping" size="16px"></d-icon>
                      </d-tooltip>
                    </div>
                    <div class="data-value">{{ AICUsage }}</div>
                  </div>
                  <div class="measure-detail-data-item">
                    <div class="data-title-row">
                      <div class='data-title'>{{ $t('VectorUtilization') }}</div>
                      <d-tooltip :content="$t('VectorUtilizationTIP')">
                        <d-icon name="helping" size="16px"></d-icon>
                      </d-tooltip>
                    </div>
                    <div class="data-value">{{ AIVUsage }}</div>
                  </div>
                </div>
                <div class="measure-detail-data-downarea">
                  <div class="measure-detail-data-downarea-time">
                    <div class="measure-detail-data-item">
                      <div class="data-title-row">
                        <div class='data-title'>{{ $t('cubeTime') }}</div>
                        <d-tooltip :content="$t('cubeTimeTIP')">
                          <d-icon name="helping" size="16px"></d-icon>
                        </d-tooltip>
                      </div>
                      <div class="cube-time-value">{{ formatNumber(cubeCycle) }}</div>
                    </div>
                    <div class="measure-detail-data-item">
                      <div class="data-title-row">
                        <div class='data-title'>{{ $t('vectorTime') }}</div>
                        <d-tooltip :content="$t('vectorTimeTIP')">
                          <d-icon name="helping" size="16px"></d-icon>
                        </d-tooltip>
                      </div>
                      <div class="vector-time-value">{{ formatNumber(vectorCycle) }}</div>
                    </div>
                  </div>
                  <div class="measure-detail-data-downarea-time-ratio">
                    <div v-if="cubeCycleBarVisible" class="cube-time-bar"
                      :style="getCubeBarStyle()">
                      <d-tooltip v-if="cubeCycleRate === '--'" :content="`${cubeCycleRateOriginal}%`">
                        <div class="cube-time-num">{{ cubeCycleRate }}</div>
                      </d-tooltip>
                      <div v-else class="cube-time-num">{{ cubeCycleRate }}</div>
                    </div>
                    <div v-if="vectorCycleBarVisible" class="vector-time-bar"
                      :style="getVectorBarStyle()">
                      <d-tooltip v-if="vectorCycleRate === '--'" :content="`${vectorCycleRateOriginal}%`">
                        <div class="vector-time-num">{{ vectorCycleRate }}</div>
                      </d-tooltip>
                      <div v-else class="vector-time-num">{{ vectorCycleRate }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="measure-detail-right-section" v-if="!isPerfSwim">
              <div class="measure-detail-search-area">
                <d-category-search class="measure-detail-category-search" :category="category"
                  :extend-config="{ save: { show: false } }" @selectedTagsChange="onMeasureSearch" style="width: 58%;"
                  :default-search-field="defaultSearchField" @search="onSearch"
                  :placeholder="$t('measureCategoryPlaceholder')" :text-config="textConfig"
                  :show-search-category="searchConfig">
                </d-category-search>
                <div class="event-num">{{ $t('totalEvents', { eventNum }) }}</div>
              </div>
              <div class="measure-detail-data-table">
                <d-data-grid :data = "measureDetailTableData"
                :columns ="measureColumnData"
                :show-overflow-tooltip = "showOverflowTooltip"
                :show-head-overflow-tooltip = "showOverflowTooltip"
                class="mulDetailTable" fix-header style="width: 100%"></d-data-grid>
              </div>
            </div>
            <div v-else class="measure-detail-right-section no-file-container">
              <div><img :src="iconPath" alt="" class="no-file-icon" /></div>
              <div class="no-file-title">{{ $t('noDataText') }}</div>
            </div>
          </div>
        </div>
        <div class="close-button">
          <d-button icon="icon-close" style="width: 16px; font-size: 16px; border: none; background-color: transparent"
            @click="measureDetailsPanel()"></d-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatTimeUnit, formatTimeValue } from '../swimGraphPerformance/utils';
const { t } = useI18n();

const formatNumber = (value) => {
  if (value === '--' || value === '' || value === undefined) {
    return value;
  }
  const numStr = String(value);
  if (numStr.includes(',') || isNaN(Number(numStr.replace(/,/g, '')))) {
    return value;
  }
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// 注入父组件提供的状态和方法
const {
  mulDetailsExpanded,
  measureDetailsExpanded,
  measureDetailsData,
  rootHashes,
  leafHashes,
  leafHashMap,
  isPerfSwim,
  deviceDataMap,
  isDeviceView,
  isAicpu
} = inject('swimGraphState');

const {
} = inject('swimGraphMethods');
const { isDarkTheme } = inject('root');
let iconPath = computed(() => `${window.staticPath}/static-assets/noFile${isDarkTheme.value ? 'Dark' : ''}.png`);
const AICoreUsage = ref('0');
const AICUsage = ref('0');
const AIVUsage = ref('0');
const cubeCycle = ref('0');
const vectorCycle = ref('0');
const cubeCycleRate = ref('0');
const vectorCycleRate = ref('0');
const cubeCycleRateValue = ref('0');
const vectorCycleRateValue = ref('0');
const coreWaitTimeRate = ref('0');
const coreExecutTimeRate = ref('0');
const coreWaitTimeRateValue = ref('0');
const coreExecutTimeRateValue = ref('0');
const coreWaitTimeUint = ref('μs');
const coreExecutTimeUint = ref('μs');

const cubeCycleRateOriginal = ref(0);
const vectorCycleRateOriginal = ref(0);
const coreWaitTimeRateOriginal = ref(0);
const coreExecutTimeRateOriginal = ref(0);

const cubeCycleBarVisible = ref(false);
const vectorCycleBarVisible = ref(false);
const coreWaitTimeBarVisible = ref(false);
const coreExecutTimeBarVisible = ref(false);

const MIN_RATE_THRESHOLD = 15;
const AICPUUsage = ref('0');
const coreWaitTime = ref('0');
const coreExecutTime = ref('0');
const eventNum = ref('0');
const coreEventNum = ref('0');

const measureDetailTableData = ref([]);
const deviceMeasureDetailTableData = ref([]);
const deviceMeasureColumnData = computed(() => [
  { field: 'Event name', header: 'Worker Phase', showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'Max duration line', header: t('MaxConsumingLane'), showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'Max duration', header: t('MaxConsuming'), showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'Avg duration', header: t('arverConsuming'), showOverflowTooltip: true, showHeadOverflowTooltip: true },
]);

const measureColumnData = computed(() => [
  { field: 'rootFuncHash', header: 'Root Func. Hash', showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'leafFuncHash', header: 'Leaf Func. Hash', showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'occurrences', header: 'Occurrences', showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'wallDuration', header: 'Wall duration(ms)', showOverflowTooltip: true, showHeadOverflowTooltip: true },
  { field: 'avgDuration', header: 'AvG. Wall duration(ms)', showOverflowTooltip: true, showHeadOverflowTooltip: true },
]);
const showOverflowTooltip = false;

const selectedTab = ref('cores');
const selectTab = (tab) => {
  selectedTab.value = tab;
};

const measureDetailsPanel = () => {
  mulDetailsExpanded.value = !mulDetailsExpanded.value;
};
let searchKeyInfo = '';
const defaultSearchField = ['Root', 'Leaf'];
let category = [
  {
    label: 'Root Func. Hash',
    field: 'Root',
    type: 'radio',
    group: 'Basic',
    filterKey: 'Option',
    options: []
  },
  {
    label: 'Leaf Func. Hash',
    field: 'Leaf',
    type: 'radio',
    group: 'Basic',
    filterKey: 'Option',
    options: []
  }
];
let deviceSearchKeyInfo = '';
const deviceDefaultSearchField = ['EventName'];
let originalEventNum = '0';
let originalCoreEventNum = '0';
let isClearingSearch = false;
let deviceCategory = [
  {
    label: 'Event Name',
    field: 'EventName',
    type: 'radio',
    group: 'Basic',
    filterKey: 'Option',
    options: []
  }
];
const textConfig = {
  noCategoriesAvailable: t('noSearchCondition'),
  tagMenuEmpty: t('noSearchMeasureDetaildata'),
  keywordName: t('comGraph.keyword')
};
const searchConfig = {
  keywordDescription: (key) => t('swimGraphkeywordDesc', { key }),
  fieldDescription: (label) => t('swimGraphfieldDesc', { label }),
  categoryDescription: t('swimGraphcategoryDesc')
};
const onSearch = (event) => {
  const { searchKey } = event;
  searchKeyInfo = searchKey;
  if (searchKey === '') {
    eventNum.value = originalEventNum;
    isClearingSearch = true;
    onMeasureSearch(event);
    isClearingSearch = false;
  }
};
const onMeasureSearch = (event) => {
  initTableDatas();
  const { selectedTags } = event;
  let defaultFilterData = measureDetailTableData.value;
  if (searchKeyInfo) {
    defaultFilterData = measureDetailTableData.value.filter(item =>
      item.rootFuncHash.includes(searchKeyInfo) || item.leafFuncHash.includes(searchKeyInfo)
    );
  }
  const filteredData = selectedTags.reduce((item, { field, value: { Option } }) => {
    return item.filter(row => {
      if (field === 'Root') {
        return row.rootFuncHash === Option;
      }
      if (field === 'Leaf') {
        return row.leafFuncHash === Option;
      }
      return true;
    });
  }, [...defaultFilterData]);
  measureDetailTableData.value = filteredData;
  if (measureDetailTableData.value.length === 0) {
    measureDetailTableData.value = [];
  }
  if (!isClearingSearch) {
    eventNum.value = filteredData.length.toString();
    if (event.operation === 'clear') {
      coreEventNum.value = originalEventNum;
    }
  }
};

const onDeviceSearch = (event) => {
  const { searchKey } = event;
  deviceSearchKeyInfo = searchKey;
  if (searchKey === '') {    
    coreEventNum.value = originalCoreEventNum;
    isClearingSearch = true;
    onDeviceMeasureSearch(event);
    isClearingSearch = false;
  }
};
const onDeviceMeasureSearch = (event) => {
  initTableDatas();
  const { selectedTags } = event;
  let defaultFilterData = deviceMeasureDetailTableData.value;
  if (deviceSearchKeyInfo) {
    const searchKeyLower = deviceSearchKeyInfo.toLowerCase();
    defaultFilterData = deviceMeasureDetailTableData.value.filter(item =>
      item['Event name'].toLowerCase().includes(searchKeyLower)
    );
  }
  const filteredData = selectedTags.reduce((item, { field, value: { Option } }) => {
    return item.filter(row => {
      if (field === 'EventName') {
        return row['Event name'].toLowerCase() === Option.toLowerCase();
      }
      return true;
    });
  }, [...defaultFilterData]);
  deviceMeasureDetailTableData.value = filteredData;
  if (deviceMeasureDetailTableData.value.length === 0) {
    deviceMeasureDetailTableData.value = [];
  }
  if (!isClearingSearch) {
    coreEventNum.value = filteredData.length.toString();
    if (event.operation === 'clear') {
      coreEventNum.value = originalCoreEventNum;
    }
  }
};
const MIN_BAR_WIDTH = 20;
const getCubeBarStyle = () => {
  if (cubeCycleRate.value === '--') {
    return { flex: `0 0 ${MIN_BAR_WIDTH}px`, width: `${MIN_BAR_WIDTH}px` };
  }
  return { flex: `${cubeCycleRateValue.value}%` };
};

const getVectorBarStyle = () => {
  if (vectorCycleRate.value === '--') {
    return { flex: `0 0 ${MIN_BAR_WIDTH}px`, width: `${MIN_BAR_WIDTH}px` };
  }
  return { flex: `${vectorCycleRateValue.value}%` };
};

const getDeviceCubeBarStyle = () => {
  if (coreWaitTimeRate.value === '···') {
    return { flex: `0 0 ${MIN_BAR_WIDTH}px`, width: `${MIN_BAR_WIDTH}px` };
  }
  return { flex: `${coreWaitTimeRateValue.value}%` };
};

const getDeviceVectorBarStyle = () => {
  if (coreExecutTimeRate.value === '···') {
    return { flex: `0 0 ${MIN_BAR_WIDTH}px`, width: `${MIN_BAR_WIDTH}px` };
  }
  return { flex: `${coreExecutTimeRateValue.value}%` };
};

const rateToValue = () => {
  cubeCycleRateValue.value = cubeCycleRate.value === '--' ? cubeCycleRateOriginal.value : cubeCycleRate.value;
  vectorCycleRateValue.value = vectorCycleRate.value === '--' ? vectorCycleRateOriginal.value : vectorCycleRate.value;
  if (cubeCycleRateValue.value === 0 && vectorCycleRateValue.value === 0) {
    cubeCycleRateValue.value = 50;
    vectorCycleRateValue.value = 50;
  }
  cubeCycleRate.value = cubeCycleRate.value === '--' ? cubeCycleRate.value : `${cubeCycleRate.value}%`;
  vectorCycleRate.value = vectorCycleRate.value === '--' ? vectorCycleRate.value : `${vectorCycleRate.value}%`;

  cubeCycleBarVisible.value = cubeCycleRateOriginal.value > 0;
  vectorCycleBarVisible.value = vectorCycleRateOriginal.value > 0;
};

const deviceRateToValue = () => {
  coreWaitTimeRateValue.value = coreWaitTimeRate.value === '···' ? coreWaitTimeRateOriginal.value : coreWaitTimeRate.value;
  coreExecutTimeRateValue.value = coreExecutTimeRate.value === '···' ? coreExecutTimeRateOriginal.value : coreExecutTimeRate.value;
  if (coreWaitTimeRateValue.value === 0 && coreExecutTimeRateValue.value === 0) {
    coreWaitTimeRateValue.value = 50;
    coreExecutTimeRateValue.value = 50;
  }
  coreWaitTimeRate.value = coreWaitTimeRate.value === '···' ? coreWaitTimeRate.value : `${coreWaitTimeRate.value}%`;
  coreExecutTimeRate.value = coreExecutTimeRate.value === '···' ? coreExecutTimeRate.value : `${coreExecutTimeRate.value}%`;

  coreWaitTimeBarVisible.value = coreWaitTimeRateOriginal.value > 0;
  coreExecutTimeBarVisible.value = coreExecutTimeRateOriginal.value > 0;
};

const initDatas = () => {
  if (measureDetailsData.value.length === 0) {
    return;
  }
  const [data] = measureDetailsData.value;
  const handleNaN = (value) => {
    return isNaN(value) ? '--' : value;
  };

  const usageValue = (value) => {
    if (value === '--') {
      return value;
    } else {
      return value + '%';
    }
  };

  AICoreUsage.value = usageValue(handleNaN(data.AICoreusage));
  AICUsage.value = usageValue(handleNaN(data.AICusage));
  AIVUsage.value = usageValue(handleNaN(data.AIVusage));
  AICPUUsage.value = usageValue(handleNaN(data.AICPUusage));
  eventNum.value = handleNaN(data.eventnum);
  coreEventNum.value = handleNaN(data.coreEventNum);
  originalEventNum = handleNaN(data.eventnum);
  originalCoreEventNum = handleNaN(data.coreEventNum);

  const processCycleValue = (value) => {
    return value === 0 ? '--' : handleNaN(value);
  };

  cubeCycle.value = processCycleValue(data.cubecycle);
  vectorCycle.value = processCycleValue(data.vectorcycle);
  coreWaitTime.value = processCycleValue(formatTimeValue(data.coreWaitTime));
  coreWaitTimeUint.value = formatTimeUnit(data.coreWaitTime);
  coreExecutTime.value = processCycleValue(formatTimeValue(data.coreExecutTime));
  coreExecutTimeUint.value = formatTimeUnit(data.coreExecutTime);

  const cubeCycleNum = cubeCycle.value === '--' ? NaN : parseFloat(cubeCycle.value);
  const vectorCycleNum = vectorCycle.value === '--' ? NaN : parseFloat(vectorCycle.value);

  if (isNaN(cubeCycleNum) && isNaN(vectorCycleNum)) {
    cubeCycleRate.value = '--';
    vectorCycleRate.value = '--';
    cubeCycleRateOriginal.value = 0;
    vectorCycleRateOriginal.value = 0;
  } else if (isNaN(cubeCycleNum)) {
    cubeCycleRate.value = '--';
    vectorCycleRate.value = 100;
    cubeCycleRateOriginal.value = 0;
    vectorCycleRateOriginal.value = 100;
  } else if (isNaN(vectorCycleNum)) {
    cubeCycleRate.value = 100;
    vectorCycleRate.value = '--';
    cubeCycleRateOriginal.value = 100;
    vectorCycleRateOriginal.value = 0;
  } else {
    const total = cubeCycleNum + vectorCycleNum;
    cubeCycleRateOriginal.value = parseFloat(((cubeCycleNum / total) * 100).toFixed(2));
    vectorCycleRateOriginal.value = parseFloat(((vectorCycleNum / total) * 100).toFixed(2));

    if (cubeCycleRateOriginal.value < MIN_RATE_THRESHOLD) {
      cubeCycleRate.value = '--';
    } else {
      cubeCycleRate.value = cubeCycleRateOriginal.value;
    }

    if (vectorCycleRateOriginal.value < MIN_RATE_THRESHOLD) {
      vectorCycleRate.value = '--';
    } else {
      vectorCycleRate.value = vectorCycleRateOriginal.value;
    }
  }
  rateToValue();

  const coreWaitTimeNum = coreWaitTime.value === '--' ? NaN : parseFloat(coreWaitTime.value);
  const coreExecutTimeNum = coreExecutTime.value === '--' ? NaN : parseFloat(coreExecutTime.value);

  if (isNaN(coreWaitTimeNum) && isNaN(coreExecutTimeNum)) {
    coreWaitTimeRate.value = '···';
    coreExecutTimeRate.value = '···';
    coreWaitTimeRateOriginal.value = 0;
    coreExecutTimeRateOriginal.value = 0;
  } else if (isNaN(coreWaitTimeNum)) {
    coreWaitTimeRate.value = '···';
    coreExecutTimeRate.value = 100;
    coreWaitTimeRateOriginal.value = 0;
    coreExecutTimeRateOriginal.value = 100;
  } else if (isNaN(coreExecutTimeNum)) {
    coreWaitTimeRate.value = 100;
    coreExecutTimeRate.value = '···';
    coreWaitTimeRateOriginal.value = 100;
    coreExecutTimeRateOriginal.value = 0;
  } else {
    const deviceTotal = coreWaitTimeNum + coreExecutTimeNum;
    coreWaitTimeRateOriginal.value = parseFloat(((coreWaitTimeNum / deviceTotal) * 100).toFixed(2));
    coreExecutTimeRateOriginal.value = parseFloat(((coreExecutTimeNum / deviceTotal) * 100).toFixed(2));

    if (coreWaitTimeRateOriginal.value < MIN_RATE_THRESHOLD) {
      coreWaitTimeRate.value = '···';
    } else {
      coreWaitTimeRate.value = coreWaitTimeRateOriginal.value;
    }

    if (coreExecutTimeRateOriginal.value < MIN_RATE_THRESHOLD) {
      coreExecutTimeRate.value = '···';
    } else {
      coreExecutTimeRate.value = coreExecutTimeRateOriginal.value;
    }
  }
  deviceRateToValue();
};

const initTableDatas = () => {
  measureDetailTableData.value = [];
  deviceMeasureDetailTableData.value = [];
  leafHashMap.value.forEach((value, key) => {
    const avgWallDuration = value['Avg Wall duration'];
    const occurrences = value.Occurrences;
    const wallDuration = value['Wall duration'];
    const rootHashValue = value['root hash'];
    const leafHashValue = value['leaf hash'];
    const tableData = {
      rootFuncHash: rootHashValue,
      leafFuncHash: leafHashValue,
      occurrences,
      wallDuration: Number(wallDuration).toFixed(2),
      avgDuration: Number(avgWallDuration).toFixed(2)
    };
    measureDetailTableData.value.push(tableData);
  });

  deviceDataMap.value.forEach((value, key) => {
    const deviceTableData = {
      'Event name': value['Event name'],
      'Max duration line': value['Max duration line'],
      'Max duration': Number(value['Max duration']).toFixed(2),
      'Avg duration': Number(value['Avg duration']).toFixed(2)
    };
    deviceMeasureDetailTableData.value.push(deviceTableData);
  });
};


defineExpose({
});

watch([mulDetailsExpanded, measureDetailsExpanded], ([newMulValue, newMeasureValue]) => {
  if (newMulValue === true || newMeasureValue === true) {
    if (newMulValue === true) {
      if (isDeviceView?.value) {
        selectedTab.value = 'device';
      } else {
        selectedTab.value = isAicpu?.value ? 'device' : 'cores';
      }
    }
    initDatas();
    initTableDatas();
    category.forEach((item, index) => {
      item.options = index === 0 ? transformToOptions(rootHashes.value) : transformToOptions(leafHashes.value);
    });
    category = JSON.parse(JSON.stringify(category));
    deviceCategory.forEach((item) => {
      item.options = transformToDeviceEventNameOptions(deviceDataMap.value);
    });
    deviceCategory = JSON.parse(JSON.stringify(deviceCategory));
  }
});
watch(isDeviceView, (newValue) => {
  if (newValue) {
    selectedTab.value = 'device';
  } else {
    selectedTab.value = isAicpu?.value ? 'device' : 'cores';
  }
});

watch(isAicpu, (newValue) => {
  if (!isDeviceView?.value) {
    selectedTab.value = newValue ? 'device' : 'cores';
  }
});
const transformToOptions = (source) =>
  [...source.values()].map(item => ({ Option: item }));

const transformToDeviceEventNameOptions = (source) => {
  const eventNames = new Set();
  source.forEach((value) => {
    if (value['Event name']) {
      eventNames.add(value['Event name']);
    }
  });
  return [...eventNames].map(item => ({ Option: item }));
};
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/MeasureDetail/measureDetail.css");

:deep() {
  .measure-detail-category-search.dp-category-search-container {
    border: 1px solid transparent;
    background: var(--devui-category-search-bg);
  }

  .measure-detail-category-search.dp-category-search-container .devui-tag .devui-tag__item.devui-tag--md {
    font-size: 13px;
  }

  .measure-detail-category-search.dp-category-search-container:focus-within {
    border: 1px solid var(--devui-search-active-bg);
  }

  .measure-detail-category-search.container-hover {
    border: 1px solid var(--devui-category-search-hover-border);
  }

  .measure-detail-category-search.dp-category-search-container {
    .dp-category-search-line-container {
      height: 30px;

      &:hover {
        overflow-y: hidden;
      }
    }

    .dp-category-search-toggle {
      color: var(--devui-category-search-font-color);
      caret-color: var(--devui-search-active-bg);

      &::placeholder {
        color: var(--devui-category-search-placeholder);
        font-size: 13px;
      }
    }
  }
}
</style>

<style scoped lang="scss">
:deep() {
  .mulDetailTable {
    .devui-data-grid::-webkit-scrollbar {
      width: 4px;
    }

    .devui-data-grid__empty {
      text-align: center;
    }

    .devui-data-grid__head {
      background: var(--devui-swim-split-line);
    }

    .devui-data-grid__head .devui-data-grid__th {
      color: var(--devui-secondary-text);
    }

    .devui-data-grid__body .devui-data-grid__tr {
      background: var(--devui-swim-detail-bg);
    }
  }

  .measure-detail-search-area .dp-category-search-container:focus-within {
    border-color: #5e7cc0;
    border-color: var(--devui-form-control-line-active);
  }
}

.measure-detail-data-table::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.no-file-icon {
  width: 100px;
  height: 100px;
}

.no-file-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--devui-category-search-font-color)
}

.no-file-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;

  .devui-button {
    border-radius: 8px;
  }
}
</style>
