# 开发资料

本库从已采用的 Portal 地图、定位、地点查询与外部高德唤起实现等价提取，源码归属为 `src/MapPicker`、`src/location`、`src/places`、`src/amapLaunch`。`src/initialization` 保留同意后的高德初始化行为，`src/host` 只接收宿主依赖。库不包含营销、拜访或 H5 消息适配。

库提取时采用组织标准修订 `a29d71586a63a1b39d9a3acc446741289150ac41` 的等价迁移要求。当前 CI、发布和共享工具的维护来源见[交付配置与检查](#交付配置与检查)。

行为依据为 Unif 平台的 [地图](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/map.md)、[定位](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/location.md)、[地点查询](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/places.md) 和 [外部高德唤起](https://github.com/unif-design/unif-platform-architecture/blob/main/capabilities/amap-launch.md) 契约。

通用规范使用 `uni-skills`：`code-organization` 说明目录与文件组织，`react-native-development` 说明 RN 实现要求，`react-native-library` 说明独立库与消费者验证，`documentation` 说明文档与文档站维护。Unif 的设计、测试、审查和交付按 `unif-portal-dev-skills` 对应技能执行；本库接口与行为以公开类型和有效契约为准。

## 工程与验证

官方 `create-react-native-library@0.64.0` 的 `library / js / vanilla` 模板用于 TS/TSX 库和真实原生 example。React Native 保持 0.88.1；模板默认 UI/SDK 版本不能代替已采用版本。

- `yarn test`：库自身原行为、注入、实际 tarball 的公开类型及 Web 入口。
- `yarn typecheck` / `yarn build`：源码类型与 Bob 的 ESM/声明产物。
- `yarn lint`：采用 RN ESLint 与格式检查。
- `yarn website typecheck` / `yarn website test` / `yarn website build`：Docusaurus 与共享 LLM 生成链。
- `node .github/scripts/check-library.cjs pack`：实际 tarball 出口。公开类型消费、Web 图及原生宿主需额外验证。
- `yarn example build:android` / `yarn example build:ios`：原生消费者构建；定位、地图、权限和高德服务仍须真实设备验证。

公开接口变更同步 `src/index.ts`、Web 入口、类型、example 和网站。SDK 补丁由宿主唯一维护，本库不保存副本或自动应用。公共库 CI 使用官方 SDK 验证库代码和公开产物；补丁 SDK 集成测试与夹具由调用方工程维护，在该工程实际修补的 SDK 上执行。合并发布前同时取得两层通过的证据，不能以库侧替身或原生编译代替补丁行为验收。

库只使用 `@unif/react-native-logger` 公共入口，不复制或安装 Logger 运行期。新宿主保持权限队列、键盘 Context 与 URL 错误策略；凭证、个人设备配置和运行原始产物留在仓库外。

## 提交与发布

采用中文 Conventional Commit 和中文 PR。通过标准 CI、规则集及普通 Squash PR 合并；正式 npm 版本由组织 release-bot / OIDC 工作流产生。首次包身份引导、Trusted Publisher 和候选处理按组织标准执行，不能以本机发布替代正式链路。公开产物、网站部署、设备行为和业务接入分别记录证据。

## 交付配置与检查

共享 CI、发布配置和检查工具由 `github-delivery` 的模板与工具维护。Unif 组织值由 `code-delivery` 的 `assets/organization.json` 维护，接入时落实为本库 `.github/organization.json`，记录组织、包名规则、Pages 地址、发布 App 身份及远端设置。工具运行时读取项目文件，不依赖其他技能的安装目录；适用技能按当前任务独立选择。

在仓库根目录按阶段执行：

| 命令 | 检查范围 |
| --- | --- |
| `node .github/scripts/check-delivery.cjs` | 离线检查受管文件、组织配置与 source 元数据。 |
| `node .github/scripts/check-library.cjs pack` | 完成库构建后，检查当前 tarball 的导出、声明与文件清单。 |
| `node .github/scripts/check-library.cjs release` | 发行前校验 README、许可和发布配置，不执行发布。 |
| `node .github/scripts/check-library.cjs published` | 联网核验 npm 当前版本的元数据、下载完整性与实际 tarball。 |

CI 与发布步骤见本库 `.github/workflows/`，组织配置调整以项目文件及当前授权为准。本地检查、远端 CI、npm 发布、文档部署和设备验收分别报告。
