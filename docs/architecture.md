# 架构

泳道主体从 Toolkit 2.0 提取，保留 Vue 组件与交互。来源与文件映射见 `UPSTREAM.md`、`upstream-files.json`。

- 浏览器本地文件：File API → Worker → `src/parser` → 原泳道组件。
- 本地 STDIO MCP：`src/mcp` 在授权目录读取文件、建立不可变任务索引，通过 loopback HTTP 展示图。
- 远程 MCP：`src/remote` 认证身份、管理分析与上传，受限子进程解析，SQLite 保存元数据，私有目录保存源文件与快照；浏览器直接上传，不经模型搬运原文件。
- `view_session_id` 标识持久分析；`dataset_id` 标识固定版本；换文件与 Agent 同步由版本和确认口令协调。

新增适配不代表整个 Toolkit 已迁移；外围源码/计算图跳转等控件不构成完整功能承诺。发布整理未修改解析器、页面或线上服务。
