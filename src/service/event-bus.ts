/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
/* 
  使用说明：
  1、初始化：全局只能在一个地方初始化，否则会出现不同实例，导致事件无法被触发等情况
    EventBus.init();

  2、监听事件：
    const listener1 = (args) => {}; // args为事件触发时传递给监听器的参数
    const listener2 = (args) => {}; // args为事件触发时传递给监听器的参数
    // 事件可被监听一次或多次，当事件触发时，所有监听器均会执行
    window.ascEventBus.on('change', listener1);
    window.ascEventBus.on('change', listener2);

  3、触发事件：
    window.ascEventBus.emit('change', args); // args为事件触发时传递给监听器的参数

  4、移除某个事件的某个监听器：
    window.ascEventBus.remove('change', listener1); // 移除change事件的listener1监听器

  5、移除某个事件的所有监听器：
    window.ascEventBus.delete('change'); // 移除change事件的所有监听器

  6、清空所有监听器：
    window.ascEventBus.clear();
*/

class EventBus {
  /* 
    数据结构：{ change: [listener1, listener2] }
  */
  private _eventBus = new Map();

  public static init() {
    (window as any).ascEventBus = new EventBus();
  }

  /* 触发事件 */
  emit = (key: string, args: any) => {
    if (this._eventBus.has(key)) {
      this._eventBus.get(key).forEach((fn) => {
        let timer: ReturnType<typeof setTimeout>;
        timer = setTimeout(() => {
          fn.call(this, args);
          timer && clearTimeout(timer);
        });
      });
    }
  };

  /* 监听事件 */
  on = (key: string, listener: Function) => {
    if (this._eventBus.has(key)) {
      this._eventBus.get(key).push(listener);
    } else {
      this._eventBus.set(key, [listener]);
    }
  };

  /* 移除某个事件的某个监听器 */
  remove = (key: string, listener: Function) => {
    if (this._eventBus.has(key)) {
      const index = this._eventBus.get(key).indexOf(listener);
      index !== -1 && this._eventBus.get(key).splice(index, 1);
    }
  };

  /* 删除某个事件的所有监听器 */
  delete = (key: string) => {
    if (this._eventBus.has(key)) {
      this._eventBus.delete(key);
    }
  };

  /* 清空所有监听器 */
  clear = () => {
    this._eventBus.clear();
  };
}

export default EventBus;
