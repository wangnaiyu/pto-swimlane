/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import SwimDataManager from "../swimData";

export interface MeasureEventSearchOptions {
  lineRange: [number, number];
  type: 'start' | 'end';
  measureDragStartY: number;
  measureDragEndY: number;
  childContextMap: any;
  processExpanded: Map<any, boolean>;
  pinnedThreads: Map<any, any>;
  pinnedthreadsComponent: any;
  swimDataManager: SwimDataManager;
  isMixMode: { value: boolean};
}

export interface IntelligentSearchOptions {
  measureDragStartX: { value: number };
  measureDragEndX: { value: number };
  measureDragStartY: number;
  measureDragEndY: number;
  measureDragStartTime: { value: number };
  measureDragEndTime: { value: number };
  xToTime: (x: number) => number;
  timeToX: (time: number) => number;
  childContextMap: any;
  processExpanded: Map<any, boolean>;
  pinnedThreads: Map<any, any>;
  pinnedthreadsComponent: any;
  renderFixedTimeline: () => void;
  renderTimeline: () => void;
  swimDataManager: SwimDataManager;
  isMixMode: { value: boolean};
}

const getEventY = (event: any, isPinnedArea: boolean): number => {
  return isPinnedArea ? (event.renderInfo?.pinnedEventY || 0) : event.renderInfo?.y;
};

const findClosestEvent = (events: any[], yLayer: number, isPinnedArea: boolean): any => {
  return events.reduce((closest, event) => {
    const closestDistance = Math.abs(getEventY(closest, isPinnedArea) - yLayer);
    const currentDistance = Math.abs(getEventY(event, isPinnedArea) - yLayer);
    return currentDistance < closestDistance ? event : closest;
  });
};

const pickTimeInRange = (event: any, type: 'start' | 'end', lineRange: [number, number]): number | null => {
  const [rangeStart, rangeEnd] = lineRange;
  const targetTime = type === 'start' ? event.startTime : event.endTime;
  const otherTime = type === 'start' ? event.endTime : event.startTime;
  if (targetTime > rangeStart && targetTime < rangeEnd) {
    return targetTime;
  }
  if (otherTime > rangeStart && otherTime < rangeEnd) {
    return otherTime;
  }
  return null;
};

export const measureTimeSearch = (
  matchingEvents: any[],
  lineRange: [number, number],
  yLayer: number,
  type: 'start' | 'end',
  isPinnedArea: boolean = false
): number | null => {
  const rangeStart = Math.max(0, yLayer - 120);
  const rangeEnd = yLayer + 120;

  const filteredEvents = matchingEvents.filter((event) => {
    const eventY = getEventY(event, isPinnedArea);
    return eventY && eventY >= rangeStart && eventY <= rangeEnd;
  });

  if (filteredEvents.length === 0) {
    return null;
  }

  const closestEvent = findClosestEvent(filteredEvents, yLayer, isPinnedArea);
  return pickTimeInRange(closestEvent, type, lineRange);
};
/**
 * 获取鼠标所在画布和画布内的y坐标
 * @param y 鼠标所在y坐标
 * @returns processKey: 鼠标所在画布所属的processKey, realY: 画布内的相对y坐标
 */
const realCoordinateY = (y: number) => {
  const processContainers = document.querySelectorAll('[data-process-container]');
  
  for (let i = 0; i < processContainers.length; i++) {
    const container = processContainers[i];
    const rect = container.getBoundingClientRect();
    
    if (y >= rect.top && y <= rect.bottom) {
      const processKey = container.getAttribute('data-process-container');
      const realY = y - rect.top;
      return { realY, processkey: processKey };
    }
  }
  
  return { realY: 0, processkey: '' };
}

const isEventInRange = (event: any, lineRangeStart: number, lineRangeEnd: number): boolean => {
  return (
    (event.startTime > lineRangeStart && event.startTime < lineRangeEnd) ||
    (event.endTime > lineRangeStart && event.endTime < lineRangeEnd)
  );
};

const collectPinnedEvents = (pinnedThreads: Map<any, any>, lineRangeStart: number, lineRangeEnd: number): any[] => {
  const events: any[] = [];
  for (const [, pinnedData] of pinnedThreads.entries()) {
    const { thread } = pinnedData;
    for (const eventId of thread.eventIds) {
      const event = swimDataManager.getEventById(eventId);
      if (isEventInRange(event, lineRangeStart, lineRangeEnd)) {
        events.push(event);
      }
    }
  }
  return events;
};

const collectProcessEvents = (
  processExpanded: Map<any, boolean>,
  targetProcessKey: string,
  lineRangeStart: number,
  lineRangeEnd: number,
  isMixMode: boolean,
  swimDataManager: SwimDataManager
): any[] => {
  const events: any[] = [];
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if ((targetProcessKey && processKey !== targetProcessKey) || !processExpanded.get(processKey)) {
      continue;
    }
    for (const [, thread] of process.threads.entries()) {
      const threadEvents = collectEventsFromThread(thread, lineRangeStart, lineRangeEnd, isMixMode, swimDataManager);
      events.push(...threadEvents);
    }
  }
  return events;
};

