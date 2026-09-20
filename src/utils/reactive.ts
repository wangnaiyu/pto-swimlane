/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { toRaw } from 'vue';

/**
 * 递归去除所有vue响应式生成的proxy
 * @param maybeProxy 输入
 * @param visitedObjects 递归过程中已访问的对象和数组
 */
export function deepToRaw<T>(maybeProxy: T, visitedObjects = new WeakSet<any>()): T {
  const raw = toRaw(maybeProxy);

  // 循环依赖
  if (visitedObjects.has(raw)) {
    return raw;
  }

  // 数组
  if (Array.isArray(raw)) {
    visitedObjects.add(raw);
    raw.forEach((item, index) => {
      raw[index] = deepToRaw(item, visitedObjects);
    });
    return raw;
  }

  // 对象
  if (raw instanceof Date || raw === null) {
    return raw;
  } else if (typeof raw === 'object') {
    visitedObjects.add(raw);
    const keys = Object.keys(raw);
    for (const key of keys) {
      raw[key] = deepToRaw(raw[key], visitedObjects);
    }
    return raw;
  }

  // 其他
  return raw;
}
