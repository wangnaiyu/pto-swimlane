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
  <div class="pmu-task-diagnosis" ref="diagnosisRef" :class="{ 'ultra-compact-mode': isUltraCompactMode }">
    <template v-if="diagnosis.hasData">
      <div class="pmu-summary-grid" :class="{ 'compact-mode': isCompactMode, 'ultra-compact-mode': isUltraCompactMode }">
        <section class="pmu-summary-card pmu-group-card" :style="pmuGroupCardStyle">
          <span class="pmu-summary-label">{{ $t('pmuCollectionGroup') }}</span>
          <strong>{{ pmuGroupLabel }}</strong>
        </section>
        <div class="pmu-summary-combined">
          <section v-if="isUltraCompactMode" class="pmu-summary-card pmu-summary-ultra-merged">
            <div class="pmu-ultra-merged-column">
              <div class="pmu-ultra-merged-item">
                <span class="pmu-summary-label">{{ $t('pmuTotalCost') }}</span>
                <strong>{{ formatInteger(diagnosis.sampleCycles) }}</strong>
              </div>
              <div class="pmu-ultra-merged-item">
                <span class="pmu-summary-label">{{ $t('pmuClockCycle') }}</span>
                <strong>{{ formatInteger(diagnosis.computedCycles) }}</strong>
              </div>
              <div class="pmu-ultra-merged-item">
                <span class="pmu-summary-label">{{ $t('pmuCycleGap') }}</span>
                <strong :class="diagnosis.gapClass">
                  {{ formatSignedInteger(diagnosis.cycleGap) }} · {{ formatSignedPercent(diagnosis.cycleGapRatio) }}
                </strong>
              </div>
            </div>
          </section>
          <template v-else-if="isCompactMode">
            <section class="pmu-summary-card pmu-summary-merged">
              <div class="pmu-merged-column">
                <div class="pmu-merged-item">
                  <span class="pmu-summary-label">{{ $t('pmuTotalCost') }}</span>
                  <strong>{{ formatInteger(diagnosis.sampleCycles) }}</strong>
                </div>
                <div class="pmu-merged-item">
                  <span class="pmu-summary-label">{{ $t('pmuClockCycle') }}</span>
                  <strong>{{ formatInteger(diagnosis.computedCycles) }}</strong>
                </div>
              </div>
            </section>
            <div class="pmu-summary-divider"></div>
            <section class="pmu-summary-card">
              <span class="pmu-summary-label">{{ $t('pmuCycleGap') }}</span>
              <strong :class="diagnosis.gapClass">
                {{ formatSignedInteger(diagnosis.cycleGap) }} · {{ formatSignedPercent(diagnosis.cycleGapRatio) }}
              </strong>
            </section>
          </template>
          <template v-else>
            <section class="pmu-summary-card">
              <span class="pmu-summary-label">{{ $t('pmuTotalCost') }}</span>
              <strong>{{ formatInteger(diagnosis.sampleCycles) }}</strong>
            </section>
            <div class="pmu-summary-divider"></div>
            <section class="pmu-summary-card">
              <span class="pmu-summary-label">{{ $t('pmuClockCycle') }}</span>
              <strong>{{ formatInteger(diagnosis.computedCycles) }}</strong>
            </section>
            <div class="pmu-summary-divider"></div>
            <section class="pmu-summary-card">
              <span class="pmu-summary-label">{{ $t('pmuCycleGap') }}</span>
              <strong :class="diagnosis.gapClass">
                {{ formatSignedInteger(diagnosis.cycleGap) }} · {{ formatSignedPercent(diagnosis.cycleGapRatio) }}
              </strong>
            </section>
          </template>
        </div>
      </div>

      <div class="pmu-stack-bar" :aria-label="$t('pmuCounterBreakdown')" :class="{ 'is-dark': isDarkTheme }">
        <div
          v-for="segment in stackSegments"
          :key="segment.key"
          class="pmu-stack-segment"
          :style="{ width: segment.width + '%', background: segment.color }"
          :title="`${segment.displayName}: ${formatInteger(segment.value)} · ${formatPercent(segment.ratio)}`"
        ></div>
        <div
          v-if="unexplainedSegmentWidth > 0"
          class="pmu-stack-segment pmu-stack-gap"
          :style="{ width: unexplainedSegmentWidth + '%' }"
          :title="$t('pmuUnexplainedCycles')"
        ></div>
      </div>

      <div class="pmu-counter-list">
        <div
          v-for="counter in diagnosis.counters"
          :key="counter.key"
          class="pmu-counter-row"
          :class="{ disabled: !counter.available }"
        >
          <span class="pmu-counter-swatch" :style="{ background: counter.color }"></span>
          <span class="pmu-counter-name" :class="{ 'pmu-counter-zero': counter.value === 0 }">{{ counter.displayName }}</span>
          <span class="pmu-counter-value" :class="{ 'pmu-counter-zero': counter.value === 0 }">{{ counter.available ? formatInteger(counter.value) : '-' }}</span>
          <span class="pmu-counter-percent" :class="{ 'pmu-counter-zero': counter.value === 0 }">{{ counter.available ? formatPercent(counter.ratio) : '-' }}</span>
        </div>
      </div>

      <div class="pmu-cache-metrics">
        <div class="pmu-cache-row">
          <span>icache_req</span>
          <strong>{{ formatOptionalInteger(diagnosis.cache.icacheReq) }}</strong>
        </div>
        <div class="pmu-cache-row">
          <span>icache_miss</span>
          <strong>{{ formatOptionalInteger(diagnosis.cache.icacheMiss) }}</strong>
        </div>
      </div>
    </template>
    <div v-else class="pmu-diagnosis-empty">{{ $t('pmuNoData') }}</div>
  </div>