const resolvePinnedArea = (pinnedthreadsComponent: any, mouseY: number): { pinnedHeight: number; yLayer: number } => {
  let pinnedHeight = 0;
  let yLayer = 0;
  if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
    pinnedHeight = pinnedthreadsComponent.value.getPinnedHeight();
    const pinnedContainer = document.querySelector('.pinned-thread-event-container');
    if (pinnedContainer) {
      const rect = pinnedContainer.getBoundingClientRect();
      pinnedHeight = rect.bottom;
      yLayer = mouseY - rect.top;
    }
  }
  return { pinnedHeight, yLayer };
};

export const measureEventSearch = (options: MeasureEventSearchOptions): number | null => {
  const {
    lineRange,
    type,
    measureDragStartY,
    measureDragEndY,
    childContextMap,
    processExpanded,
    pinnedThreads,
    pinnedthreadsComponent,
    swimDataManager,
    isMixMode
  } = options;

  const [lineRangeStart, lineRangeEnd] = lineRange;
  const mouseY = type === 'start' ? measureDragStartY : measureDragEndY;

  const { pinnedHeight, yLayer: pinnedYLayer } = resolvePinnedArea(pinnedthreadsComponent, mouseY);
  const isPinnedArea = mouseY <= pinnedHeight;

  let matchingEvents: any[];
  let yLayer: number;
  if (isPinnedArea) {
    matchingEvents = collectPinnedEvents(pinnedThreads, lineRangeStart, lineRangeEnd);
    yLayer = pinnedYLayer;
  } else {
    const result = realCoordinateY(mouseY);
    yLayer = result.realY;
    matchingEvents = collectProcessEvents(
      processExpanded, result.processkey,
      lineRangeStart, lineRangeEnd, isMixMode.value, swimDataManager
    );
  }

  if (type === 'end' && isMixMode.value) {
    matchingEvents = matchingEvents.filter(event =>
      event.endTime > lineRangeStart && event.endTime < lineRangeEnd
    );
  }

  return measureTimeSearch(matchingEvents, lineRange, yLayer, type, isPinnedArea);
};

const collectEventsFromThread = (thread, lineRangeStart, lineRangeEnd, isMixMode, swimDataManager) => {
  const events = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!isEventInRange(event, lineRangeStart, lineRangeEnd)) {
      continue;
    }
    if (isMixMode) {
      const subEvents = swimDataManager.getSubEvents(event.id);
      events.push(...(subEvents.length > 0 ? subEvents : [event]));
    } else {
      events.push(event);
    }
  }
  return events;
};

export const intelligentSearchHelper = (options: IntelligentSearchOptions) => {
  const {
    measureDragStartX,
    measureDragEndX,
    measureDragStartTime,
    measureDragEndTime,
    xToTime,
    timeToX,
    childContextMap,
    processExpanded,
    pinnedThreads,
    pinnedthreadsComponent,
    renderFixedTimeline,
    renderTimeline,
    swimDataManager,
    isMixMode
  } = options;

  let start = measureDragStartX.value;
  let end = measureDragEndX.value;

  const startlineRange: [number, number] = [xToTime(start - 16), xToTime(start + 16)];
  const endlineRange: [number, number] = [xToTime(end - 16), xToTime(end + 16)];

  const foundStartTime = measureEventSearch({
    lineRange: startlineRange,
    type: 'start',
    measureDragStartY: options.measureDragStartY,
    measureDragEndY: options.measureDragEndY,
    childContextMap,
    processExpanded,
    pinnedThreads,
    pinnedthreadsComponent,
    swimDataManager,
    isMixMode
  });
  const foundEndTime = measureEventSearch({
    lineRange: endlineRange,
    type: 'end',
    measureDragStartY: options.measureDragStartY,
    measureDragEndY: options.measureDragEndY,
    childContextMap,
    processExpanded,
    pinnedThreads,
    pinnedthreadsComponent,
    swimDataManager,
    isMixMode
  });

  if (foundStartTime !== null) {
    start = foundStartTime;
    measureDragStartX.value = timeToX(start);
  }

  if (foundEndTime !== null) {
    end = foundEndTime;
    measureDragEndX.value = timeToX(end);
  }

  if (measureDragStartX.value <= measureDragEndX.value) {
    document.documentElement.style.setProperty('--maskstart', `${measureDragStartX.value}px`);
    document.documentElement.style.setProperty('--maskend', `${measureDragEndX.value}px`);
  } else {
    document.documentElement.style.setProperty('--maskstart', `${measureDragEndX.value}px`);
    document.documentElement.style.setProperty('--maskend', `${measureDragStartX.value}px`);
  }

  measureDragStartTime.value = foundStartTime ? start : xToTime(measureDragStartX.value);
  measureDragEndTime.value = foundEndTime ? end : xToTime(measureDragEndX.value);

  renderFixedTimeline();
  renderTimeline();
};