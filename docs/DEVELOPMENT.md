# 开发资料

本库从已采用的 Portal 地图、定位、地点查询与外部高德唤起实现等价提取，源码归属为 `src/MapPicker`、`src/location`、`src/places`、`src/amapLaunch`。`src/initialization` 保留同意后的高德初始化行为，`src/host` 只接收宿主依赖。库不包含营销、拜访或 H5 消息适配。

采用 `unif-design/.github` 已提交标准 `896239031ddba5902adf915060f37fff5ed9edf1`，包括 [接入](https://github.com/unif-design/.github/blob/896239031ddba5902adf915060f37fff5ed9edf1/ONBOARDING.md)、[等价迁移](https://github.com/unif-design/.github/blob/896239031ddba5902adf915060f37fff5ed9edf1/docs/14-library-extraction.md) 和发布门禁。共享 workflow 与脚本由组织模板同步。

行为依据为 Unif 平台的 [地图](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/map.md)、[定位](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/location.md)、[地点查询](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/places.md) 和 [外部高德唤起](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/amap-launch.md) 契约。开发、测试、审查和交付使用 `unif-portal-dev-skills` 对应技能。

## 工程与验证

官方 `create-react-native-library@0.64.0` 的 `library / js / vanilla` 模板用于 TS/TSX 库和真实原生 example。React Native 保持 0.88.1；模板默认 UI/SDK 版本不能代替已采用版本。

- `yarn test`：原行为、注入、SDK 真实 JS 及工具测试。
- `yarn typecheck` / `yarn build`：源码类型与 Bob 的 ESM/声明产物。
- `yarn lint`：采用 RN ESLint 与格式检查。
- `yarn website typecheck` / `yarn website test` / `yarn website build`：Docusaurus 与共享 LLM 生成链。
- `node .github/scripts/check-library.cjs pack`：实际 tarball 出口。公开类型消费、Web 图及原生宿主需额外验证。
- `yarn example build:android` / `yarn example build:ios`：原生消费者构建；定位、地图、权限和高德服务仍须真实设备验证。

公开接口变更同步 `src/index.ts`、Web 入口、类型、example 和网站。SDK 补丁由宿主唯一维护，本库不保存副本或自动应用。开发、example、CI 和干净消费者从该维护源准备同版 SDK，并验证实际解析副本和原生消费者；缺少维护源或产物必须如实阻塞相关验证。

库只使用 `@unif/react-native-logger` 公共入口，不复制或安装 Logger 运行期。新宿主保持权限队列、键盘 Context 与 URL 错误策略；凭证、个人设备配置和运行原始产物留在仓库外。

## 提交与发布

采用中文 Conventional Commit 和中文 PR。通过标准 CI、规则集及普通 Squash PR 合并；正式 npm 版本由组织 release-bot / OIDC 工作流产生。首次包身份引导、Trusted Publisher 和候选处理按组织标准执行，不能以本机发布替代正式链路。公开产物、网站部署、设备行为和业务接入分别记录证据。
