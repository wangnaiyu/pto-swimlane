# PTO Swimlane

在 Codex 中上传 PyPTO 泳道文件、查询任务耗时和依赖，并结合泳道图分析性能。当前面向小范围试用。

**使用前提：已安装支持 `http_headers_helper` 的 Codex 桌面端，并已取得个人 token。**

| 系统 | 安装包 | 解压后运行 |
| --- | --- | --- |
| macOS | [下载 macOS ZIP](https://github.com/wangnaiyu/pto-swimlane/releases/latest/download/PTO-Swimlane-MCP-macOS.zip) | `setup-pto-swimlane-macos.command` |
| Windows | [下载 Windows ZIP](https://github.com/wangnaiyu/pto-swimlane/releases/latest/download/PTO-Swimlane-MCP-Windows.zip) | `setup-pto-swimlane-windows.cmd` |

[发布记录与 SHA-256](https://github.com/wangnaiyu/pto-swimlane/releases/latest) · [macOS 详细说明](scripts/macos/README.md) · [Windows 详细说明](scripts/windows/README.md)

## 安装

**macOS：** 解压 ZIP，双击 `.command`，粘贴个人 token（输入不显示字符）。看到「安装完成」后，用 ⌘Q 完全退出 Codex 并重开。若提示无法验证开发者，确认下载来源后，到「系统设置 → 隐私与安全性 → 仍要打开」，按系统提示确认。参见 [Apple 官方说明](https://support.apple.com/102445)。

**Windows：** 右键 ZIP →「全部解压缩」，双击 `.cmd`（不是 `.ps1`），按提示输入个人 token。看到绿色 `Installed` 后完全退出并重开 Codex。若 SmartScreen 提示未识别应用，确认来源后，在界面提供该选项时选择「更多信息 → 仍要运行」；企业策略阻止时交由 IT 审核。参见 [Microsoft 官方说明](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)。不需要管理员权限或另装 Node/Python。

## 开始分析

以下流程适用于远程服务 `0.4.1`；已安装的个人 MCP 凭据继续使用。

1. 在任意新对话输入：**使用 pto-swimlane-mcp 分析性能**。
2. Agent 打开新的入口，页面自动建立浏览器授权，无需额外点击进入或管理授权有效期。
3. 点击「选择文件」上传 `merged_swimlane.json`（可附同组 `dyn_topo.txt`），或点击「使用历史文件」，在运行记录中选择「使用此文件」。已有图时从「运行记录」切换文件。
4. 选好后直接回到发起分析的对话提问：**耗时最长的任务是哪个？** 不需要复制同步口令或发送“上传好了”。
5. 找到目标后说：**在泳道里找到它**。保持对应泳道页面打开且可见，Agent 通过 MCP 让页面选中、滚动并打开详情，收到执行回执后确认结果；无需另配浏览器操作工具。
6. 每个对话独立记住文件选择；Agent 在收到问题时读取最新选择。网页操作不会主动唤醒 Agent。

浏览器授权保持 24 小时有效；从 MCP 重新打开时自动建立新的授权。直接打开无授权的收藏链接时，可在任意对话再次发起性能分析并选择历史文件。分析创建后仍固定保留 7 天，重新授权不延长保留期；过期文件不能恢复。账号被停用或凭据失效仍需处理账号问题。

文件会上传到服务端，请只使用获准上传的数据。个人 token 与验证数据由提供者另行私发，安装包不包含它们。旧的仅含 view 的链接保留手工「重新同步」兼容入口。

## 常见问题

- **打开了记事本 / 文件无法运行：** 下载对应系统的包，全部解压后运行上表中的入口文件。
- **token 被拒绝：** 请提供者确认 token 是否有效或已停用；不要在聊天中粘贴 token。
- **已有同名服务配置冲突：** 安装器会停止并保留原配置。参照对应系统说明只处理泳道服务配置，勿删除整个配置文件。
- **安装后配置尚未生效：** 完全退出 Codex 后重开；使用自定义 `CODEX_HOME` 时，安装器与桌面端须使用同一目录。
- **旧 Windows 包提示 Replace 路径不合法：** 本包保留 windows-2 修复，可直接用新包重试，无需换 token 或删除原配置。

## 源码与许可

[开发与测试](docs/development.md) · [架构](docs/architecture.md) · [本地 MCP](docs/mcp.md) · [远程契约](docs/remote-mcp-contract.md) · [来源与修改](UPSTREAM.md)

`0.4.1` 增加自动浏览器授权、对话文件关联和 MCP 原生任务定位。两个 ZIP 是远程服务接入安装器；已有用户无需因服务升级或浏览器授权过期重装。版本变化见 [v0.4.1 发布说明](docs/release-v0.4.1.md)，测试边界见 [开发与测试](docs/development.md)。

服务入口：`https://42.192.111.92/pto-swimlane/mcp`。token 在 macOS 钥匙串或 Windows 当前用户 DPAPI 中保存，不写入新的 Codex 明文配置。旧配置备份可能包含私密内容，请勿外发。

本工程从 Toolkit 2.0 提取，保留 [CANN Open Software License Agreement Version 2.0](LICENSE)、版权与第三方声明。使用和分发须遵守许可中关于 Huawei AI Processors / Software 的用途及限制；本项目不改变上游许可。
