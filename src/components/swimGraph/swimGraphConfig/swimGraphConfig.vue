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
  <div v-if="isCfgEditing" id="cfgEdit" class="cfgEdit"  :class="{ 'fixed-height': isThreeColumn }" :style="{ top: isThreeColumn ? '0px': '60px'}">
    <div class="cfg-content">
        <div class="cfg-head">
            <div class="cfg-title"> {{ $t('swimRenderCfg') }} </div>
            <div class="cfg-close-button" :class="{ 'three-column': isThreeColumn }">
                <d-button icon="icon-close" style="border:none; background-color: transparent" @click="togglecfgEditModel"></d-button>
            </div>
        </div>
        
        <div class="cfg-section">
            <div class="cfg-line"></div>
            <div class="cfg-section-title">{{ $t('globalConfig') }}</div>
            <div class="task-connection-level">
                <div class="cfg-head">
                    <div class="task-connection-level-t mb6">{{ $t('taskConnectionLevel') }}</div>
                    <d-tooltip :content="$t('connectionLevel')">
                        <d-icon name="icon-helping" class="help-font"></d-icon>
                    </d-tooltip>
                </div>
                <d-input-number class="connection-level-input" :class="{'locked-style': isPathLockStatus}" v-model="connectionLevel" :disabled=isPathLockStatus :step="1" :precision="0" :min="-1" @change="onInputChange"></d-input-number>
            </div>
            <div class="performance-panel-config">
                <div class="cfg-head">
                    <div class="performance-panel-config-t mb6">{{ $t('showPerformancePanel') }}</div>
                    <d-tooltip :content="$t('showPerformancePanelTip')">
                        <d-icon name="icon-helping" class="help-font"></d-icon>
                    </d-tooltip>
                </div>
                <d-switch v-model="showPerformancePanel" @change="onPerformanceChange"></d-switch>
            </div>
            <div class="mix-model-config">
                <div class="cfg-head">
                    <div class="mix-model-config-t mb6">{{ $t('mixMode') }}</div>
                </div>
                <d-switch v-model="showIsMixMode" :disabled=isThreeColumn @change="onIsMixModelchange"></d-switch>
            </div>
        </div>

        <div class="cfg-section" v-if="showAicpuConfig">
            <div class="cfg-line"></div>
            <div class="cfg-section-title">{{ $t('aicpuConfig') }}</div>
            <div class="cfg-Shading-mode">
                <div class="cfg-Shading-mode-t">{{ $t('shadingMode') }} </div>
                <d-select v-model="aicpuModeOption" :options="aicpuModeOptions" size="sm" @update:modelValue="OnAicpuModeChange"></d-select>
            </div>
        </div>

        <div class="cfg-section" v-if="showPerfConfig">
            <div class="cfg-line"></div>
            <div class="cfg-section-title">{{ $t('pypto3Config') }}</div>
            <div class="cfg-Shading-mode">
                <div class="cfg-Shading-mode-t">{{ $t('shadingMode') }} </div>
                <d-select v-model="perfModeOption" :options="perfModeOptions" size="sm" @update:modelValue="OnPerfModeChange"></d-select>
            </div>
        </div>

        <div class="cfg-section" v-if="showKernelConfig">
            <div class="cfg-line"></div>
            <div class="cfg-section-title">{{ isDeviceView ? $t('deviceConfig') : $t('kernelConfig') }}</div>
            <div class="cfg-Shading-mode">
                <div class="cfg-Shading-mode-t">{{ $t('shadingMode') }} </div>
                <d-select v-model="kernelModeOption" :options="kernelModeOptions" :disabled="isMsProf" size="sm" @update:modelValue="OnKernelModeChange"></d-select>
            </div>
            <div class="cfg-hash-mode" v-if="kernelModeOption === 'isomorphicSubGraph'">
                <div class="cfg-Shading-mode-t">{{ $t('cubeSubGraphHashOrderType') }} </div>
                <d-select v-model="HashOrderOption" :options="HashOrderOptions" size="sm" @update:modelValue="OnHashOrderOptionsModeChange"></d-select>
            </div>
            <div class="task-content">
                <div class="task-content-t">{{ $t('eventTask') }} </div>
                <d-select :class="[kernelTextOption.length === 1 && 'singleOption']" :menu-class="kernelTextOption.length === 1 ? 'singleOptionMenu' : ''" v-model="kernelTextOption" :options="kernelTextOptions" :multiple="true" size="sm" @update:modelValue="OnKernelTextChange" :multiple-limit="2" option-disabled-key="disabled"></d-select>
            </div>
        </div>
    </div>
  </div>