</template>

<script setup>
import { computed, inject, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  event: {
    type: Object,
    default: null
  }
});

const { t: $t } = useI18n();
const { isDarkTheme } = inject('root', { isDarkTheme: ref(true) });
const PMU_GROUP_CARD_ASSET_BASE = `${window.staticPath}/static-assets/pmu/group-card`;

const diagnosisRef = ref(null);
const containerWidth = ref(0);
const isCompactMode = computed(() => containerWidth.value < 1378 && containerWidth.value >= 1218 && containerWidth.value > 0);
const isUltraCompactMode = computed(() => containerWidth.value < 1218 && containerWidth.value > 0);

let resizeObserver = null;

onMounted(() => {
  if (diagnosisRef.value) {
    let parentContainer = diagnosisRef.value.parentElement;
    while (parentContainer && !parentContainer.classList.contains('detail-main-container')) {
      parentContainer = parentContainer.parentElement;
    }

    if (parentContainer) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth.value = entry.contentRect.width;
        }
      });
      resizeObserver.observe(parentContainer);
      containerWidth.value = parentContainer.getBoundingClientRect().width;
    } else {
      parentContainer = diagnosisRef.value.parentElement;
      while (parentContainer && !parentContainer.classList.contains('details-content')) {
        parentContainer = parentContainer.parentElement;
      }

      if (parentContainer) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            containerWidth.value = entry.contentRect.width;
          }
        });
        resizeObserver.observe(parentContainer);
        containerWidth.value = parentContainer.getBoundingClientRect().width;
      } else {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            containerWidth.value = entry.contentRect.width;
          }
        });
        resizeObserver.observe(diagnosisRef.value);
        containerWidth.value = diagnosisRef.value.getBoundingClientRect().width;
      }
    }
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const PMU_SORT_COLORS = [
  '#ff9f35',
  '#ffd83d',
  '#8bd35c',
  '#3dc493',
  '#4fc6d8',
  '#6387ee',
  '#53565d'
];

