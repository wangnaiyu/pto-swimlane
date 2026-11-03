# 原生任务定位本机验收

- date: 2026-10-10
- candidate: 0.4.1-local.2
- status: implemented / locally-verified / not-deployed
- data: 人工 L2；没有真实业务数据

构建通过；远程测试 23/23 通过、0 跳过。新增协议用例验证精确任务身份、跨所有者/对话隔离、单页面领取、回执不能伪换任务、CSRF/Origin/Cookie、过期、请求替代和选择版本竞争，覆盖根路径与应用前缀。服务重启不保留 UI 命令是明确契约。

新增 Chromium 流程只用 MCP 发起定位，在 24 个同名任务中精确选择不同 taskId；验证视口外折叠进程展开、纵向滚动、时间轴缩放平移、任务详情、切换目标、刷新不重放以及 Cookie 过期后重新授权。截图人工复核了目标泳道、选中任务和详情中的 taskId=24。

已有自动授权/历史版本选择浏览器测试与旧远程上传浏览器测试均通过。构建仍有既有样式选择器、弃用和 bundle 大小提示，不影响退出状态。未修改或测试安装器；未做生产部署、真实业务数据验收或本地 STDIO 原生定位扩展。

运行：npm run build；npm run test:remote；npm run test:remote-focus-browser；npm run test:remote-analysis-browser；npm run test:remote-browser。
