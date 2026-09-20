# 远程上传与分析契约

适用于服务基线 `0.4.0-local.22`。

## 边界与对象

本地 STDIO 保留原路径授权；远程 Streamable HTTP 仅从已认证身份取得 owner，文件经浏览器上传，不通过 MCP 传路径/base64。解析使用受限子进程，共用解析器与任务索引。传输连接与持久分析 view_session_id 分离。

| 对象 | 不变量 |
| --- | --- |
| owner | 每人独立账号，由认证取得；工具不能指定他人身份 |
| view_session_id | 对话绑定的分析；保存 version、generation、active_dataset_id、生命周期与固定到期时间 |
| upload_id | 一次上传尝试；pending→uploading→queued→parsing→ready，或failed/expired；旧generation不能覆盖新版 |
| dataset_id | 解析成功后的不可变快照；保存文件名、hash、来源与ns时间单位；换文件产生新ID |
| browser grant/session | 入口15分钟、单次兑换；浏览器授权24小时并受账号有效性约束；长期token不进链接 |

active提交与version递增为事务；失败保留旧active和明确的文件身份。每轮问答先取当前view、固定dataset_id完成全部查询，回答写文件名与dataset_id；结束前复查version，变化则说明对应旧版本或重新分析。

## 当前工具

| 工具 | 输入 | 行为 |
| --- | --- | --- |
| create_upload_session | 可选view_session_id | 新建分析或为原分析重签入口；恢复不重置上传、不消耗dataset配额 |
| get_view_session | view_session_id | 返回version、active身份、上传状态、view_url与标准Markdown reopen_link |
| get_upload_status | upload_id | 本人一次上传状态；不无限轮询 |
| list_view_sessions | 无 | 本人运行记录、状态和到期信息 |
| list_datasets | view_session_id | 本分析文件及active标识 |
| query_tasks | dataset_id、筛选、排序、分页 | 有界任务查询；limit≤200 |
| get_task | dataset_id、seqNo、taskId、方向与分页 | 标量args与有界依赖 |
| confirm_view_sync | view_session_id、sync_id | 仅确认用户发来的浏览器口令；绑定当前对话，不从文件内容推断口令 |
| close_view_session | view_session_id | 停用分析，保留数据与原到期时间；忙碌分析受保护，可恢复 |
| delete_dataset | dataset_id | 仅用户明确选择的非active文件；配额满时不得自动删除 |
| delete_view_session | view_session_id | 删除本分析及源文件/快照/缓存；不作为关闭页面或重启操作 |

无数据时普通分析请求应调用create_upload_session并实际打开返回入口，答案保留标准Markdown重开链接。多候选分析才请求用户选择；不得把历史验收view当作所有新任务默认值。无需用户额外报告“上传好了”，后续提问时检查view即可。

## HTTP、安全与恢复

浏览器首次入口的短期grant位于fragment，脚本读取后清除；兑换为HttpOnly、SameSite=Strict、HTTPS Secure、应用API路径内的cookie。修改请求校验精确Origin与CSRF，拒绝通配CORS；MCP每次独立认证。错误不泄漏存储绝对路径、token或原始文件正文，文件字段只作不可信文本。

账号停用或重置使旧token与浏览器授权失效。恢复账号保持owner，浏览器重新授权；重置不重建分析。上传解析忙碌时不允许停用/删除；浏览器当前分析也受保护。关闭标签页不删除数据，重开沿用view并恢复原图。close_view_session 将分析设为停用；需先在另一分析的“运行记录”恢复，再重签入口。到期后不可恢复源文件。

同步口令15分钟有效，绑定owner/view/browser；请求hash持久化，刷新或服务重启可恢复待确认状态；换浏览器授权后旧口令失效。网页显示“已连接Agent”表示确认记录，不是实时在线状态，不自动向对话发消息。

服务重启保留身份、view和成功dataset；未完成上传/解析按恢复规则失败，不允许旧作业抢占。快照可重载查询缓存。结果加载提供进度、空闲/总超时和手动重试；新结果完整成功后才替换原图。

## 已确认运营政策

| 项目 | 当前规则 |
| --- | --- |
| 身份 | 每人永久可停用token；macOS Keychain保存，http_headers_helper读取；管理员可重置 |
| 分析数量 | 不设view数量上限 |
| 文件版本 | 每个view最多4份dataset，跨分析独立计算 |
| 保留 | 创建后固定7天；使用、停用、恢复不延长；到期删除，不归档、不备份 |
| 单文件 | 80,000,000字节 |
| 存储 | 全站8GiB；元数据/日志还需额外空间 |
| 调度 | trace+topo合计≤30,000,000字节最多5解析；更大输入FIFO排队独占；同owner最多1解析 |
| 容量边界 | 小范围试用，不保证任意复杂文件均成功 |

测试默认值不等于服务运营政策。

