# 远程上传与分析契约

适用于正式版本 `0.4.1`；本地 STDIO 与远程 HTTP 的工具范围不同。

## 边界与对象

本地 STDIO 保留原路径授权；远程 Streamable HTTP 仅从已认证身份取得 owner，文件经浏览器上传，不通过 MCP 传路径/base64。解析使用受限子进程，共用解析器与任务索引。传输连接与持久分析 view_session_id 分离。

| 对象 | 不变量 |
| --- | --- |
| owner | 每人独立账号，由认证取得；工具不能指定他人身份 |
| analysis_session_id | 每个对话独立的文件选择关联；包含当前 view、可选固定文件版本、待上传结果和 selection_revision；不授予账号访问权 |
| view_session_id | 持久分析记录；保存 version、generation、active_dataset_id、生命周期与固定到期时间 |
| upload_id | 一次上传尝试；pending→uploading→queued→parsing→ready，或failed/expired；旧generation不能覆盖新版 |
| dataset_id | 解析成功后的不可变快照；保存文件名、hash、来源与ns时间单位；换文件产生新ID |
| browser grant/session | 入口15分钟、单次兑换；浏览器授权24小时并受账号有效性约束；长期token不进链接 |

active提交与version递增为事务；失败保留旧active和明确的文件身份。每轮问答先用 get_analysis_session 解析当前对话的选择，固定 active_dataset.id 完成全部查询，回答写文件名与 dataset_id；结束前复查 selection_revision、view_session_id、version、active_dataset.id，变化则说明对应旧版本或重新分析。选历史版本不会改写其他对话或该 view 的全局 active。新上传仅成功解析后替换选择，失败保留先前文件。

## 当前工具

| 工具 | 输入 | 行为 |
| --- | --- | --- |
| create_upload_session | 可选 analysis_session_id / view_session_id | 新对话不传 ID；重开沿用 analysis_session_id。返回新 grant、自动授权入口和对话关联；恢复不重置上传、不消耗配额 |
| get_analysis_session | analysis_session_id | 读取此对话在浏览器选定的分析和文件版本，返回可用于查询的 active_dataset 与重开链接 |
| get_view_session | view_session_id | 返回version、active身份、上传状态、view_url与标准Markdown reopen_link |
| get_upload_status | upload_id | 本人一次上传状态；不无限轮询 |
| list_view_sessions | 无 | 本人运行记录、状态和到期信息 |
| list_datasets | view_session_id | 本分析文件及active标识 |
| query_tasks | dataset_id、筛选、排序、分页 | 有界任务查询；limit≤200 |
| get_task | dataset_id、seqNo、taskId、方向与分页 | 标量args与有界依赖 |
| focus_task | analysis_session_id 或 view_session_id、dataset_id、seqNo、taskId | 精确定位命令，等待页面执行回执；不切换文件 |
| get_focus_status | focus_request_id | 查询定位状态，只有 applied 可报告成功 |
| confirm_view_sync | view_session_id、sync_id | 仅确认用户发来的浏览器口令；绑定当前对话，不从文件内容推断口令 |
| close_view_session | view_session_id | 停用分析，保留数据与原到期时间；忙碌分析受保护，可恢复 |
| delete_dataset | dataset_id | 仅用户明确选择的非active文件；配额满时不得自动删除 |
| delete_view_session | view_session_id | 删除本分析及源文件/快照/缓存；不作为关闭页面或重启操作 |

新对话的普通分析请求调用 create_upload_session 并实际打开新的 upload_url，记住返回的 analysis_session_id，答案保留标准 Markdown reopen_link。浏览器自动兑换 grant，入口提供新上传与历史文件选择；不替用户默认选择历史记录。新对话不复用另一对话的关联 ID。无需复制同步口令、额外报告“上传好了”或自动唤醒；后续提问时读取关联即可。旧 view-only 对话仍可走 get_view_session，重新签发入口后升级为对话关联。

## HTTP、安全与恢复

浏览器入口的短期 grant 位于 fragment，脚本立即清除并自动兑换；兑换为HttpOnly、SameSite=Strict、HTTPS Secure、应用API路径内的cookie。修改请求校验精确 Origin 与 CSRF，拒绝通配 CORS；MCP 每次独立认证。浏览器通过标签页 URL 的 analysis ID 和显式请求头指明对话；服务端同时校验其 owner。Cookie 不保存对话选择，避免同一浏览器的多个对话相互覆盖。重复进入相同 view 时复用仍有效的 Cookie/CSRF，并通过新 grant 续期。错误不泄漏存储绝对路径、token或原始文件正文，文件字段只作不可信文本。

