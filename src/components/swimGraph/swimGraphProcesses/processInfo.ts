/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { generateColorList, getColorByString } from '../../../utils/color-list';
import { swimDataManager } from '../swimData';
import { DEP_MODE } from '../swimGraphUtils';

const darkThemeColors = generateColorList(360);
const lithtThemeColors = generateColorList(360, false);
const darkThemeBaseColors = darkThemeColors.baseColorList;
const darkThemeLightColors = darkThemeColors.lightColorList;
const lightThemeBaseColors = lithtThemeColors.baseColorList;
const lightThemeLightColors = lithtThemeColors.lightColorList;

export const getHashOrderGroup = (event: any, hashOrderType='') => {
  let hashOrderGroup = '';
  if (event.args['hashOrder-hint'] !== undefined || event.args.hashorder !== undefined) {
    const hashOrderStr = event.args['hashOrder-hint'] ?? event.args.hashorder;
    if (hashOrderType === 'cubeMergeHashOrder') {
      if (hashOrderStr.includes('cubeMergeInfo')) {
        const cubeMatch = hashOrderStr.match(new RegExp(`cubeMergeInfo hashOrder: (\\S+), subGraphCount: (\\d+)`));
        hashOrderGroup = cubeMatch ? cubeMatch[1] : null;
      } else if (hashOrderStr.includes('vecMergeInfo')) {
        const vecMatch = hashOrderStr.match(new RegExp(`vecMergeInfo hashOrder: (\\S+), subGraphCount: (\\d+)`));
        hashOrderGroup = vecMatch ? vecMatch[1] : null;
      }
   } else if (hashOrderType === 'L1ReuseHashOrder') {
     if (hashOrderStr.includes('l1ReuseInfo')) {
       const l1Match = hashOrderStr.match(new RegExp(`l1ReuseInfo hashOrder: (\\S+), subGraphCount: (\\d+)`));
       hashOrderGroup = l1Match ? l1Match[1] : null;
      } else if (hashOrderStr.includes('vecMergeInfo')) {
        const vecMatch = hashOrderStr.match(new RegExp(`vecMergeInfo hashOrder: (\\S+), subGraphCount: (\\d+)`));
        hashOrderGroup = vecMatch ? vecMatch[1] : null;
      }
    }
  }
  return hashOrderGroup
}

export const getSubGraphId = (event: any, mode: string, defaultValue=15) => {
  let subGraphId;
  if (!event) {
    return defaultValue;
  }
  const nameParts = event.name.split('(')[0].split('-').map(part => part.trim());

  if (mode === "subGraph") {
    if (event.leafIndex) {
      subGraphId = event.leafIndex;
    } else if (event.args && event.args['event-hint']) {
      const subGraphArr = event.args['event-hint'].split(',');
      const subGraphItem = subGraphArr.find(item => item.includes('subGraphId'));
      subGraphId = subGraphItem ? subGraphItem.split(':')[1] : null;
    }
    if (subGraphId === null || subGraphId === undefined) {
      subGraphId = nameParts[nameParts.length - 1];
    }
  } else if (mode === "stichedFunc") {
    subGraphId = nameParts[0];
  } else if (mode === 'mixSubGraph') {
    subGraphId = event.args.wrapId;
  }

  subGraphId = Number(subGraphId);
  if (Number.isNaN(subGraphId)) {
    return defaultValue;
  }

  return subGraphId ?? defaultValue;
};

export const getBaseColor = (event, dep) => {
  if (!event) {
    return '#666666';
  }
  const { kernelColorRending, isDarkTheme } = dep;
  if (!event.color || !event.color.dark) {
    const process = Array.from(swimDataManager.getAllProcesses().values()).find((p: any) => p.pid === event.pid);
    const processType = process?.type || process?.args?.type || 'kernel';
    event.color = getEventColorByMode(event, kernelColorRending.value, processType);
  }
  if (isDarkTheme.value) {
    return event.color.dark.base;
  } else {
    return event.color.light.base;
  }
};

export const getLightColor = (event, dep) => {
  if (!event) {
    return '#666666';
  }
  const { kernelColorRending, isDarkTheme } = dep;
  if (!event.color.dark) {
    const process = Array.from(swimDataManager.getAllProcesses().values()).find((p: any) => p.pid === event.pid);
    const processType = process?.type || process?.args?.type || 'kernel';
    event.color = getEventColorByMode(event, kernelColorRending.value, processType);
  }
  if (isDarkTheme.value) {
    return event.color.dark.light;
  } else {
    return event.color.light.light;
  }
};

