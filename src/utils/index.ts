/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
const OFFSET = 20;
const SCALE = 100;
const defaultWidthMapStr = `007LLmW'55;N0500LLLLLLLLLL00NNNLzWW\\\\WQb\\0FWLg\\bWb\\WQ\\WrWWQ000CL5LLFLL0LL**F*gLLLL5F0LF\\FFF5.5N`;

function getTextWidthMap(mapStr: string) {
  const map: Record<string, number> = {};
  if (typeof JSON === 'undefined') {
    return map;
  }
  for (let i = 0; i < mapStr.length; i++) {
    const char = String.fromCharCode(i + 32);
    const size = (mapStr.charCodeAt(i) - OFFSET) / SCALE;
    map[char] = size;
  }
  return map;
}

const DEFAULT_TEXT_WIDTH_MAP = getTextWidthMap(defaultWidthMapStr);

/* 返回指定字符串的宽度，默认按字体大小为12计算总宽度 */
export function getTextWidth(text: string, fontSize = 12) {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const preCalcWidth = DEFAULT_TEXT_WIDTH_MAP[text[i]];
    width += preCalcWidth == null ? fontSize : preCalcWidth * fontSize;
  }
  return width;
}

/* diff双图场景，返回当前操作的区域，after/before */
export function getCurrentArea(e: MouseEvent) {
  const composedPath = e.composedPath() as HTMLElement[];
  let moveArea = '';
  composedPath.forEach((item) => {
    if (item.id === 'sprotty-after') {
      moveArea = 'after';
    }
    if (item.id === 'sprotty-before') {
      moveArea = 'before';
    }
  });
  return moveArea;
}

const syncNode = new Set<String> (['SYNC_SRC', 'SYNC_DST', 'BAR.V', 'PHASE1', 'PHASE2']);

function addDiffElements(eleChangeType, eleNodeType, magic, eleNodeId, diffList: any, opCode = 'Default') {
  if (syncNode.has(opCode)) {
    return;
  }
  diffList.push({ changeType: eleChangeType, nodeType: eleNodeType, magic: magic, ...eleNodeId });
}

function addDiffDetail(newOp, oldOp, diffDetail: any, opCode = 'Default') {
  if (syncNode.has(opCode)) {
    return;
  }
  diffDetail.push({ new: newOp ? { ...newOp } : newOp, old: oldOp ? { ...oldOp } : oldOp });
}

function setCompreTypeOverrate(arr: any[]): void {
  for (let i = 0, len = arr.length; i < len; i++) {
    const item = arr[i];
    const target = item.__v_raw || item.__raw || item;
    if ('compareType' in target) {
      target.compareType = 'overrate';
    }
  }
}

// diff双图数据对比
function buildOriginData(data: any, opMagicMap: Record<number, string>, tensorMagicMap: Record<number, string>) {
  return {
    tensors:
      data.tensors?.map((t: any) => {
        const subgraphId = t.subgraphid !== undefined ? t.subgraphid : -1;
        tensorMagicMap[t.magic] = `tensor-${t.magic}-${subgraphId}`;
        return { ...t };
      }) ?? [],
    operations:
      data.operations?.map((op: any) => {
        const subgraphId = op.subgraphid !== undefined ? op.subgraphid : -1;
        opMagicMap[op.opmagic] = `operation-magic-${op.opmagic}-${subgraphId}`;
        return { ...op };
      }) ?? [],
  };
}

function buildMagicMap(arr: any[], key: string, prefix: string): Map<any, any> {
  return new Map(arr?.map((item) => [item[key], item]) ?? []);
}