账号停用或重置使旧token与浏览器授权失效。恢复账号保持owner，浏览器重新授权；重置不重建分析。上传解析忙碌时不允许停用/删除；浏览器当前分析也受保护。关闭标签页不删除数据，重开沿用view并恢复原图。close_view_session 将分析设为停用；需先在另一分析的“运行记录”恢复，再重签入口。到期后不可恢复源文件。

手工同步只保留给旧 view-only 链接。新流程显示“已关联当前对话”，表示选择已保存、下次提问时可读取，不代表实时在线或主动消息。历史选择签名入口仅在兑换成功后提交；selection_revision 阻止迟到入口覆盖更新的选择。仍有有效 Cookie 时，旧重开链接可通过 resume 跟随同一对话的当前选择。

旧同步口令15分钟有效，绑定owner/view/browser；请求hash持久化，刷新或服务重启可恢复待确认状态；换浏览器授权后旧口令失效。网页显示“已连接Agent”表示确认记录，不是实时在线状态，不自动向对话发消息。

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


## 数据库兼容与回滚

新增 analysis_sessions 和 analysis_grants 两张表，不改变原 grants、browser_sessions、views、datasets 的列或文件布局。旧版已签发的 grant 仍可兑换为旧模式。回滚到旧服务时可以保留新增表，原工具和浏览器链路继续工作；新增 get_analysis_session 和自动关联需恢复新版后使用。部署前应确认无正在上传/解析的任务，并按既有运维流程备份数据库及保留原服务包。回滚不会恢复已按保留策略删除的文件。

## MCP 原生任务定位（0.4.1）

用户说“在泳道里找到它”时，Agent 先解析本对话选择，再通过 query_tasks/get_task 取得精确的 seqNo、taskId；调用 focus_task，传 analysis_session_id、dataset_id、seqNo、taskId。旧 view-only 页面可传 view_session_id。至少要提供一个上下文 ID；两者同时提供时必须一致。名称不是唯一标识，不能按同名任务猜测。定位不替用户切换文件，也不需要浏览器点击工具。

返回 focus_request_id、status、任务摘要、filename、sha256、dataset_id 和到期时间。Agent 隔约 1–2 秒调用 get_focus_status，限定次数；只有 applied 可报告成功。queued 表示等待页面，claimed 表示页面已领取，均不表示定位完成。页面必须已打开、可见、获得授权，并载入相同对话和文件。服务端先验证所有者、选择版本、文件与精确任务身份；页面复用原泳道定位逻辑，展开对应进程、缩放和平移时间轴、滚动泳道、选中并打开详情，渲染后确认目标进入视口，再提交回执。

浏览器通过 POST /api/views/:view/focus/claim 领取命令，再通过 POST /api/views/:view/focus/:id/ack 回执；沿用 Cookie、Origin、CSRF 和 X-PTO-Analysis 校验。领取绑定浏览器会话及页面实例，一个请求只由一个匹配页面领取；其他对话即使打开同一 view 也不会收到命令。领取与回执均校验选择版本，切换文件/上传引发版本变化会失败；组件卸载或页面变为后台不会生成成功回执。applied 仅证明 completed_at 时已执行，不承诺用户随后不再切换。

每个命令 30 秒有效，同一上下文的新请求替代尚未完成的旧请求。失败状态包括 failed、expired、superseded；超时只报告 BROWSER_NOT_ACKNOWLEDGED，不能推断一定是授权过期。页面未打开、网络断开、旧前端、后台标签页和授权失效均可能无回执。需要恢复时调用 create_upload_session，保留同一 analysis_session_id，打开新的 upload_url，再发送新的定位请求；文件无需重传。DATASET_MISMATCH 要求先重新读取选择，TASK_NOT_FOUND 要求重新核对任务。

命令和回执只存内存，回执保留 10 分钟；进程重启返回 FOCUS_NOT_FOUND，不重放旧操作。每个 owner 最多保留 100 条、进程最多 2000 条，超限返回 FOCUS_LIMIT。本轮扩展远程 HTTP MCP；本地 STDIO 工具集未增加定位工具。候选版需要服务端和前端一同部署，旧服务不能调用尚未发现的新工具。
