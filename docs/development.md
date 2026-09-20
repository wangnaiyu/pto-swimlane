# 开发与测试

需要 Node.js 22.12+、npm；发布检查使用 Node 24。在仓库根目录执行：

```sh
npm ci
npm run build
npm run dev
```

本地浏览器文件选择由 Worker 解析；开发服务默认监听 loopback。真实样例不入仓，可通过 `PTO_TESTDATA_ROOT` 指向本机 PTO-TestData，再运行 `npm test`、`npm run test:mcp`、`npm run test:b1`。未设置变量时部分测试跳过，不能视为完整通过。

人工 L2 在 `tests/fixtures/L2-synthetic/`，不是真实运行结果。联网模型测试需自行确认数据授权；普通本机回归不调用外部模型。

```sh
npm run test:remote
npx playwright install chromium
npm run test:remote-browser
python3 tests/macos-installer.py
python3 tests/macos-config-migration.py
python3 tests/windows-installer.py /path/to/pwsh scripts/windows
npm run pack:macos
npm run pack:windows
```

Python 测试需要 3.11+。macOS 安装夹具使用系统调用替身；Windows 跨平台 PowerShell 测试覆盖语法、TOML、配置替换及失败保护，不替代 Windows 原生 DPAPI、ACL、双击或桌面验收。ZIP 由规范脚本确定性打包，包含安装文件及许可；不含运行数据、凭据或源码构建目录。

`npm run pack:local` 可构建本地源码安装候选，不向 npm 发布。Release 的两个 ZIP 是连接既有远程服务的安装器，不是服务器可执行包。
