import Modal from 'vue-devui/modal';
import 'vue-devui/modal/style.css';
import Form from 'vue-devui/form';
import 'vue-devui/form/style.css';
import Radio from 'vue-devui/radio';
import 'vue-devui/radio/style.css';
/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import type {App as VueApp} from 'vue';
import EventBus from './service/event-bus';
import './style.scss';
import Tooltip from 'vue-devui/tooltip';
import 'vue-devui/tooltip/style.css';
import Icon from 'vue-devui/icon';
import 'vue-devui/icon/style.css';
import CategorySearch from 'vue-devui/category-search';
import 'vue-devui/category-search/style.css';
import Tabs from 'vue-devui/tabs';
import 'vue-devui/tabs/style.css';
import Search from 'vue-devui/search';
import 'vue-devui/search/style.css';
import Input from 'vue-devui/input';
import 'vue-devui/input/style.css';
import Slider from 'vue-devui/slider';
import 'vue-devui/slider/style.css';
import Select from 'vue-devui/select';
import 'vue-devui/select/style.css';
import Button from 'vue-devui/button';
import 'vue-devui/button/style.css';
import Badge from 'vue-devui/badge';
import 'vue-devui/badge/style.css';
import Message from 'vue-devui/message';
import 'vue-devui/message/style.css';
import InputNumber from 'vue-devui/input-number';
import 'vue-devui/input-number/style.css';
import Table from 'vue-devui/table';
import 'vue-devui/table/style.css';
import Popover from 'vue-devui/popover';
import 'vue-devui/popover/style.css';
import Loading from 'vue-devui/loading';
import 'vue-devui/loading/style.css';
import Switch from 'vue-devui/switch';
import 'vue-devui/switch/style.css';
import DataGrid from 'vue-devui/data-grid';
import 'vue-devui/data-grid/style.css';
import Echarts from 'vue-devui/echarts';
import SwimGraph from './components/swimGraph/swimGraphComplete.vue';
export function loadGraph(app:VueApp){
EventBus.init();
app.use(Tooltip);
app.use(Icon);
app.use(CategorySearch);
app.use(Tabs);
app.use(Search);
app.use(Input);
app.use(Slider);
app.use(Select);
app.use(Button);
app.use(Badge);
app.use(Message);
app.use(InputNumber);
app.use(Table);
app.use(Popover);
app.use(Loading);
app.use(Switch);
app.use(DataGrid);
app.use(Echarts);
app.use(Modal);
app.use(Form);
app.use(Radio);

return SwimGraph;
}
