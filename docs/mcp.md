# 本地 STDIO MCP

安装依赖并构建后，可由客户端启动：

```sh
node /path/to/pto-swimlane/bin/pto-swimlane.mjs --allow-root /path/to/authorized-data
```

使用 Node 的绝对路径及工程入口，`--allow-root` 可重复指定。真实路径检查阻止符号链接越界；stdout 仅用于协议，日志写 stderr。`doctor` 检查安装，`config --allow-root ...` 输出客户端配置模板，不修改用户配置。

工具：`open_swimlane` 打开 trace 和可选 topo；`query_tasks` 筛选/排序/分页；`get_task` 返回任务及有界依赖；`close_swimlane` 释放数据集。任务时间以 ns 表示；页面部分面板使用 μs。

测试可使用仓库 `tests/fixtures/L2-synthetic`：三个手工任务，最长 seqNo=0 / taskId=2 / 5000 ns。它不是真实性能数据。

本地解析与模型查询是不同的数据边界：查询结果会进入调用 Agent 的上下文。请仅授权合适的数据目录。查看链接随进程失效，关闭标签页不等于关闭数据集。
