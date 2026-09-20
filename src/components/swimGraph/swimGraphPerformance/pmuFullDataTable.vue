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
  <div
   class="pmu-full-data-container"
   :style="{
      width: containerWidth + 'px',
      '--border-color': isDarkTheme ? 'rgba(255, 255, 255, 0.42)' : 'rgba(0, 0, 0, 0.42)',
      '--shadow-color-1': isDarkTheme ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      '--shadow-color-2': isDarkTheme ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'
   }"
  >
    <div class="pmu-full-data-header">
        <div class="pmu-back-button" @click="handleBack">
            <d-icon name="arrow-left" size="16px"></d-icon>
            <span>{{ $t('pmuBackToTop5') }}</span>
        </div>
    </div>

    <div class="pmu-filter-toggle">
        <button
          class="pmu-filter-button"
          :class="{ active: filterType === 'negative' }"
          @click="filterType = 'negative'"
        >
            {{ $t('pmuNegativeGap')}}
        </button>
        <button
          class="pmu-filter-button"
          :class="{ active: filterType === 'positive' }"
          @click="filterType = 'positive'"
        >
            {{ $t('pmuPositiveGap')}}
        </button>

        <div class="pmu-legend-container">
            <span class="pmu-legend-text">{{ $t('pmuLegend') }}</span>
            <d-icon name="helping" size="16px" class="pmu-legend-icon"></d-icon>
            <div class="pmu-legend-popup">
                <div class="pmu-legend-content">
                    <div class="pmu-legend-section">
                        <div class="pmu-legend-label title">{{ $t('pmuNegativeGap') }}</div>
                        <div class="pmu-legend-label">{{ $t('pmuTotalCost') }}</div>
                        <div class="pmu-legend-line">
                            <span class="pmu-legend-line-start">|</span>
                            <span class="pmu-legend-line-dash"></span>
                            <span class="pmu-legend-line-end">|</span>
                        </div>
                        <div class="pmu-legend-task-bar">
                            <div class="pmu-legend-task-bar-fill" style="width: 50%"></div>
                        </div>
                        <div class="pmu-legend-line half clock">
                            <span class="pmu-legend-line-start">|</span>
                            <span class="pmu-legend-line-dash"></span>
                            <span class="pmu-legend-line-end">|</span>
                        </div>
                        <div class="pmu-legend-label">{{ $t('pmuClockCycle') }}</div>
                    </div>

                    <div class="pmu-legend-divider"></div>

                    <div class="pmu-legend-section">
                        <div class="pmu-legend-label title">{{ $t('pmuPositiveGap') }}</div>
                        <div class="pmu-legend-label">{{ $t('pmuTotalCost') }}</div>
                        <div class="pmu-legend-line half">
                            <span class="pmu-legend-line-start">|</span>
                            <span class="pmu-legend-line-dash"></span>
                            <span class="pmu-legend-line-end">|</span>
                        </div>
                        <div class="pmu-legend-task-bar pmu-legend-task-bar-positive">
                            <div class="pmu-legend-task-bar-fill" style="width: 50%"></div>
                        </div>
                        <div class="pmu-legend-line clock">
                            <span class="pmu-legend-line-start">|</span>
                            <span class="pmu-legend-line-dash"></span>
                            <span class="pmu-legend-line-end">|</span>
                        </div>
                        <div class="pmu-legend-label">{{ $t('pmuClockCycle') }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="pmu-table-header">
        <span class="pmu-header-task-id">{{ $t('pmuTaskId') }}</span>
        <div class="pmu-sort-header" @click="toggleSort">
            <span class="pmu-sort-label">{{ $t('pmuCycleGap') }}</span>
            <span
              class="pmu-sort-icon"
              :class="{ 'pmu-sort-asc': sortDirection === 'asc', 'pmu-sort-desc': sortDirection === 'desc'}"
            >
                <d-icon name="sequence-new" size="16px" ></d-icon>
            </span>
        </div>
    </div>

    <div class="pmu-full-data-list">
        <div 
          v-for="task in sortedTasks"
          :key="task.id"
          class = "pmu-full-data-row pmu-insight-clickable"
          @click="handleRowClick(task)"
        >
          <div
            class="pmu-task-bar"
            :class="{ 'pmu-task-bar-positive': filterType === 'positive'}"
            :style="filterType === 'positive' ? { background: getEventColor(task), '--hover-fill-color': getEventLightColor(task), '--event-font-highlight': eventFontHighLight } : { '--hover-fill-color': getEventLightColor(task), '--event-font-highlight': eventFontHighLight }"
          >
            <div
              class="pmu-task-bar-fill"
              :class="{ 'pmu-task-bar-fill-positive': filterType === 'positive'}"
              :style="{
                width: getBarWidth(task),
                '--fill-color': getEventColor(task)
              }"
            ></div>
            <span class="pmu-task-bar-id">{{ task.taskName }}</span>
          </div>

          <span class="pmu-gap-text" :style="{ marginLeft: isWideScreen ? '80px' : '24px' }">{{ task.gapText}}</span>

          <span class="pmu-gap-ratio" :style="{ marginLeft: isWideScreen ? '80px' : '24px' }">{{ task.gapRatio}}</span>

          <div class="pmu-row-divider"></div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { COLOR_CFG } from '../swimGraphUtils';

