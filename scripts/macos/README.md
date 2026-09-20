# PTO Swimlane MCP · macOS

从 [GitHub Releases](https://github.com/wangnaiyu/pto-swimlane/releases/latest) 下载 macOS ZIP。需已安装支持 `http_headers_helper` 的 Codex 桌面端，无需 Node/Python/SSH。

## 安装

1. 解压到普通文件夹，双击 `setup-pto-swimlane-macos.command`。
2. 若系统提示无法验证开发者，先确认来源，再到「系统设置 → 隐私与安全性 → 仍要打开」，按提示确认。此操作只为选定程序建立例外，不关闭全局安全检查。[Apple 官方说明](https://support.apple.com/102445)
3. 粘贴另行取得的个人 token，按回车；输入不显示字符。
4. 等待「安装完成」。安装器验证 HTTPS/token，保存到系统钥匙串，并配置 `pto-swimlane-mcp`。
5. 用 ⌘Q 完全退出 Codex，重新打开。

## 开始分析

1. 安装成功后，完全退出并重新打开 Codex，在任意项目的新任务输入：**使用 pto-swimlane-mcp 分析性能**。
2. 页面打开后点击「选择文件」，选择 `merged_swimlane.json`；有同组 `dyn_topo.txt` 可一起上传。
3. 上传、解析完成后点击右上角「重新同步」，将自动复制的 prompt 发给 Agent。
4. Agent 建立好文件联系后提问：**耗时最长的任务是哪个？**
5. 可接着要求：**直接在泳道图里找到它。**

文件会上传到服务端，请只使用获准上传的数据。个人 token 与验证数据由提供者另行私发，安装包不包含它们。

## 已知情形的处理

- 包不完整或打开了错误文件：重新全部解压，运行 `.command`。
- token 无效或停用：请提供者确认；更换 token 时可重新运行安装器。
- 新旧泳道配置同时存在：安装器会停止，保留原配置。请管理员协助合并 `pto-swimlane-mcp` / `pto_swimlane_https`，不要删除整个 `config.toml`。仅有旧名时会自动迁移并保留工具权限。
- 配置未生效：完全退出并重开 Codex；自定义 `CODEX_HOME` 须与桌面端一致。
- 安装显示连接失败：按窗口错误检查服务可达性；验证失败不会修改现有配置。不要发送 token、旧配置备份或带授权参数的链接。

安装器保留其他 MCP 配置；旧配置备份权限为 0600，可能含旧明文 token，确认成功后可自行删除对应备份。新配置通过 `http_headers_helper` 读取钥匙串。

关闭页面后可点击对话中的重开链接；授权过期时请 Agent 恢复原分析。分析创建后保留 7 天，每个分析最多 4 份数据集，单文件最多 80,000,000 字节；到期删除、不备份。

服务：`https://42.192.111.92/pto-swimlane/mcp`。本包为小范围试用安装分发，实际测试范围见 Release。许可及第三方声明随包保留。
