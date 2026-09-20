<!--
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 -->
<template>
  <div 
    class="pinned-thread-label"
    :style="{ height: getThreadHeight(pinnedThread.processKey, pinnedThread.thread.tid, lane2line, layout, pinnedThread.thread.isCounter) + 'px' }"
  >
    <!-- 左侧常驻的取消置顶图标 -->
    <d-tooltip :content="$t('unpinThread')" position="right">
      <d-icon
        name="icon-pushpin-fill"
        class="unpin-icon"
        @click="handleUnpin"
      >
      </d-icon>
    </d-tooltip>
    
    <!-- 线程名称 -->
    <span class="thread-name">{{ getDisplayThreadName(pinnedThread.thread) || pinnedThread.threadKey }}</span>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { getThreadHeight, getDisplayThreadName } from '../swimGraphUtils';

const { t: $t } = useI18n();
const props = defineProps({
  pinnedThread: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  }
});

const { layout, lane2line } = inject('swimGraphState');
const { unpinThread } = inject('swimGraphPinnedState');

const handleUnpin = () => {
  unpinThread(props.pinnedThread.processKey, props.pinnedThread.threadKey);
};
</script>

<style scoped>
.pinned-thread-label {
  padding-left: 36px;
  display: flex;
  align-items: center;
  line-height: 20px;
  position: relative;
  color: var(--devui-thread-text);
  border-bottom: 1px solid var(--devui-swim-split-line);
  border-right: 1px solid var(--devui-swim-split-line);
}

.unpin-icon {
  position: absolute;
  right: 223px;
  z-index: 1;
  cursor: pointer;
  color: var(--devui-primary-button-bg);
}

.unpin-icon:hover {
  color: var(--devui-primary-button-hover-bg);
}

.thread-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-size: 13px;
  font-weight: 400;
}
</style>