const props = defineProps ({
  tasks: {
      type: Array,
      default: () => []
  },
  containerWidth: {
      type: Number,
      default: 480
  }
});

const emit = defineEmits(['back']);

const { t: $t } = useI18n();
const { isPathLockStatus, isDarkTheme, isWideScreen } = inject('swimGraphState');
const { clickTask } = inject('swimGraphPmuBarMethod', { clickTask: () => {} });

const eventFontHighLight = computed(() => {
    return isDarkTheme.value ? COLOR_CFG.dark.eventFontHighLight : COLOR_CFG.light.eventFontHighLight;
});

const sortDirection = ref('desc');

const filterType = ref('negative');

const parseGapRatio = (gapRatioStr) => {
    if (!gapRatioStr || typeof gapRatioStr !== 'string') {
        return 0;
    }
    const num = parseFloat(gapRatioStr.replace('%', ''));
    return isNaN(num) ? 0 : num / 100;
};

const getGapType = (gapRatioStr) => {
    const value = parseGapRatio(gapRatioStr);
    if (value < 0) {
        return 'negative';
    }
    if (value > 0) {
        return 'positive';
    }
    return 'zero';
};

const sortedTasks = computed(() => {
    let tasks = [...props.tasks];

    if (filterType.value !== 'all') {
        tasks = tasks.filter(task => getGapType(task.gapRatio) === filterType.value);
    }

    return tasks.sort((a, b) => {
        const absA = Math.abs(parseGapRatio(a.gapRatio));
        const absB = Math.abs(parseGapRatio(b.gapRatio));
        return sortDirection.value === 'desc' ? absB - absA : absA - absB;
    });
});

const getEventColor = (task) => {
    if (isDarkTheme.value) {
        if (task.event?.color?.dark?.base) {
            return task.event.color.dark.base;
        }
    } else {
        if (task.event?.color?.light?.base) {
            return task.event.color.light.base;
        }
    }
    return 'rgba(72, 142, 32, 1)';
};

const getEventLightColor = (task) => {
    if (isDarkTheme.value) {
        if (task.event?.color?.dark?.light) {
            return task.event.color.dark.light;
        }
    } else {
        if (task.event?.color?.light?.light) {
            return task.event.color.light.light;
        }
    }
    return 'rgba(72, 142, 32, 1)';
};

const getBarWidth = (task) => {
    const absGapRatio = Math.abs(parseGapRatio(task.gapRatio));
    const widthRatio = Math.max(0.05, 1 - absGapRatio);
    return `${widthRatio * 100}%`;
};

const toggleSort = () => {
    sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc';
};

const handleBack = () => {
    emit('back');
};

const handleRowClick = async (task) => {
    if (isPathLockStatus.value || !task.event) {
        return;
    }
    await clickTask(task.event, true);
};
</script>

<style lang="scss" scoped>
.pmu-full-data-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.pmu-full-data-header {
    display: flex;
    align-items: center;
    padding: 8px 0;
}

.pmu-back-button {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--devui-text);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;

    &:hover {
        color: var(--devui-brand);
    }

    &:hover :deep(d-icon) {
        color: var(--devui-brand);
    }
}

.pmu-filter-toggle {
    display: flex;
    margin-bottom: 8px;
}

.pmu-filter-button {
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background: var(--devui-category-search-bg);
    color: var(--devui-secondary-text);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }

    &.active {
        background:rgba(255, 255, 255, 0.1);
        color: var(--devui-text);
    }
}

.pmu-table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    padding: 0 4px;
    background: var(--devui-category-search-bg);
    border-radius: 6px 6px 0 0;
}

.pmu-header-task-id{
    color: var(--devui-text);
    font-size: 13px;
    font-weight: 500;
    padding-left: 6px;
}

.pmu-sort-header {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--devui-text);
    font-size: 14px;
    line-height: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    margin-right: 6px;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }
}

.pmu-sort-label {
    line-height: 1;
}

.pmu-sort-icon {
    display: inline-flex;
    align-items: center;
    color: var(--devui-brand);
    line-height: 1;

    &.pmu-sort-asc {
        color: var(--devui-brand);
    }

    &.pmu-sort-desc {
        color: var(--devui-brand);
    }
}

.pmu-full-data-list {
    display: flex;
    flex-direction: column;
}

.pmu-full-data-row {
    display: flex;
    align-items: center;
    height: 28px;
    padding: 0 4px;
    position: relative;
    box-sizing: border-box;
    cursor: pointer;
}

