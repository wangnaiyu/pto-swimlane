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
  <div v-if="switchLockInformationFlag" class="lockMenu" :style="{top: topX + 'px', left: leftX + 'px'}">
    <div class="pathway-lockout-area" @click="pathwayLockoutClick">
      <div class="pathway-lockout"> {{ isPathLockStatus || isClickedPath? $t('pathwayLockout') :$t('displayPathwayLock') }} </div>
      <div class="pathway-lockout-key"> Ctrl+L </div> 
    </div>
  </div>
</template>


<script setup>
import { ref, inject, computed, watch, onMounted, provide } from 'vue';
import { useI18n } from 'vue-i18n';

const {
  switchLockInformationFlag,
  isPathLockStatus,
  topX,
  leftX,
  canvasclickedEvent,
  isClickedPath,
  pathLockedEvent,
  pathLockedWrapId
} = inject('swimGraphThreadState');

const {
  pathLockedMethod
} = inject('swimGraphThreadMethods');

const { t: $t } = useI18n();

const pathwayLockoutClick = () => {
  isPathLockStatus.value = true;
  pathLockedEvent.value = canvasclickedEvent.value;
  pathLockedWrapId.value = pathLockedEvent.value?.args?.wrapId;
  switchLockInformationFlag.value = false;
  isClickedPath.value = false;
  pathLockedMethod(canvasclickedEvent.value);
};

</script>

<style lang="scss">
@import url("../css/swimGraph/Processes/lockmenu.css");

</style>