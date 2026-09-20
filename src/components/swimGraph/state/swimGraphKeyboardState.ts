/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { ref, reactive } from 'vue';
import { Animation } from '../swimGraphProcesses/animation';

export const Zoom = {
  None: 0,
  In: 1,
  Out: -1,
};

export const Pan = {
  None: 0,
  Left: -1,
  Right: 1,
};

export const keyboardState = reactive({
  zooming: Zoom.None,
  panning: Pan.None,
  keyInterval: null as ReturnType<typeof setInterval> | null,
  keyTimeOut: null as ReturnType<typeof setTimeout> | null,
  scaleStep: 0.1,
  moveStep: 30,
  activeHandleKeyDown: null as ((e: KeyboardEvent) => void) | null,
  zoomAnimation: null as Animation | null,
  panAnimation: null as Animation | null,
});

export const isKeyPressed = ref(false);