.pmu-task-bar {
    position: relative;
    width: 175px;
    height: 18px;
    background: repeating-linear-gradient(
        135deg,
        var(--shadow-color-1) 0px,
        var(--shadow-color-1) 2px,
        var(--shadow-color-2) 2px,
        var(--shadow-color-2) 4px
    );
    border: 0.5px dashed var(--border-color);
    border-radius: 2px;
    backdrop-filter: blur(10px);
    overflow: hidden;
    flex-shrink: 0;
}

.pmu-task-bar:hover .pmu-task-bar-fill {
    background: var(--hover-fill-color, var(--fill-color, rgba(72, 142, 32, 1)));
}

.pmu-task-bar:hover .pmu-task-bar-id {
    color: var(--event-font-highlight);
}

.pmu-task-bar-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
    background: var(--fill-color, rgba(72, 142, 32, 1));

    &::before{
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        border-radius: 2px;
        background: repeating-linear-gradient(
            135deg,
            var(--shadow-color-1) 0px,
            var(--shadow-color-1) 2px,
            var(--shadow-color-2) 2px,
            var(--shadow-color-2) 4px
        );
        pointer-events: none;
    }
}

.pmu-task-bar-positive {
    border: none !important;
    backdrop-filter: none;
    background-image: none !important;
}

.pmu-task-bar-positive:hover {
    background: var(--hover-fill-color, var(--fill-color, rgba(72, 142, 32, 1))) !important;
}

.pmu-task-bar-positive:hover .pmu-task-bar-id {
    color: var(--event-font-highlight);
}

.pmu-task-bar-fill-positive {
    border: 0.5px dashed var(--border-color);
    background: var(--fill-color, rgba(72, 142, 32, 1));
}

.pmu-task-bar-id {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--devui-text);
    font-size: 12px;
    font-weight: 500;
    z-index: 1;
}

.pmu-gap-text{
    color: var(--devui-text);
    font-size: 13px;
    min-width: 45px;
    flex-shrink: 0;
}

.pmu-gap-ratio{
    color: var(--devui-text);
    font-size: 13px;
    min-width: 45px;
    flex-shrink: 0;
}

.pmu-row-divider {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: var(--devui-category-search-bg);
}

.pmu-legend-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    margin-left: auto;

    &:hover .pmu-legend-popup {
        display: block;
    }
}

.pmu-legend-text {
    color: var(--devui-text);
    font-size: 13px;
}

.pmu-legend-icon {
    color: var(--devui-text);
    opacity: 0.6;

    &:hover {
        opacity: 1;
    }
}

.pmu-legend-popup {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    width: 200px;
    height: 276px;
    background: var(--devui-area);
    border: 1px solid var(--devui-category-search-bg);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    padding: 8px;
    box-sizing: border-box;
}

.pmu-legend-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.pmu-legend-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.pmu-legend-label {
    color: var(--devui-text);
    font-size: 12px;
    line-height: 1.4;
}

.pmu-legend-divider {
    width: 100%;
    height: 0;
    border-top: 1px dashed var(--devui-secondary-text);
    margin: 12px 0;
}

.pmu-legend-line {
    display: flex;
    align-items: center;
    width: 175px;
    height: 6px;
    line-height: 10px;
    margin-top: 2px;
    margin-bottom: 2px;
}

.pmu-legend-line-start,
.pmu-legend-line-end {
    color: var(--devui-secondary-text);
    font-size: 8px;
    font-weight: bold;
}

.pmu-legend-line-dash {
    flex: 1;
    height: 100%;
    position: relative;
    
    &::after{
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 1px;
        background: var(--devui-secondary-text);
    }
}

.pmu-legend-line.clock .pmu-legend-line-start,
.pmu-legend-line.clock .pmu-legend-line-end {
    color: rgba(63, 100, 174, 1);
}

.pmu-legend-line.clock .pmu-legend-line-dash::after {
    background: rgba(63, 100, 174, 1);
}

.pmu-legend-task-bar{
    position: relative;
    width: 175px;
    height: 16px;
    background: repeating-linear-gradient(
        135deg,
        var(--shadow-color-1) 0px,
        var(--shadow-color-1) 2px,
        var(--shadow-color-2) 2px,
        var(--shadow-color-2) 4px
    );
    border: 0.5px dashed var(--border-color);
    border-radius: 2px;
    backdrop-filter: blur(10px);
    overflow: hidden;
    flex-shrink: 0;  
}

.pmu-legend-task-bar-fill{
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 2px;
    background: rgba(63, 100, 174, 1);
    border: 0.5px dashed var(--border-color);

    &::before{
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        border-radius: 2px;
        background: repeating-linear-gradient(
            135deg,
            var(--shadow-color-1) 0px,
            var(--shadow-color-1) 2px,
            var(--shadow-color-2) 2px,
            var(--shadow-color-2) 4px
        );
        pointer-events: none;
    }
}

.pmu-legend-task-bar-positive {
    border: none !important;
    backdrop-filter: none;
    background-image: none !important;
    background: rgba(63, 100, 174, 1);
}

.half {
    width: 87.5px;
}

.clock {
    color:rgba(63, 100, 174, 1);
}

.title {
    font-size: 13px;
    font-weight: 700;
}

</style>