function compareTensors(curMap, beforeMap, curMagicMap, beforeMagicMap, diffList, diffDetail) {
  for (const ct of curMap.values()) {
    const bt = beforeMap.get(ct.magic);
    if (!bt) {
      diffDetail.push({ new: { ...ct } });
      ct.compareType = 'add';
      diffList.push({ changeType: 'add', nodeType: 'tensor', magic: ct.magic, afterNodeId: curMagicMap[ct.magic] });
    } else if (JSON.stringify(ct.offset) !== JSON.stringify(bt.offset) || JSON.stringify(ct.shape) !== JSON.stringify(bt.shape)) {
      diffDetail.push({ new: { ...ct }, old: { ...bt } });
      ct.compareType = 'change';
      bt.compareType = 'change';
      diffList.push({ changeType: 'change', nodeType: 'tensor', magic: ct.magic, beforeNodeId: beforeMagicMap[bt.magic], afterNodeId: curMagicMap[ct.magic] });
    } else {
      ct.compareType = 'normal';
      bt.compareType = 'normal';
    }
  }
  for (const bt of beforeMap.values()) {
    if (!curMap.get(bt.magic)) {
      diffDetail.push({ old: { ...bt } });
      bt.compareType = 'delete';
      diffList.push({ changeType: 'delete', nodeType: 'tensor', magic: bt.magic, beforeNodeId: beforeMagicMap[bt.magic] });
    }
  }
}

function compareOps(curMap, beforeMap, curMagicMap, beforeMagicMap, diffList, diffDetail) {
  for (const cop of curMap.values()) {
    const bop = beforeMap.get(cop.opmagic);
    if (!bop) {
      addDiffDetail(cop, undefined, diffDetail, cop.opcode);
      cop.compareType = 'add';
      addDiffElements('add', 'op', cop.opmagic, { afterNodeId: curMagicMap[cop.opmagic] }, diffList, cop.opcode);
    } else if (cop.opcode != bop.opcode ||
              JSON.stringify(cop.ioperands) !== JSON.stringify(bop.ioperands) ||
              JSON.stringify(cop.ooperands) !== JSON.stringify(bop.ooperands)) {
      addDiffDetail(cop, bop, diffDetail, cop.opcode);
      cop.compareType = 'change';
      bop.compareType = 'change';
      addDiffElements('change', 'op', cop.opmagic, { beforeNodeId: beforeMagicMap[bop.opmagic], afterNodeId: curMagicMap[cop.opmagic] }, diffList, cop.opcode);
    } else {
      cop.compareType = 'normal';
      bop.compareType = 'normal';
    }
  }
  for (const bop of beforeMap.values()) {
    if (!curMap.get(bop.opmagic)) {
      addDiffDetail(undefined, bop, diffDetail, bop.opcode);
      bop.compareType = 'delete';
      addDiffElements('delete', 'op', bop.opmagic, { beforeNodeId: beforeMagicMap[bop.opmagic] }, diffList, bop.opcode);
    }
  }
}

function handleOverrate(beforeData, currentData, originBefore, originCurrent) {
  beforeData.tensors = originBefore.tensors;
  setCompreTypeOverrate(beforeData.tensors);
  beforeData.operations = originBefore.operations;
  setCompreTypeOverrate(beforeData.operations);
  currentData.tensors = originCurrent.tensors;
  setCompreTypeOverrate(currentData.tensors);
  currentData.operations = originCurrent.operations;
  setCompreTypeOverrate(currentData.operations);
  (window as any).ascEventBus.emit('message_notice', 'compareLargerTips');
}

// diff双图数据对比
export function compareJsonData(beforeData: Object, currentData: Object) {
  const BeforeOpMagicMap: Record<number, string> = {};
  const BeforeTensorMagicMap: Record<number, string> = {};
  const CurrentOpMagicMap: Record<number, string> = {};
  const CurrentTensorMagicMap: Record<number, string> = {};
  const originBefore = buildOriginData(beforeData, BeforeOpMagicMap, BeforeTensorMagicMap);
  const originCurrent = buildOriginData(currentData, CurrentOpMagicMap, CurrentTensorMagicMap);
  let diffList: Record<string, any>[] = [];
  const diffDetail: Record<string, any>[] = [];
  const curTensorMap = buildMagicMap(currentData.tensors, 'magic', 'tensor');
  const curOpMap = buildMagicMap(currentData.operations, 'opmagic', 'op');
  const beforeTensorMap = buildMagicMap(beforeData.tensors, 'magic', 'tensor');
  const beforeOpMap = buildMagicMap(beforeData.operations, 'opmagic', 'op');
  compareTensors(curTensorMap, beforeTensorMap, CurrentTensorMagicMap, BeforeTensorMagicMap, diffList, diffDetail);
  compareOps(curOpMap, beforeOpMap, CurrentOpMagicMap, BeforeOpMagicMap, diffList, diffDetail);
  if (diffList.length / (curOpMap.size + curTensorMap.size) > 0.5 && diffList.length >= 400) {
    handleOverrate(beforeData, currentData, originBefore, originCurrent);
    return { diffList: [], showDiffList: false };
  }
  if (diffList.length === 0) {
    (window as any).ascEventBus.emit('message_notice', 'noCompareTips');
  }
  return { diffList, diffDetail, showDiffList: true };
}

