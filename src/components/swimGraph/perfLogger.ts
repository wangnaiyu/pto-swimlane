/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
let isDebugMode = false;
let totalStartTime = 0;
let transformTime = 0;

export const setDebugMode = (mode: boolean): void => {
  isDebugMode = mode;
};

export const setTotalStartTime = (time: number): void => {
  totalStartTime = time;
};

export const setTransformTime = (time: number): void => {
  transformTime = time;
};

export const isDebugEnabled = (): boolean => {
  return isDebugMode;
};

export const perfLogger = {
  time: (label: string): void => {
    if (!isDebugMode) return;
    console.time(`[Performance] ${label}`);
  },
  timeEnd: (label: string): void => {
    if (!isDebugMode) return;
    console.timeEnd(`[Performance] ${label}`);
  },
  log: (message: string, duration?: number): void => {
    if (!isDebugMode) return;
    if (duration !== undefined) {
      console.log(`[Performance] ${message}: ${duration}ms`);
    } else {
      console.log(`[Performance] ${message}`);
    }
  },
  measure: (label: string, startTime: number): number | undefined => {
    if (!isDebugMode) return;
    const duration = new Date().getTime() - startTime;
    console.log(`[Performance] ${label}: ${duration}ms`);
    return duration;
  },
  getStartTime: (): number => totalStartTime,
  getTransformTime: (): number => transformTime,
};