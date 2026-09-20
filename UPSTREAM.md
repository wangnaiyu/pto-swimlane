# 上游来源

- repository: https://gitcode.com/cann/pypto-vscode
- commit: 2f8d51f6621a21bcf6e1c272e8e634ce6f64c996
- 提取时间: 2026-09-14
- LICENSE 和第三方声明随工程保留。
- 原始样例留在外部 PTO-TestData，本工程不携带。
- src/parser/process.ts 提取自 src/process.ts 的纯解析部分；排除磁盘、缓存、VS Code imports，替换错误文案函数。color-list/defaultColor 原样复用。
- src/components/swimGraph 保留上游 UI；移除宿主专属 Navbar，添加独立文件入口。
- src/core/use-view-server.ts、state.ts 改为浏览器适配。main.ts 移除 extension handshake 与 Monaco worker 初始化。

- 补充修复：calculateDependenciesBytopo 跳过无任务键 AICPU 标记；原 ready 常量本地化；导出 dataUrl 初始值改为空字符串。完整源码 hash 清单见 upstream-files.json。
- 共享静态资源来自 media/vue-project/src/static-assets，图标字体来自 @devui-design/icons。上游源码、许可与第三方声明均未改写来源身份。

## Batch B 适配

新增 src/mcp、bin 和 MCP 测试，继续复用原解析器。App.vue 添加数据集链接接入及来源标签，提取 hash 已更新。上游原始 hash 和许可不变。tests/fixtures/L2-synthetic 为独立手工构造，非真实记录。

## Batch B.1 正确性适配（2026-09-14）

修复提取副本的跨数据集泳道缓存、合并行映射和利用率统计；新增本地统计 helper。原始事件时间及上游来源哈希不变，108 份映射中累计 10 份适配。差异记录见本文件及哈希映射。

## Batch D 本机候选适配（2026-09-15）

App.vue 增加服务器上传和稳定 view 跟随，原顶栏与泳道保留。详情移除五组隐藏静态占位，保留真实 args；operand-hint 用文本渲染。普通和固定泳道 tooltip 的源字段做 HTML 转义，防止上传内容注入。已同步相应 extractedSha256；固定来源 2f8d51f6621a21bcf6e1c272e8e634ce6f64c996 的全部108项 upstreamSha256 核对一致，上游镜像未修改。新增 remote/state/files/http/parse-child、remote-client/safe-text 是本地适配，不冒充上游源码。

## 公开分发整理（0.4.0）

仅整理公开文档、可复用脚本与安装分发；服务运行基线仍为0.4.0-local.22。提取源码和原始来源哈希保持。环境专属诊断、部署验收材料留在本地私有记录，不随公开仓库分发。
