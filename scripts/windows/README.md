# PTO Swimlane MCP · Windows

从 [GitHub Releases](https://github.com/wangnaiyu/pto-swimlane/releases/latest) 下载 Windows ZIP。面向 Windows 10/11 原生 Codex 桌面端（需支持 `http_headers_helper`），使用系统 Windows PowerShell 5.1；不用于 WSL。无需管理员权限、Node 或 Python。

## 安装

1. 安装并登录 Codex，然后完全退出 Codex。
2. 右键 ZIP →「全部解压缩」，不要在 ZIP 预览窗口运行。
3. 双击 `setup-pto-swimlane-windows.cmd`，不是 `.ps1`。
4. 若 SmartScreen 提示未识别应用，确认来源后，在界面提供该选项时选择「更多信息 → 仍要运行」。企业策略或 Smart App Control 阻止时，交由 IT 审核，不关闭安全软件或改变公司策略。[Microsoft 官方说明](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
5. 粘贴另行取得的个人 token，按回车；输入不显示。
6. 看到绿色 `Installed` 后关闭窗口，完全退出并重开 Codex。

## 开始分析

1. 安装成功后，完全退出并重新打开 Codex，在任意项目的新任务输入：**使用 pto-swimlane-mcp 分析性能**。
2. 页面打开后点击「选择文件」，选择 `merged_swimlane.json`；有同组 `dyn_topo.txt` 可一起上传。
3. 上传、解析完成后点击右上角「重新同步」，将自动复制的 prompt 发给 Agent。
4. Agent 建立好文件联系后提问：**耗时最长的任务是哪个？**
5. 可接着要求：**直接在泳道图里找到它。**

文件会上传到服务端，请只使用获准上传的数据。个人 token 与验证数据由提供者另行私发，安装包不包含它们。

## 已知情形的处理

- 仅弹出记事本：运行的是 `.ps1`，请改用解压后的 `.cmd`。
- 未显示 `Installed`：安装未完成，保留错误文字；不要发送 token 或配置备份。
- `existing PTO MCP configuration`：仅删除 Codex 设置中 `pto-swimlane-mcp` / `pto_swimlane_https` 对应配置，再退出 Codex 重试；不要删除整个 `config.toml`。无法确认时请管理员协助。
- `Token rejected`：请提供者确认 token 是否有效或已停用，无需重装 Codex。
- 旧包提示 Replace 路径不合法：本包保留 windows-2 的 `[NullString]::Value` 修复，可以直接重新安装，无需换 token 或删除原配置。
- 配置未生效：完全退出并重开 Codex；自定义 `CODEX_HOME` 须与桌面端一致。

## 安装内容

配置默认在 `%USERPROFILE%\.codex\config.toml`，尊重 `CODEX_HOME`，保留其他设置。复杂 TOML 或同名配置冲突时会停止。

凭据和 helper 存于 `%LOCALAPPDATA%\PTO-Swimlane-MCP\<安装编号>\`，由 DPAPI 按当前 Windows 账户加密。token 不写入 TOML、命令行或永久环境变量。配置备份可能含私密设置，勿外发或拷到其他电脑。

启动器和 helper 仅对自身进程使用 `ExecutionPolicy Bypass`，不永久修改系统策略。卸载时先在 Codex 删除该服务并退出，再删除上述安装目录；停用 token 需由管理员执行。

分析保留 7 天，每个分析最多 4 份数据集，单文件最多 80,000,000 字节，到期删除、不备份。服务：`https://42.192.111.92/pto-swimlane/mcp`。本包用于小范围试用，实际测试范围见 Release；许可及第三方声明随包保留。
