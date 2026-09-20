# PTO Swimlane 协作入口

先读 README、UPSTREAM 和 docs/architecture.md。保留上游版权、LICENSE 和第三方声明；更改提取文件须同步 upstream-files.json 的 extractedSha256 并解释差异，不修改只读上游镜像。

原始业务数据不入仓。真实样例通过 PTO_TESTDATA_ROOT 引用；公开测试夹具仅为标记明确的人工 L2。运行构建、相关测试，并准确区分跳过与未运行项目。安装器修改后重新打包并验证解压内容，保留 Windows File.Replace 的 NullString 修复。

公共工程禁止提交凭据、私钥、授权链接、配置备份、真实业务数据及环境专属运维信息。.local 为本机私有输出。部署、账号发放、发布与用户环境修改需要相应授权；不要从测试指令推断生产操作授权。