const PMU_COUNTER_META = [
  {
    key: 'mte2_busy_cycles',
    sourceKeys: ['mte2_busy_cycles', 'mte2_instr_busy'],
    displayName: 'mte2_instr_busy',
    path: 'Global Memory -> L1'
  },
  {
    key: 'cube_busy_cycles',
    sourceKeys: ['cube_busy_cycles', 'cube_instr_busy'],
    displayName: 'cube_instr_busy',
    path: 'Cube'
  },
  {
    key: 'scalar_busy_cycles',
    sourceKeys: ['scalar_busy_cycles', 'scalar_instr_busy'],
    displayName: 'scalar_instr_busy',
    path: 'Scalar'
  },
  {
    key: 'mte1_busy_cycles',
    sourceKeys: ['mte1_busy_cycles', 'mte1_instr_busy'],
    displayName: 'mte1_instr_busy',
    path: 'L1 -> L0A/L0B'
  },
  {
    key: 'mte3_busy_cycles',
    sourceKeys: ['mte3_busy_cycles', 'mte3_instr_busy'],
    displayName: 'mte3_instr_busy',
    path: 'L0C/UB -> Global Memory'
  },
  {
    key: 'pmu_fix_instr_busy',
    sourceKeys: ['pmu_fix_instr_busy'],
    displayName: 'pmu_fix_instr_busy',
    path: 'Fixed Instruction'
  },
  {
    key: 'vec_busy_cycles',
    sourceKeys: ['vec_busy_cycles', 'pmu_idc_aic_vec_busy_o'],
    displayName: 'pmu_idc_aic_vec_busy_o',
    path: 'AIV Vector'
  }
];

function toFiniteNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function readNumber(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== '') {
      return toFiniteNumber(source[key]);
    }
  }
  return 0;
}

function hasPmuField(source, counter) {
  const availableMap = source?.__available_pmu_fields;
  if (availableMap && counter.key in availableMap) {
    return availableMap[counter.key] === true;
  }
  return counter.sourceKeys.some((key) => source?.[key] !== undefined && source?.[key] !== '');
}

function getGapClass(gap) {
  if (Math.abs(gap) <= 1) {
    return 'gap-normal';
  }
  return gap < 0 ? 'gap-negative' : 'gap-positive';
}

const diagnosis = computed(() => {
  const {event} = props;
  const pmuInfo = event?.pmu_info;
  const sampleCycles = toFiniteNumber(pmuInfo?.['total cycle']);
  const shouldReturn = !event || event.isCounter || !pmuInfo || sampleCycles <= 0;

  if (shouldReturn) {
    return {
      hasData: false,
      sampleCycles: 0,
      computedCycles: 0,
      cycleGap: 0,
      cycleGapRatio: 0,
      counters: [],
      cache: {
        icacheReq: null,
        icacheMiss: null
      },
      gapClass: 'gap-normal'
    };
  }

  const counters = PMU_COUNTER_META.map((counter) => {
    const value = readNumber(pmuInfo, counter.sourceKeys);
    const available = hasPmuField(pmuInfo, counter);
    return {
      ...counter,
      value,
      available,
      ratio: 0
    };
  });
  
  const sortedCounters = [...counters].sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    if (a.value === 0 && b.value !== 0) {
      return 1;
    }
      if (a.value !== 0 && b.value === 0) {
      return -1;
    }
    return b.value - a.value;
  });

  sortedCounters.forEach((counter, index) => {
    if (counter.value === 0) {
      counter.color = '#53565d';
    } else {
      counter.color = PMU_SORT_COLORS[index] || '#53565d';
    }
  });

  const computedCycles = sortedCounters.reduce((sum, counter) => sum + (counter.available ? counter.value : 0), 0);
  sortedCounters.forEach((counter) => {
    counter.ratio = counter.available && computedCycles > 0 ? counter.value / computedCycles : 0;
  });

  const cycleGap = computedCycles - sampleCycles;
  const icacheReq = pmuInfo.icache_req !== undefined && pmuInfo.icache_req !== '' ? toFiniteNumber(pmuInfo.icache_req) : null;
  const icacheMiss = pmuInfo.icache_miss !== undefined && pmuInfo.icache_miss !== '' ? toFiniteNumber(pmuInfo.icache_miss) : null;

  return {
    hasData: true,
    sampleCycles,
    computedCycles,
    cycleGap,
    cycleGapRatio: sampleCycles > 0 ? cycleGap / sampleCycles : 0,
    counters: sortedCounters,
    cache: {
      icacheReq,
      icacheMiss
    },
    gapClass: getGapClass(cycleGap)
  };
});

const pmuGroupLabel = computed(() => {
  const deviceName = props.event?.pmu_info?.device_name || props.event?.pmu_info?.device || 'Dav_3510';
  return `${deviceName} · Group 2`;
});

