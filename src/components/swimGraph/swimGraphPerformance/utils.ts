/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
export const executionTimeData = {
    ticksMap: new Map(),
    timelineGroupsMap: new Map(),
    echartsMap: new Map(),
    tableData: []
  };
  export const US_TO_MS_THRESHOLD = 1000;
  export const US_TO_S_THRESHOLD = 1000000;
  export const UNIT_US = '\u03BCs';
  export const UNIT_MS = 'ms';
  export const UNIT_S = 's';
  export const formatTimeUnit = (valueInUs) => {
    if (!valueInUs) return UNIT_US;
    if (valueInUs >= US_TO_S_THRESHOLD) return UNIT_S;
    if (valueInUs >= US_TO_MS_THRESHOLD) return UNIT_MS;
    return UNIT_US;
  };
  
  export const formatTimeValue = (valueInUs) => {
    if (!valueInUs) return 0;
    if (valueInUs >= US_TO_S_THRESHOLD) {
      return parseFloat((valueInUs / US_TO_S_THRESHOLD).toFixed(3));
    }
    if (valueInUs >= US_TO_MS_THRESHOLD) {
      return parseFloat((valueInUs / US_TO_MS_THRESHOLD).toFixed(3));
    }
    return valueInUs;
  };