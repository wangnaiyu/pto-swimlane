/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
export const globalKeyEvent = (e, globalMousePosition, layout, eventType) => {
  const activeElement = document.activeElement;
  if (activeElement.nodeName === 'INPUT') {
    return;
  }

  const mouseX = globalMousePosition.x;
  const isMouseInSwimlane = mouseX >= layout.processLabelWidth;
  
  if (isMouseInSwimlane) {
    const firstProcessCanvas = document.querySelector('.events-canvas');
    if (firstProcessCanvas) {
      const targetRect = firstProcessCanvas.getBoundingClientRect();
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: mouseX,
        clientY: 10 + targetRect.top,
        bubbles: true,
        cancelable: true
      });
      firstProcessCanvas.dispatchEvent(mouseMoveEvent);
      const newEvent = new KeyboardEvent(eventType, {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        bubbles: true,
        cancelable: true
      });
      firstProcessCanvas.dispatchEvent(newEvent);
      if (eventType === 'keyup') {
          const mouseLeaveEvent = new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: true
        });
        
        firstProcessCanvas.dispatchEvent(mouseLeaveEvent);
      }
    }
  }
}