const pmuGroupCardStyle = computed(() => {
  const mode = isDarkTheme.value ? 'dark' : 'light';
  return {
    '--pmu-group-card-left-bg': `url("${PMU_GROUP_CARD_ASSET_BASE}/pmu-group-card-left-${mode}.svg")`,
    '--pmu-group-card-right-bg': `url("${PMU_GROUP_CARD_ASSET_BASE}/pmu-group-card-right-${mode}.svg")`
  };
});

const stackSegments = computed(() => {
  const base = diagnosis.value.computedCycles < diagnosis.value.sampleCycles
    ? diagnosis.value.sampleCycles
    : diagnosis.value.computedCycles;
  if (base <= 0) {
    return [];
  }
  return diagnosis.value.counters
    .filter((counter) => counter.available && counter.value > 0)
    .map((counter) => ({
      ...counter,
      width: Number(((counter.value / base) * 100).toFixed(3))
    }));
});

const unexplainedSegmentWidth = computed(() => {
  const missingCycles = diagnosis.value.sampleCycles - diagnosis.value.computedCycles;
  if (missingCycles <= 0 || diagnosis.value.sampleCycles <= 0) {
    return 0;
  }
  return Number(((missingCycles / diagnosis.value.sampleCycles) * 100).toFixed(3));
});

function formatInteger(value) {
  return String(Math.round(toFiniteNumber(value)));
}

function formatSignedInteger(value) {
  const rounded = Math.round(toFiniteNumber(value));
  return rounded > 0 ? `+${formatInteger(rounded)}` : formatInteger(rounded);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }
  const percent = value * 100;
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

function formatOptionalInteger(value) {
  return value === null || value === undefined ? '-' : formatInteger(value);
}
</script>

<style scoped lang="scss">
.pmu-task-diagnosis {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 12px 0 4px;
  color: var(--devui-primary-text);
}

.pmu-summary-grid {
  display: grid;
  grid-template-columns: 156px 400px;
  gap: 8px;
  min-width: 564px;
}

.pmu-summary-grid.compact-mode {
  grid-template-columns: 156px 350px;
  min-width: 514px;

  .pmu-summary-combined {
    width: 350px;
  }

  .pmu-summary-merged {
    width: 100%;
  }

  .pmu-merged-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    height: 100%;
    width: 100%;
  }

  .pmu-merged-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;

    .pmu-summary-label {
      font-size: 11px;
      line-height: 16px;
      min-width: 70px;
    }

    strong {
      font-size: 13px;
      line-height: 22px;
    }
  }

  .pmu-summary-combined .pmu-summary-card:last-child {
    min-width: 160px;
    max-width: 160px;
    flex: 0 0 160px;
  }
}

.pmu-summary-grid.ultra-compact-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 300px;
  width: 300px;

  .pmu-group-card {
    width: 300px;
    min-width: 300px;
    max-width: 300px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    box-sizing: border-box;

    &::before,
    &::after {
      display: none !important;
    }

    .pmu-summary-label {
      white-space: nowrap;
    }

    strong {
      white-space: nowrap;
    }
  }

  .pmu-summary-combined {
    width: 300px;
    min-width: 300px;
    max-width: 300px;
    min-height: 100px;
    padding: 0 16px;
    box-sizing: border-box;
  }

  .pmu-summary-ultra-merged {
    width: 100%;
    padding: 0;
  }

  .pmu-ultra-merged-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    height: 100%;
    width: 100%;
    padding: 8px 0;
  }

  .pmu-ultra-merged-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    .pmu-summary-label {
      font-size: 12px;
      line-height: 16px;
      min-width: 70px;
    }

    strong {
      font-size: 13px;
      line-height: 18px;
    }
  }
}

.pmu-task-diagnosis:has(.compact-mode) {
  .pmu-stack-bar,
  .pmu-counter-list,
  .pmu-cache-metrics {
    min-width: 464px;
  }
}

