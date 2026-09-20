/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import type { RequestOptions, RequestMessage, ResponseMessage } from 'ext:/core/request-server';

import { deepToRaw } from '@/utils/reactive';

import { ExtensionConnector } from './connector';

export type { RequestOptions };

interface ExtensionRequest {
  /** 发送请求 */
  post: <Data, Res>(api: string, params: Data, options?: RequestOptions) => Promise<Res>;
}

interface PendingRequest {
  success: (value: any) => void;
  error: (statusCode: ResponseMessage['statusCode'], error: Error) => void;
  params: unknown;
  options: Required<RequestOptions>;
  api: string;
  requestTimestamp: number;
}

/** 请求并发数量 */
const REQUEST_CONCURRENCY = 5;

/** 默认配置 */
const DEFAULT_REQUEST_OPTIONS: Required<RequestOptions> = {
  timeout: 60000, // 默认60秒
  useCustomErrorHandler: false,
};

/**
 * 请求服务，webview使用
 * @returns { ExtensionRequest }
 */
class ExtensionRequestImpl implements ExtensionRequest {
  private connector = new ExtensionConnector<RequestMessage, ResponseMessage>('request');

  /** 稍后发起的请求 */
  private holdingRequests: (() => void)[] = [];

  /** 等待响应的请求 */
  private pendingRequests = new Map<string, PendingRequest>();

  constructor() {
    this.listenToConnectorReceive();
  }

  public post<Data, Res>(api: string, params: Data, options?: RequestOptions): Promise<Res> {
    const optionsWithDefault = getOptionsWithDefault(options);
    if (this.pendingRequests.size >= REQUEST_CONCURRENCY) {
      return this.executeRequestLater(api, params, optionsWithDefault);
    } else {
      return this.executeRequest(api, params, optionsWithDefault);
    }
  }

  /**
   * 监听消息返回
   */
  private listenToConnectorReceive() {
    this.connector.receive(({ requestId, statusCode, data, error }) => {
      const pendingRequest = this.pendingRequests.get(requestId);
      if (!pendingRequest) {
        return;
      }
      if (import.meta.env.DEV) {
        console.debug(
          'API:',
          pendingRequest.api,
          '状态码:',
          statusCode,
          '开始时间:',
          pendingRequest.requestTimestamp,
          '响应时间:',
          Date.now() - pendingRequest.requestTimestamp,
          '内容:',
          { request: pendingRequest.params, response: statusCode === 200 ? data : error },
        );
      }
      if (statusCode === 200) {
        pendingRequest.success(data);
      } else {
        const errorInstance = error ? recoverFromMessageError(error) : new Error('unknown error');
        pendingRequest.error(statusCode, errorInstance);
      }
      this.pendingRequests.delete(requestId);
      this.holdingRequests.shift()?.();
    });
  }

  /**
   * 稍后执行数据请求
   */
  private executeRequestLater<Data, Res>(api: string, params: Data, options: Required<RequestOptions>): Promise<Res> {
    return new Promise((resolve) => {
      this.holdingRequests.push(() => resolve(this.executeRequest(api, params, options)));
    });
  }

  /**
   * 执行数据请求
   */
  private executeRequest<Data, Res>(api: string, params: Data, options: Required<RequestOptions>): Promise<Res> {
    const requestId = `${api}-${window.crypto.randomUUID()}`;
    this.connector.send({ api, requestId, data: deepToRaw(params), options });
    return this.waitForResponse<Data, Res>(api, requestId, params, options);
  }

  /**
   * 等待接口响应
   * @param requestId 请求ID
   * @param options 请求选项
   * @returns 响应
   */
  private waitForResponse<Data, Res>(api: string, requestId: string, params: Data, options: Required<RequestOptions>): Promise<Res> {
    return new Promise<Res>((resolve, reject) => {
      // 请求超时
      const requestTimeout = setTimeout(() => {
        reject(new Error(`request:${requestId} timeout`));
        this.pendingRequests.delete(requestId);
      }, options.timeout);

      this.pendingRequests.set(requestId, {
        success: makeSuccessHandler(resolve, requestTimeout),
        error: makeErrorHandler(reject, requestTimeout, options),
        params,
        options,
        api,
        requestTimestamp: Date.now(),
      });
    });
  }
}

export const request = new ExtensionRequestImpl();

function recoverFromMessageError(messageError: NonNullable<ResponseMessage['error']>): Error {
  const error = new Error(messageError.message);
  error.name = messageError.name;
  error.stack = messageError.stack;
  return error;
}

function makeSuccessHandler<T extends (value: any) => void>(resolve: T, requestTimeout: ReturnType<typeof setTimeout>): T {
  return ((...args) => {
    clearTimeout(requestTimeout);
    resolve(...args);
  }) as T;
}

function makeErrorHandler(
  reject: (reason: unknown) => void,
  requestTimeout: ReturnType<typeof setTimeout>,
  options: Required<RequestOptions>,
): PendingRequest['error'] {
  return (statusCode, error) => {
    clearTimeout(requestTimeout);
    if (options.useCustomErrorHandler) {
      reject(error);
    } else {
      // server端唤起vscode错误提示
    }
  };
}

function getOptionsWithDefault(options?: RequestOptions): Required<RequestOptions> {
  return { ...DEFAULT_REQUEST_OPTIONS, ...options };
}
