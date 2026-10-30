# 贡献

先阅读 [开发资料](docs/DEVELOPMENT.md) 与 `AGENTS.md`。保持现有契约和已授权范围，改动覆盖实际消费者、类型、例子及文档。提交和 PR 使用中文 Conventional Commit；通过标准 CI 后按普通 PR 合并。

本地执行 `yarn install`、`yarn lint`、`yarn typecheck`、`yarn test`、`yarn build` 和 website 检查。原生 SDK、补丁或宿主接线变更另验证 example 原生构建与相关真实设备行为。不要提交实际 key、账号、个人设备配置或原始运行产物。