</template>
<script setup>
import { ref, inject, watch, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { clone } from 'lodash-es';
import { getEventColorByMode } from '../swimGraphProcesses/processInfo';
import { useViewServer } from '../../../core/use-view-server';
import { COLOR_CFG, DEP_MODE, threadCache } from '../swimGraphUtils';
import { swimDataManager } from '../swimData';
const { isDarkTheme } = inject('root');

let colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
const { server } = useViewServer();
const { t: $t } = useI18n();
const {
    isCfgEditing,
    childContextMap,
    timelineState,
    isThreeColumn,
    isPathLockStatus,
    isAicpu,
    isE2ESwim,
    isDeviceView,
    isPerfSwim,
    isMsProf,
    isMixMode,
    selectedEvent,
    highlightedPaths,
    mixRelatedPaths,
    searchedEvent,
    isMaxSchedule,
    isMeasureModel,
    mulDetailsExpanded,
    measureDetailsExpanded,
    detailsPanelExpanded,
    aicpuControlDetailsExpanded,
    aicpuScheduleDetailsExpanded,
    aicpuCoreDetailsExpanded,
    hashOrderRending
} = inject('swimGraphState');

const {
  transform,
  postMessage,
  getDisplayName,
  resetState,
  resetMaxScheduleState,
  selectEvent,
  resetsearchState,
  clearHeadState,
  hidePathLockedHighlight
} = inject('swimGraphMethods');

const { pinnedThreadsList, recalculateOffsetY, clearAllPinned } = inject('swimGraphPinnedState');

const {
  userConfig,
} = inject('swimGraphCfg');

const connectionLevel = computed({
  get: () => userConfig.get('connectionLevel') ?? -1,
  set: (value) => {
    userConfig.set('connectionLevel', value);
  }
});

const showPerformancePanel = computed({
  get: () => userConfig.get('showPerformancePanel') ?? true,
  set: (value) => {
    userConfig.set('showPerformancePanel', value);
  }
});

const showIsMixMode = computed({
  get: () => {
    if (isThreeColumn) {
        return false;
    } else {
        return userConfig.get('showIsMixMode') ?? false;
    }
  },
  set: (value) => {
    userConfig.set('showIsMixMode', value);
  }
});

const showAicpuConfig = computed(() => {
  return isAicpu.value || isE2ESwim.value;
});

const showPerfConfig = computed(() => {
  return isPerfSwim.value;
});

const showKernelConfig = computed(() => {
  return !isAicpu.value && !isPerfSwim.value;
});

const aicpuModeOptions = computed(() => {
  return [{name: $t('name'), value: 'name'}];
});

const perfModeOptions = computed(() => {
  return [{name: $t('name'), value: 'perfName'}];
});

const aicpuModeOption = ref('name');

const perfModeOption = ref('perfName');

const kernelModeOptions = computed(() => {
  if (isThreeColumn) {
    return [
        {name: $t('label'), value: 'label'},
    ];
  }
  if (isMsProf.value) {
    return [
        {name: $t('name'), value: 'name'},
    ];
  }
  return [
    {name: $t('subGraph'), value: 'subGraph'},
    {name: $t('stichedFunc'), value: 'stichedFunc'},
    {name: $t('label'), value: 'label'},
    {name: $t('mixSubGraph'), value: 'mixSubGraph'},
    {name: $t('isomorphicSubGraph'), value: 'isomorphicSubGraph'},
  ];
});

const kernelModeOption = ref(isThreeColumn ? 'label' : (isMsProf.value ? 'name' : 'subGraph'));

const HashOrderOptions = computed(() => {
  return [
    {name: 'CubeMergeHashOrder', value: 'cubeMergeHashOrder'},
    {name: 'L1ReuseHashOrder', value: 'L1ReuseHashOrder'},
  ];
});

const HashOrderOption = ref('cubeMergeHashOrder');

const kernelTextOptions = computed(() => [
  {name: $t('taskName'), value: 'taskName', disabled: false},
  {name: $t('taskLabel'), value: 'taskLabel', disabled: false},
  {name: $t('isomorphicSubGraphGroup'), value: 'isomorphicSubGraphGroup', disabled: false},
]);

const kernelTextOption = ref(['taskName', 'taskLabel']);

const togglecfgEditModel = () => {
    if (isCfgEditing.value) {
        isCfgEditing.value = !isCfgEditing.value;
    }
};

function changeUserCfgConnection(connectionLevelInfo) {
    server.changeUserCfgConnection({paramObj: {level: connectionLevelInfo}});
};

const configGetEventColor = (colorEvent, mode, hashOrderType='') => {
    const color = getEventColorByMode(colorEvent, mode, '', hashOrderType);
    colorEvent.color = color;
    const eventColor = isDarkTheme.value ? colorEvent.color.dark : colorEvent.color.light;
    let fillColor = eventColor ? eventColor.base : '';
    let fontColor = colorCfg.eventFont;
    let strokeColor = '';

    const colors = { fillColor, fontColor, strokeColor };
    return colors;
};

const updateAicpuEvents = (mode) => {
    for (const process of swimDataManager.getAllProcesses().values()) {
        if (process.type !== 'aicpu' || !process.isRendered) {
            continue;
        }
        for (const thread of process.threads.values()) {
            for (const eventId of thread.eventIds) {
                const event = swimDataManager.getEventById(eventId);
                if (!event.isCounter && event.endTime >= timelineState.startTime && event.startTime <= timelineState.endTime) {
                    const color = getEventColorByMode(event, mode);
                    event.color = color;
                    const { fillColor, fontColor, strokeColor } = configGetEventColor(event, mode);
                    event.drawData.rectColor = fillColor;
                    event.drawData.strokeColor = strokeColor;
                    event.drawData.fontColor = fontColor;
                }
            }
        }
    }
};

const OnAicpuModeChange = () => {
    updateAicpuEvents(aicpuModeOption.value);
    transform();
    saveAicpuRendingMode(aicpuModeOption.value);
};

function saveAicpuRendingMode(colorRenderMode) {
    server.saveRendingMode({paramObj: JSON.stringify({ aicpuColorRending: colorRenderMode })});
};

const updatePerfEvents = (mode) => {
    for (const process of swimDataManager.getAllProcesses().values()) {
        if (!process.isRendered) {
            continue;
        }
        for (const thread of process.threads.values()) {
            for (const eventId of thread.eventIds) {
                const event = swimDataManager.getEventById(eventId);
                if (!event.isCounter && event.endTime >= timelineState.startTime && event.startTime <= timelineState.endTime) {
                    const color = getEventColorByMode(event, mode);
                    event.color = color;
                    const { fillColor, fontColor, strokeColor } = configGetEventColor(event, mode);
                    event.drawData.rectColor = fillColor;
                    event.drawData.strokeColor = strokeColor;
                    event.drawData.fontColor = fontColor;
                }
            }
        }
    }
};

const OnPerfModeChange = () => {
    updatePerfEvents(perfModeOption.value);
    transform();
    savePerfRendingMode(perfModeOption.value); 
};

function savePerfRendingMode(colorRenderMode) {
    server.saveRendingMode({paramObj: JSON.stringify({ perfColorReding: colorRenderMode })});
};

const updateKernelEvents = (mode, hashOrderOption) => {
    const updateEventColors = (event) => {
        if (event.originalThreadName) {
            return;
        }
        if (event.isCounter) {
            return;
        }
        const color = getEventColorByMode(event, mode, 'kernel', hashOrderOption);
        event.color = color;
        if (event.drawData) {
            const { fillColor, fontColor, strokeColor } = configGetEventColor(event, mode, hashOrderOption);
            event.drawData.rectColor = fillColor;
            event.drawData.strokeColor = strokeColor;
            event.drawData.fontColor = fontColor;
        }
    };

    const updateSubEventColors = (parentEvent) => {
        const subEvents = swimDataManager.getSubEvents(parentEvent.id);
        for (const subEvent of subEvents) {
            if (subEvent.drawData) {
                const { fillColor, fontColor, strokeColor } = configGetEventColor(parentEvent, mode, hashOrderOption);
                subEvent.drawData.rectColor = fillColor;
                subEvent.drawData.fontColor = fontColor;
            }
        }
    };

    pinnedThreadsList.value.filter(pinThread => pinThread.process.type === 'kernel')
        .forEach((pinThread) => {
            pinThread.thread.eventIds.forEach((eventId) => {
                const event = swimDataManager.getEventById(eventId);
                if (event) {
                    updateEventColors(event);
                }
            });
        });
    for (const process of swimDataManager.getAllProcesses().values()) {
        if (process.type === 'aicpu' || !process.isRendered) {
            continue;
        }
        process.threads.forEach((thread) => {
            thread.eventIds.forEach((eventId) => {
                const event = swimDataManager.getEventById(eventId);
                if (event) {
                    updateEventColors(event);
                }
            });
        });
    }

    if (swimDataManager.hasMixConfig()) {
        for (const config of swimDataManager.mixConfig) {
            const parentEvent = swimDataManager.getEventById(config.parentEventId);
            if (parentEvent) {
                updateEventColors(parentEvent);
                updateSubEventColors(parentEvent);
            }
        }
    }
};

const OnKernelModeChange = (mode) => {
    if (!isMsProf.value) {
        userConfig.value.kernelColorRending = mode;
        saveKernelRendingMode(kernelModeOption.value, kernelTextOption.value, HashOrderOption.value);
    }
    updateKernelEvents(kernelModeOption.value, HashOrderOption.value);
    transform();
};

const OnHashOrderOptionsModeChange = (mode) => {
    userConfig.value.hashOrderRending = mode;
    hashOrderRending.value = mode;
    updateKernelEvents(kernelModeOption.value, HashOrderOption.value);
    transform();
    saveKernelRendingMode(kernelModeOption.value, kernelTextOption.value, HashOrderOption.value);
};

const OnKernelTextChange = (value) => {
    userConfig.value.kernelTextRending = value;
    transform();
    saveKernelRendingMode(kernelModeOption.value, kernelTextOption.value);
};

function saveKernelRendingMode(colorRenderMode, textRenderMode, hashOrderMode) {
    server.saveRendingMode({paramObj: JSON.stringify({ kernelColorRending: colorRenderMode, kernelTextRending: textRenderMode, hashOrderRending: hashOrderMode})});
};

const onInputChange = (newValue) => {
    userConfig.value.connectionLevel = newValue;
    const selectedEventTemp = clone(selectedEvent);
    highlightedPaths.clear();
    const processKey = String(selectedEventTemp.value.pid);
    selectEvent(null, processKey);
    selectEvent(selectedEventTemp.value, processKey);
    changeUserCfgConnection(newValue);
};

const onPerformanceChange = (newValue) => {
    if (userConfig.value) {
        userConfig.value.showPerformancePanel = newValue;
    }
    userConfig.set('showPerformancePanel', newValue);
    server.changeUserCfgPerformance({paramObj: {show: newValue}});
};

const onIsMixModelchange = async (newValue) => {
    if (userConfig.value) {
        userConfig.value.showIsMixMode = newValue;
    }
    userConfig.set('showIsMixMode', newValue);
    
    // Clear thread position cache to prevent stale Y coordinates from non-mix mode
    threadCache.clear();
    
    // Reset all relevant states when switching mix mode
    selectedEvent.value = null;
    highlightedPaths.clear();
    mixRelatedPaths.clear();
    searchedEvent.value = null;
    isPathLockStatus.value = false;
    hidePathLockedHighlight();
    isMeasureModel.value = false;
    
    // Reset search state and clear search box
    await clearHeadState();
    resetsearchState(false);
    
    if (isMaxSchedule.value) {
        resetMaxScheduleState();
    }
    
    mulDetailsExpanded.value = false;
    measureDetailsExpanded.value = false;
    detailsPanelExpanded.value = false;
    aicpuControlDetailsExpanded.value = false;
    aicpuScheduleDetailsExpanded.value = false;
    aicpuCoreDetailsExpanded.value = false;
    
    if (pinnedThreadsList.value && pinnedThreadsList.value.length > 0) {
        if (newValue && swimDataManager.hasMixConfig()) {
            clearAllPinned();
        } else {
            recalculateOffsetY(newValue);
        }
    }
    
    // Reset view state (scale and offset)
    resetState();

    isMixMode.value = newValue;
    server.changeUserCfgIsMixMode({paramObj: {show: newValue}});
};

defineExpose({
  connectionLevel,
  showPerformancePanel,
  showIsMixMode
});

watch(userConfig, () => {
    aicpuModeOption.value = userConfig.value.aicpuColorRending;
    perfModeOption.value = userConfig.value.perfColorReding;
    if (isMsProf.value) {
        kernelModeOption.value = 'name';
    } else {
        kernelModeOption.value = userConfig.value.kernelColorRending;
    }
    kernelTextOption.value = userConfig.value.kernelTextRending;
    HashOrderOption.value = userConfig.value.hashOrderRending;
});
</script>

<style lang="scss">
@import url("../css/swimGraph/Config/config.css");
.cfg-Shading-mode {
    .devui-select:not(.devui-select--disabled):not(.devui-select--underlined) .devui-select__selection.devui-select__selection--glow-style:hover {
        border-color: var(--devui-select-hover-border-color);
    }
    .devui-select--open .devui-select__selection.devui-select__selection--glow-style {
        border-color: var(--devui-select-active-border-color) !important;
    }

    .devui-select__selection {
        height: 28px;
        background-color: var(--devui-input-bg);
        border-color: transparent;
        input {
            display:flex;
            align-items: center;
        }
    }
    .devui-select--disabled .devui-select__selection {
        background-color: var(--devui-input-disabled-bg);
        border-color: transparent;
    }
}

.cfg-hash-mode {
    .devui-select:not(.devui-select--disabled):not(.devui-select--underlined) .devui-select__selection.devui-select__selection--glow-style:hover {
        border-color: var(--devui-select-hover-border-color);
    }
    .devui-select--open .devui-select__selection.devui-select__selection--glow-style {
        border-color: var(--devui-select-active-border-color) !important;
    }

    .devui-select__selection {
        height: 28px;
        background-color: var(--devui-input-bg);
        border-color: transparent;
        input {
            display:flex;
            align-items: center;
        }
    }
    .devui-select--disabled .devui-select__selection {
        background-color: var(--devui-input-disabled-bg);
        border-color: transparent;
    }
}

.task-content {
    .devui-select:not(.devui-select--disabled):not(.devui-select--underlined) .devui-select__selection.devui-select__selection--glow-style:hover {
        border-color: var(--devui-select-hover-border-color);
    }
    .devui-select--open .devui-select__selection.devui-select__selection--glow-style {
        border-color: var(--devui-select-active-border-color) !important;
    }
    .devui-select__selection {
        height: 28px;
        background-color: var(--devui-input-bg) !important;
        border-color: transparent;
        overflow-x: hidden;
        overflow-y: auto;
        .devui-select__multiple {
            height: 20px;
        }
    }
}

.devui-select__dropdown {
    .devui-checkbox.disabled label{
        color: var(--devui-text);
    }
    .devui-checkbox.disabled.unchecked .devui-checkbox__material{
        border-color: var(--devui-text);
    }
}

.task-connection-level {
    .devui-input-number.devui-input-number--glow-style:hover {
        border-color: var(--devui-select-hover-border-color);
    }
    .devui-input-number.devui-input-number--glow-style:focus-within .devui-input-number__input-box:not(.disabled) {
        border-color: var(--devui-select-active-border-color);
    }
    .devui-input-number {
        background-color: var(--devui-input-bg) !important;
        height: 28px;
        border-color: transparent;
        input {
            background-color: var(--devui-input-bg) !important;
            border-color: transparent;
        }
    }
    .devui-input-number.locked-style {
        background-color: var(--devui-input-bg) !important;
        height: 28px;
        border-color: transparent;
        input {
            background-color: transparent !important;
            border-color: transparent;
        }
    }
}
.connection-level-input .devui-input-number__control-buttons .control-button.control-dec svg {
    bottom: 0;
}
.connection-level-input .devui-input-number__control-buttons .control-button.control-inc svg {
    top: 0;
}
.singleOption a {
    pointer-events: none;
}

.singleOptionMenu {
    .active {
        pointer-events: none;
    }
}

.devui-switch--checked:hover {
    background: var(--devui-brand) !important;
    border-color: var(--devui-brand) !important;
}
</style>
<style scoped lang="scss">
:deep() {
    .connection-level-input.locked-style {
        .disabled {
            opacity: 0.8;
            color: rgba(153, 153, 153, 1);
        }
    }
}
</style>