export const getEventColorByMode = (event: any, mode: string, processType = 'kernel', hashOrderType='') => {
  let dBaseColor: string, dLightColor: string, lBaseColor: string, lLightColor: string;
  const isPerfSwimMode = mode === 'perfName' || processType === 'PerfSwim';
  const isByNameSwim = mode === 'name' || processType === 'aicpu';
  if (isPerfSwimMode || isByNameSwim) {
    const label = event.name || '';
    let processedLabel = label;
    if (isPerfSwimMode) {
      const leftParenIndex = label.indexOf('(');
      const rightParenIndex = label.indexOf(')');
      if (leftParenIndex !==-1 && rightParenIndex !== -1 && leftParenIndex < rightParenIndex) {
        processedLabel = label.substring(0, leftParenIndex);
      }
    }
    const dres = getColorByString(processedLabel, darkThemeBaseColors, darkThemeLightColors);
    const lres = getColorByString(processedLabel, lightThemeBaseColors, lightThemeLightColors);
    dBaseColor = dres.baseColor;
    dLightColor = dres.lightColor;
    lBaseColor = lres.baseColor;
    lLightColor = lres.lightColor;
  } else if (mode === 'isomorphicSubGraph'){
    const laberName = getHashOrderGroup(event, hashOrderType)
    const dres = getColorByString(laberName, darkThemeBaseColors, darkThemeLightColors);
    const lres = getColorByString(laberName, lightThemeBaseColors, lightThemeLightColors);
    dBaseColor = dres.baseColor;
    dLightColor = dres.lightColor;
    lBaseColor = lres.baseColor;
    lLightColor = lres.lightColor;
  } 
  else if (mode !== "label") {
    const subGraphId = getSubGraphId(event, mode);
    dBaseColor = darkThemeBaseColors[subGraphId];
    dLightColor = darkThemeLightColors[subGraphId];
    lBaseColor = lightThemeBaseColors[subGraphId];
    lLightColor = lightThemeLightColors[subGraphId];
 
   if (subGraphId > 360 && !dBaseColor) {
     dBaseColor = darkThemeBaseColors[subGraphId % 360];
     dLightColor = darkThemeLightColors[subGraphId % 360];
     lBaseColor = lightThemeBaseColors[subGraphId % 360];
     lLightColor = lightThemeLightColors[subGraphId % 360];
   }
  } else {
    const labelPart = event.name.match(/\((?<label>[^)]+)\)/);
    let labelname = labelPart ? labelPart.groups.label.trim() : '';
    if (labelname === '') {
      labelname = event.args?.color || '';
    }
    const dres = getColorByString(labelname, darkThemeBaseColors, darkThemeLightColors);
    const lres = getColorByString(labelname, lightThemeBaseColors, lightThemeLightColors);
    dBaseColor = dres.baseColor;
    dLightColor = dres.lightColor;
    lBaseColor = lres.baseColor;
    lLightColor = lres.lightColor;
  }
  dBaseColor = dBaseColor ?? '#666666';
  dLightColor = dLightColor ?? '#666666';
  lBaseColor = lBaseColor ?? '#666666';
  lLightColor = lLightColor ?? '#666666';
  return { dark: { base: dBaseColor, light: dLightColor }, light: { base: lBaseColor, light: lLightColor } };
};

// 根据时间计算坐标，不受缩放影响
export const getPositionByTime = (time, viewState, layout) => {
  const canvasWidth = viewState.canvasCssWidth;
  const relativeTime = time - viewState.minTime;
  const range = viewState.maxTime - viewState.minTime;
  const normalizedTime = relativeTime / range;
  return layout.processLabelWidth + (normalizedTime * canvasWidth);
};

// 根据时间计算宽度，不受缩放影响
export const getWidthByDuration = (duration, viewState) => {
  const canvasWidth = viewState.canvasCssWidth;
  const range = viewState.maxTime - viewState.minTime;
  const normalizedDuration = duration / range;
  return normalizedDuration * canvasWidth;
};

// 收集相关边
export const collectRelevantEdges = (startNodeId, eventMap, mode, level) => {
  const edgesToDraw = new Set();
  
  const bfsTraversal = (currentId, depth, direction) => {
    if (depth === 0 || !eventMap.has(currentId)) {
      return;
    }
    
    const currentEvent = eventMap.get(currentId);
    let neighbors;

    if (direction === 'pre') {
      neighbors = currentEvent.dependencies.predecessors || [];
    } else {
      neighbors = currentEvent.dependencies.successors || [];
    }

    for (const neighborId of neighbors) {
      const symbol = direction === 'pre' ? `${neighborId}->${currentId}` : `${currentId}->${neighborId}`;
      if (!edgesToDraw.has(symbol)) {
        edgesToDraw.add(symbol);
        bfsTraversal(neighborId, depth - 1, direction);
      }
    }
  };

  if (mode === DEP_MODE.all || mode === DEP_MODE.pre) {
    bfsTraversal(startNodeId, level, 'pre'); // 遍历前驱方向
  }
  
  if (mode === DEP_MODE.all || mode === DEP_MODE.next) {
    bfsTraversal(startNodeId, level, 'next'); // 遍历后继方向
  }

  return Array.from(edgesToDraw);
};