.pmu-task-diagnosis.ultra-compact-mode {
  .pmu-stack-bar,
  .pmu-counter-list,
  .pmu-cache-metrics {
    min-width: 300px !important;
  }

  .pmu-counter-row {
    grid-template-columns: 22px minmax(100px, 1fr) 60px 50px;
    height: 24px;

    .pmu-counter-name {
      font-size: 13px;
    }

    .pmu-counter-value,
    .pmu-counter-percent {
      font-size: 13px;
    }
  }
}

.pmu-summary-combined {
  display: flex;
  align-items: stretch;
  min-height: 72px;
  border-radius: 8px;
  background: var(--devui-swim-split-line);
  overflow: hidden;
}

.pmu-summary-combined .pmu-summary-card {
  flex: 1;
  min-width: 0;
  min-height: auto;
  border-radius: 0;
  background: transparent;
}

.pmu-summary-divider {
  width: 1px;
  height: 40px;
  align-self: center;
  background: var(--devui-swim-split-line);
}

.pmu-summary-card {
  min-width: 0;
  min-height: 72px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--devui-swim-split-line);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.pmu-group-card {
  position: relative;
  overflow: hidden;
  width: 157px;
  min-width: 156px;
  background: rgba(255, 255, 255, 0.05);
}

.pmu-group-card::before,
.pmu-group-card::after {
  content: "";
  position: absolute;
  top: 50%;
  z-index: 0;
  height: 76px;
  transform: translateY(-50%);
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  pointer-events: none;
}

.pmu-group-card::before {
  left: -1px;
  width: 85px;
  background-image: var(--pmu-group-card-left-bg);
}

.pmu-group-card::after {
  left: 83px;
  right: -1px;
  width: auto;
  background-image: var(--pmu-group-card-right-bg);
}

.pmu-summary-label {
  color: var(--devui-secondary-text);
  font-size: 12px;
  line-height: 18px;
}

.pmu-summary-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 26px;
  color: var(--devui-primary-text);
}

.pmu-group-card .pmu-summary-label,
.pmu-group-card strong {
  position: relative;
  z-index: 1;
}

.gap-negative {
  color: #ff6474 !important;
}

.gap-positive {
  color: var(--devui-primary-text) !important;
}

.gap-normal {
  color: var(--devui-primary-text) !important;
}

.pmu-stack-bar {
  display: flex;
  width: 100%;
  min-width: 564px;
  height: 24px;
  overflow: hidden;
  border-radius: 4px;
  border: 1px dashed rgba(0, 0, 0, 0.42);
  background: rgba(0, 0, 0, 0.04);
}

.pmu-stack-bar.is-dark {
  border: 1px dashed rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.04);
}

.pmu-stack-segment {
  height: 100%;
  min-width: 2px;
}

.pmu-stack-gap {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.18) 0,
      rgba(0, 0, 0, 0.18) 1px,
      transparent 1px,
      transparent 6px
    );
}

.pmu-stack-bar.is-dark .pmu-stack-gap {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.18) 0,
      rgba(255, 255, 255, 0.18) 1px,
      transparent 1px,
      transparent 6px
    );
}

.pmu-counter-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 564px;
}

.pmu-counter-row {
  display: grid;
  grid-template-columns: 22px minmax(180px, 1fr) 88px 72px;
  align-items: center;
  width: 100%;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--devui-primary-text);
  font: inherit;
  text-align: left;
}

.pmu-counter-row.disabled {
  color: var(--devui-disabled-text);
}

.pmu-counter-row.disabled .pmu-counter-swatch {
  opacity: 0.32;
}

.pmu-counter-swatch {
  width: 14px;
  height: 14px;
  margin-left: 2px;
  border-radius: 3px;
}

.pmu-counter-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.pmu-counter-zero {
  color: #53565d !important;
}

.pmu-counter-value,
.pmu-counter-percent {
  justify-self: end;
  color: var(--devui-secondary-text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.pmu-cache-metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 564px;
  padding-top: 8px;
  border-top: 1px solid var(--devui-swim-border-color);
}

.pmu-cache-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--devui-primary-text);
  font-size: 13px;
  line-height: 22px;
}

.pmu-cache-row strong {
  color: var(--devui-secondary-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.pmu-diagnosis-empty {
  display: flex;
  align-items: center;
  height: 120px;
  color: var(--devui-secondary-text);
  font-size: 13px;
}
</style>
