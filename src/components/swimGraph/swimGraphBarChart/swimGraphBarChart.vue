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
  <div ref="chartDiv" class="occupy-rate-container" :style="{width: occupyRateContainerWidth + 'px'}">
    <div class="row-coord" :style="{width: rowCoordWidth + 'px'}">
      <div class="row-coord-num" 
        v-for="(coordIt, index) in rowCoordList" 
        :key="index"
        :style="{ left: rowCoordLoc[index]}">
        {{rowCoordList[index]}}
      </div>
    </div>
    <div class="occupy-rate-chart-container" ref="barChartContainerDiv" :style="{width: occupyRateContainerWidth + 'px'}">
      <div class="occupy-rate-chart-col-coord-container" ref="colCoordContainerDiv">
        <div class="occupy-rate-chart-col-coord" 
          v-for="(colCoordIt, index) in colCoordList"
          :key="index">
          {{colCoordIt}}
        </div>
      </div>
      <div class="occupy-rate-bar-container"
        :style="{ height: pmuRowCoordList.length * 36 + 4 + 'px', width: barWidth + 'px'}">
        <div class="occupy-rate-bar-line"
          v-for="(lineLoc, index) in backLineLoc"
          :key="index"
          :style="{ left: lineLoc}"> 
        </div>

        <div class="occupy-rate-backbar"
          v-for="(dataLeft, index) in chartDataLeft"
          :key="index"
          :style="{ top: 10 + 30 * index + 'px', width: barWidth + 'px', borderColor: pmuBarBorderColorList[index]}">
          <div class="occupy-rate-bar" 
            :style="{ width: barWidthList[index] + 'px', background: pmuBarColorList[index]}"></div>
          <div class="occupy-rate-cycle">{{ dataLeft }}</div>
          <div class="occupy-rate-percentage">{{ charDataRight[index] }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, provide, inject} from 'vue';
import { useI18n } from 'vue-i18n';

const {pmuRowCoordList, pmuColCoordList, pmuRowCoordLoc, pmuBarColorList, pmuBarBorderColorList, pmuChartDataLeft, pmuChartDataRight, reportTitle, pmuBackLineLoc, isDarkTheme, pmuValid} = inject('swimGraphPmuBarChartInfo');

const {
  isWideScreen,
} = inject('swimGraphState');

const chartDiv = ref(null);
const rowCoordList = ref([]);
const rowCoordLoc = ref([]);
const colCoordList = ref([]);
const chartDataLeft = ref([]);
const charDataRight = ref([]);
const barColorList = ref([]);
const backLineLoc = ref([]);
const barWidthList = ref([]);

const barWidth = ref(340);
const occupyRateContainerWidth = ref(440);
const rowCoordWidth = ref(350);

barWidth.value = isWideScreen.value ? 340 : 220;
occupyRateContainerWidth.value = isWideScreen.value ? 440 : 320;
rowCoordWidth.value = isWideScreen.value ? 350 : 210;

let chartDivWidth = 470;
if (chartDiv.value) {
  chartDivWidth = chartDiv.value.offsetWidth;
}

let barChartContainerDivWidth = 340;
barChartContainerDivWidth = isWideScreen.value ? 340 : 200;

rowCoordList.value = pmuRowCoordList.value;
rowCoordLoc.value = pmuRowCoordLoc.value;
colCoordList.value = pmuColCoordList.value;
chartDataLeft.value = pmuChartDataLeft.value;
charDataRight.value = pmuChartDataRight.value;
backLineLoc.value = pmuBackLineLoc.value;

for (const percent of pmuChartDataRight.value) {
  barWidthList.value.push(barChartContainerDivWidth * percent / 100);
}

</script>

<style scoped>
.occupy-rate-container {
  width: 440;
  overflow-x: auto;
}

.row-coord-num {
  width: 23px;
  height: 18px;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  font-weight: 400;
  position: absolute;
}

.occupy-rate-chart-col-coord-container {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.occupy-rate-chart-col-coord {
  width: 90px;
  height: 20px;
  color: rgba(153, 153, 153, 1);
  font-size: 13px;
  font-weight: 400;
}

.occupy-rate-bar-container {
  margin-left: 10px;
  position: relative;
  width: 340px;
  height: 220px;
}

.occupy-rate-bar-line {
  z-index: 1;
  width: 1px;
  height: v-bind('pmuValid ? "207px" : "180px"');
  border-left: 1px dashed var(--devui-slider-bar);
  opacity: 0.1;
  position: absolute;
  bottom: 0;
  top: 0;
}

.occupy-rate-backbar {
  z-index: 0;
  width: 340px;
  height: 20px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  backdrop-filter: blur(10px);
  position: absolute;
  bottom: 0;
  left: 0;
}

.occupy-rate-bar {
  height: 19px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  z-index: 2;
  position: absolute;
  left: 0;
  top: 0;
}

.occupy-rate-cycle {
  height: 12px;
  font-size: 12px;
  font-weight: 400;
  color: var(--vscode-badge-foreground);
  position: absolute;
  left: 8px;
  top: 1px;
  z-index: 3;
}

.occupy-rate-percentage {
  height: 12px;
  font-size: 12px;
  font-weight: 400;
  position: absolute;
  color: var(--vscode-badge-foreground);
  right: 8px;
  top: 1px;
  z-index: 3;
}
</style>