// 判断是否是node节点
export function isNode(element): boolean {
  return element.type.includes('node');
}

function computeLatestPredEnd(event, allEventsMap) {
  const predecessors = event.dependencies?.predecessors;
  if (!predecessors?.length) {
    return null;
  }
  let latestPredEnd = null;
  for (const id of predecessors) {
    const pred = allEventsMap.get(id);
    if (pred && pred.endTime) {
      if (latestPredEnd === null || pred.endTime > latestPredEnd) {
        latestPredEnd = pred.endTime;
      }
    }
  }
  return latestPredEnd;
}

function computeEarliestSuccStart(event, allEventsMap) {
  const successors = event.dependencies?.successors;
  if (!successors?.length) {
    return null;
  }
  let earliestSuccStart = null;
  for (const id of successors) {
    const succ = allEventsMap.get(id);
    if (succ && succ.startTime) {
      if (earliestSuccStart === null || succ.startTime < earliestSuccStart) {
        earliestSuccStart = succ.startTime;
      }
    }
  }
  return earliestSuccStart;
}

function applyGlobalClip(event, globalMaxTime, originalDuration) {
  if (event.renderEndTime > globalMaxTime) {
    event.renderEndTime = globalMaxTime;
    event.renderStartTime = Math.max(event.renderStartTime, globalMaxTime - originalDuration);
    if (event.renderStartTime >= event.renderEndTime) {
      event.renderStartTime = globalMaxTime - 1;
      event.renderEndTime = globalMaxTime;
    }
    event.renderDuration = event.renderEndTime - event.renderStartTime;
  }
}

function setEventRender(event, renderStart, renderEnd, lineIndex) {
  event.renderStartTime = renderStart;
  event.renderDuration = Math.round((renderEnd - renderStart) / 10);
  event.renderEndTime = event.renderStartTime + event.renderDuration;
  event.line = lineIndex;
}

function tryPlaceInExistingLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime) {
  const linesBN = lines.map(line => line || 0);
  for (let i = 0; i < linesBN.length; i++) {
    const renderStart = Math.max(minStart, linesBN[i]);
    if (renderStart >= maxEnd) {
      continue;
    }
    const renderEnd = Math.min(renderStart + originalDuration, maxEnd);
    setEventRender(event, renderStart, renderEnd, i);
    lines[i] = event.renderEndTime;
    applyGlobalClip(event, globalMaxTime, originalDuration);
    return true;
  }
  return false;
}

function placeInNewLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime) {
  const renderStart = minStart;
  const renderEnd = Math.min(renderStart + originalDuration, maxEnd);
  setEventRender(event, renderStart, renderEnd, lines.length);
  lines.push(event.renderEndTime);
  applyGlobalClip(event, globalMaxTime, originalDuration);
}

export function layoutFakeCoreEvent(event, lines, allEventsMap, globalMaxTime) {
  const originalDuration = event.endTime - event.startTime;

  let minStart = event.startTime;
  let maxEnd = event.endTime;

  const latestPredEnd = computeLatestPredEnd(event, allEventsMap);
  if (latestPredEnd !== null) {
    minStart = Math.min(minStart, latestPredEnd);
  }

  const earliestSuccStart = computeEarliestSuccStart(event, allEventsMap);
  if (earliestSuccStart !== null) {
    maxEnd = Math.max(maxEnd, earliestSuccStart);
  }

  if (!tryPlaceInExistingLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime)) {
    placeInNewLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime);
  }
}
