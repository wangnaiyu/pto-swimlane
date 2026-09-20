/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import type { ConnectChannel } from 'ext:/core/connector';
const CONNECTOR_READY_CHANNEL = 'standalone-unused-ready';

import { vscode } from './vscode';

type WebviewListener<T> = (message: T) => void;

/**
 * extension通信器（webview端使用）
 */
export class ExtensionConnector<T = unknown, R = T> {
  private listeners: WebviewListener<R>[] = [];

  constructor(private channel: ConnectChannel) {
    window.addEventListener('message', (event) => {
      const res = event.data;
      if (this.isExtensionReadyMessage(res)) {
        this.sendReadyMessage();
        return;
      }
      if (res.channel !== channel) {
        return;
      }
      this.listeners.forEach((callback) => {
        callback(res.data);
      });
    });
    this.sendReadyMessage();
  }

  public send(message: T): void {
    vscode.value.postMessage({ channel: this.channel, data: message });
  }

  public receive(callback: WebviewListener<R>): void {
    this.listeners.push(callback);
  }

  private isExtensionReadyMessage(message: { channel: ConnectChannel; data: unknown }): boolean {
    return message.channel === CONNECTOR_READY_CHANNEL && message.data === this.channel;
  }

  private sendReadyMessage(): void {
    vscode.value.postMessage({ channel: CONNECTOR_READY_CHANNEL, data: this.channel });
  }
}
