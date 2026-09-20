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
    <div>
        <d-modal v-model="modalVisible" :title="$t('iconExport')" class="export-modal-containner" :class="{ 'export-modal-containner-local': !exportFoldVisible}"
            :close-on-click-overlay="false">
            <div class="export-title">{{ $t('exportPosition') }}</div>
            <d-radio-group class="mt10" direction="row" v-model="exportRadioItem" @change="groupRadioChange">
                <d-radio v-for="item in exportRadioList" :key="item.name" :value="item.value">{{ item.name }}</d-radio>
            </d-radio-group>
            <div class="mt20 export-fold" v-if="exportFoldVisible">
                <d-form ref="formRef" class="export-form-width" layout="vertical" :data="formData" :rules="rules" :pop-position="['top']">
                    <d-form-item field="filePath" :label="$t('exportFold')">
                        <d-input class="label-input mt10" v-model="formData.filePath" :placeholder="$t('exportPathPlace')">
                            <template #append>
                                <d-button variant="solid" @click="setExportFold()"> {{ $t('setExportFold') }}</d-button>
                            </template>
                        </d-input>
                    </d-form-item>
                </d-form>
            </div>
            <template #footer>
                <d-modal-footer class="modal-button mt10">
                    <d-button variant="solid" color='secondary' @click="exportCancel()">{{ $t('no') }}</d-button>
                    <d-tooltip :content="disabledTooltipContent" v-if="isExportDisabled">
                        <d-button variant="solid" color='primary' @click="exportConfirm()" :disabled="isExportDisabled">{{ $t('exportImageGraph')}}</d-button>
                    </d-tooltip>
                    <d-button v-else variant="solid" color='primary' @click="exportConfirm()">{{ $t('exportImageGraph')}}</d-button>
                </d-modal-footer>
            </template>
        </d-modal>
        <div v-if="showModalOverlay" class="export-modal-overlay"></div>
    </div>
</template>

<script setup>
import { useViewServer } from '../../core/use-view-server';
import { Message } from 'vue-devui/message';
import { ref, watch, onMounted, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
const { t: $t } = useI18n();
const { server } = useViewServer();
const exportRadioList = [{ name: $t('exportLocal'), value: 'local' }, { name: 'Linux', value: 'linux' }];
let exportRadioItem = ref('local');
const modalVisible = ref(false);
const exportFoldVisible = ref(false);
const showModalOverlay = ref(false);
const formRef = ref(null);
const formData = reactive({
    filePath: '',
});
let saveFileResultMessage = ref(null);
const checkFilePath = async (rule, value, callback) => {
    if (!value) {
        return callback(new Error($t('exportPathNotNull')));
    }
    saveFileResultMessage.value = null;
    try {
        await server.checkFilePath({ filePath: value });
        if (saveFileResultMessage.value && !saveFileResultMessage.value.result) {
            return callback(new Error(saveFileResultMessage.value.message));
        } else {
            return callback();
        }
    } catch (error) {
        return callback($t('imageExportErrorInfo'));
    }
};
const rules = {
    filePath: [
        { validator: checkFilePath, trigger: 'blur' }
    ]
};
const isExportDisabled = computed(() => {
    const isEmptyPath = exportFoldVisible.value && (!formData.filePath || formData.filePath.trim() === '');
    const hasSaveError = saveFileResultMessage.value && !saveFileResultMessage.value.result;
    return isEmptyPath || hasSaveError;
});
const disabledTooltipContent = computed(() => {
    const isEmptyPath = exportFoldVisible.value && (!formData.filePath || formData.filePath.trim() === '');
    if (isEmptyPath) {
        return $t('exportPathNotNull');
    } else {
        return $t('exportInvalidFilePath');
    }
});
const props = defineProps({
    dataUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  }
});

const pureFileName = computed(() => props.fileName.endsWith('svg') ? (props.fileName || 'com-graph-export.svg') : (props.fileName+'.png' || 'swim-graph-export.png'));

function setupImageWatchers() {
    watch(server.CheckSysResult, (newValue) => {
        if (newValue.sustem === 'windows') {
            server.saveFile({ dataUrl: props.dataUrl, fileName: pureFileName.value });
        } else {
            modalVisible.value = true;
            exportRadioItem.value = 'local';
            formData.filePath = '';
            exportFoldVisible.value = false;
        }
    });
    watch(server.SaveDirPath, (newValue) => {
        showModalOverlay.value = false;
        if (newValue.dir) {
            formData.filePath = newValue.dir;
        }
    });
    watch(server.SaveFileResult, (newValue) => {
        if (newValue.result) {
            const fileNameInfo = newValue.fileName;
            window.ascEventBus.on('message_notice', onMessageNotice('success', $t('imageExportSuccessInfo', { fileNameInfo })));
            modalVisible.value = false;
            saveFileResultMessage.value = null;
        } else {
            window.ascEventBus.on('message_notice', onMessageNotice('error', newValue.message));
        }
    });
    watch(server.CheckFilePathResult, (newValue) => {
        if (!newValue.result) {
            saveFileResultMessage.value = newValue;
        }
    });
}

function onMessageNotice(type, text) {
    Message({
        type,
        message: text
    });
};
const exportCancel = () => {
    modalVisible.value = false;
    saveFileResultMessage.value = null;
};
const exportConfirm = () => {
    if (exportRadioItem.value === 'local') {
        const link = document.createElement('a');
        link.download = pureFileName.value;
        link.href = props.dataUrl;
        link.click();
        modalVisible.value = false;
        saveFileResultMessage.value = null;
    } else {
        saveFileResultMessage.value = null;
        server.saveFile({ dataUrl: props.dataUrl, filePath: formData.filePath + `/${pureFileName.value}` });
    }
};
const setExportFold = () => {
    showModalOverlay.value = true;
    server.setSaveDir();
};
const groupRadioChange = (item) => {
    exportFoldVisible.value = item === 'linux';
    saveFileResultMessage.value = null;
};
onMounted(() => {
    setupImageWatchers();
});
</script>
<style lang="scss">
@import url("./exportModal.css");
</style>
<style scoped lang="scss">
.label-input {
    :deep() {
        .devui-input__wrapper {
            border: none;
        }

        .devui-input-slot__prepend,
        .devui-input-slot__append {
            border: none;
            border-left: 1px solid var(--devui-form-control-line);
        }
        .devui-input__wrapper.devui-input--glow-style:not(.devui-input--error):not(.devui-input--disabled):not(.devui-input--focus):hover,
        .devui-input--focus.devui-input--glow-style:not(.devui-input--error) {
            box-shadow: none;
            border: none;
        }
    }
}
.export-fold {
    :deep() {
        .devui-form__label-span {
            color: var(--devui-swim-text-title);
            font-size: 14px;
        }
        .devui-form__item--vertical {
            margin-bottom: 0;
        }
    }
}
</style>