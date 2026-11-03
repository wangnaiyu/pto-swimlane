# v0.4.1

- 新入口自动建立浏览器授权，授权失效后可重新打开当前分析，继续使用已有文件。
- 各对话独立选择历史文件版本；下一次提问自动读取选择，无需复制同步口令。
- 远程 MCP 新增 get_analysis_session、focus_task 和 get_focus_status。精确定位任务后滚动、选中并展示详情，仅 applied 回执代表页面执行成功。
- 原有上传、查询、删除、旧 view 链接及手工同步兼容保留。
- package 与本地/远程 MCP 握手版本统一为 0.4.1，不含 local 后缀。

macOS 和 Windows ZIP 是远程服务接入安装器，不包含服务器运行时。已有用户通常无需重装，重新建立 MCP 连接即可发现新工具；新安装包说明已更新为自动授权与原生定位流程。Windows 安装器保留 File.Replace 的 NullString 修复。

测试使用明确标注的人工 L2。协议、Chromium、安装器夹具和包解压检查不能替代 Windows 原生 DPAPI/ACL、首次双击与同事端人工验收。本地 STDIO 保留四工具范围，本次原生定位接口属于远程 HTTP 服务。
