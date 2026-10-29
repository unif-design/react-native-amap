# 原生示例

使用本库公开入口运行地图选点、单次定位和外部高德唤起。UI 使用 Design 1.13.6，SDK 保持 expo-gaode-map 2.3.2；iOS 最低 16.4。

1. 在库根执行 `yarn install`。
2. 由宿主维护源准备已修补 SDK。分别从库根和 example 读取 `require.resolve('expo-gaode-map/package.json')`，确认行为测试与原生工程真正解析到的副本都具备所需补丁。本仓不保留补丁或自动应用脚本。
3. 将 `.env.example` 复制为忽略提交的 `.env`，填写适用于示例 Bundle ID / Android 包名的高德 key；不提交真实 key。
4. Android 从库根执行 `yarn example android`。iOS 先在 example 执行 `bundle install` 与 `bundle exec pod install --project-directory=ios`，再从库根执行 `yarn example ios`。
5. 启动后先阅读隐私说明，再明确同意初始化；缺 key 保留 unavailable 行为，不内置备用 key。

`src/host` 提供权限队列、键盘作用域和 URL 交接的完整宿主示例。应用已有这些能力时直接注入原实现，不能再安装第二套权限队列或键盘 Context。

原生工程构建不证明真实地图、位置、手势、键盘或服务结果。验收按 [原生宿主说明](https://unif-design.github.io/react-native-amap/docs/native-host) 分别记录。
