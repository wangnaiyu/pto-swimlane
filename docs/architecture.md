# 架构

泳道主体从 Toolkit 2.0 提取，保留 Vue 组件与交互。来源与文件映射见 `UPSTREAM.md`、`upstream-files.json`。

- 浏览器本地文件：File API → Worker → `src/parser` → 原泳道组件。
- 本地 STDIO MCP：`src/mcp` 在授权目录读取文件、建立不可变任务索引，通过 loopback HTTP 展示图。
- 远程 MCP：`src/remote` 认证身份、管理分析与上传，受限子进程解析，SQLite 保存元数据，私有目录保存源文件与快照；浏览器直接上传，不经模型搬运原文件。
- `analysis_session_id` 标识当前对话的选择，浏览器切换历史文件后由 MCP 在下一次提问时读取；它与 Cookie 和共享 view 状态分离。
- `view_session_id` 标识持久分析；`dataset_id` 标识固定版本；新流程由 selection_revision 和文件版本校验协调，旧 view-only 链接保留确认口令。

新增适配不代表整个 Toolkit 已迁移；外围源码/计算图跳转等控件不构成完整功能承诺。0.4.1 修改授权和选择流程，沿用解析器与泳道组件；是否线上生效以部署记录为准。

原生定位通道：MCP focus_task → remote/task-focus 内存命令 → 已授权可见页面领取 → 原泳道组件精确选中/滚动 → 页面回执 → get_focus_status。上下文、文件及版本在创建、领取、回执时校验；命令过期和服务重启均不重放。此通道不提供任意脚本、任意 URL 导航或全浏览器控制。
