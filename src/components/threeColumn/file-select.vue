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
    <div class="file-select" @click="() => openSelectedFileWindow()">
      <d-tooltip :content="props.fileName">
        <div class="simple-com-file-name">{{ props.fileName }}</div>
      </d-tooltip>
      <div class="icon-line-height"><d-icon name="icon-sequence-new" class="simple-com-file-name-icon" size="16px"></d-icon></div>
    </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import type { IThreeColumnCtx, GraphType, ISwimGraphState } from './types';
import { ThreeColumnProvideKey, SwimGraphStateKey } from './types';
import { useViewServer } from '../../core/use-view-server';
import { ThreeColumnServer } from '../../../../../src/core/view/three-column-server';
const { server: threeColumnServer } = useViewServer<ThreeColumnServer>();
const { currentActiveBlock, BlockToGraphMap } = inject(
  ThreeColumnProvideKey,
) as IThreeColumnCtx;
const { baseChoose } = inject('runDataList');

const swimGraphState = inject(SwimGraphStateKey) as ISwimGraphState | undefined;

const props = defineProps({
  fileName: {
    type: String,
    default: '',
  },
  filePaths: {type: Object, default: {}},
});
function openSelectedFileWindow() {
  baseChoose.value = '';

  if (BlockToGraphMap[currentActiveBlock.value] === 'swimGraph' && swimGraphState?.detailsPanelExpanded?.value === true) {
    swimGraphState.detailsPanelExpanded.value = false;
  }

  if (BlockToGraphMap[currentActiveBlock.value] === 'editor') {
    threeColumnServer.singleSelectFile({graphType: BlockToGraphMap[currentActiveBlock.value]});
  } else {
    const {swimPath, comPath} = props.filePaths;
    threeColumnServer.selectFile({graphType: BlockToGraphMap[currentActiveBlock.value], options: {swimPath, comPath}});
  } 
};

</script>

<style scoped lang="scss">

.file-select {
    display: flex;
    align-items: center;
    justify-self: center;
    gap: 8px;
    cursor: pointer;
}

.simple-com-file-name{
    font-size: 14px;
    font-weight: 700;
    color: var(--devui-tooltip-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
    display: inline-block;
    word-break: keep-all;
    overflow-wrap: normal;
    hyphens: none;
}

.simple-com-file-name-icon{
    width: 16px;
    height: 16px;
    color: var(--devui-primary-text);
}

</style>