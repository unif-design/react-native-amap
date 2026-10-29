---
sidebar_position: 4
---
# 开发与贡献

采用 [Unif 组织工程标准](https://github.com/unif-design/.github/blob/main/ONBOARDING.md) 和 [等价迁移要求](https://github.com/unif-design/.github/blob/main/docs/14-library-extraction.md)。目录、规范来源与命令见 [仓库开发资料](https://github.com/unif-design/react-native-amap/blob/main/docs/DEVELOPMENT.md)。

```sh
yarn lint
yarn typecheck
yarn test
yarn build
yarn website typecheck
yarn website test
yarn website build
node .github/scripts/check-library.cjs pack
```

公共出口和 `.d.ts`、README、网站及真实原生示例同步维护。UI 和默认行为遵循既有契约；迁移中的新缺陷必须修复，范围外已有问题经核实登记 issue，不自动扩大业务调整。

CI、原生产物、真机与业务验收分别提供证据。正式发布使用组织机器人和 npm Trusted Publisher，不通过本机发布替代保护门禁。源码和 SDK 补丁遵循 [MIT 许可证](https://github.com/unif-design/react-native-amap/blob/main/LICENSE)；厂商原生 SDK 条款由宿主遵守。
