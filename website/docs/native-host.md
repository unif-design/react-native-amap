---
sidebar_position: 3
---

# 原生宿主、补丁与验证

库本体不包含 Swift/Kotlin 桥。`example/ios` 和 `example/android` 是真实 React Native 工程，接入 Expo Modules、现有 SDK、Design、手势、安全区与键盘控制器。

## 示例

```sh
yarn install
cp example/.env.example example/.env
# 在本机 .env 填写适用于示例包标识的 AMAP_KEY_IOS / AMAP_KEY_ANDROID
yarn example android
# iOS：在 example 执行 bundle install 和 bundle exec pod install --project-directory=ios，再回根目录
yarn example ios
```

示例从包公开入口使用真实实现。点击“同意并初始化”后才调用 SDK 初始化；未提供 key 会保留原有 unavailable 分支，不自动尝试或使用内置 key。示例不上传位置到业务服务。

iOS 配置前台 `LocationWhenInUse` handler 和中文用途说明，外部应用查询声明为 `iosamap / amapuri`。Android 配置粗略/精确前台位置权限与 `androidamap / amapuri` 查询。SDK key 由 JS 初始化传入，不在 Android Manifest 重复保存。不要因此申请后台定位。

Expo Modules 在 Android 使用 `expo-autolinking-settings`、`ExpoReactHostFactory`、生命周期 dispatcher 与 activity delegate wrapper；iOS 使用 `use_expo_modules!`、Expo autolinking、`ExpoAppDelegate` 和 `ExpoAppSceneDelegate`。这些是 example 宿主接线。

## 精确版本与补丁

`expo-gaode-map+2.3.2.patch` 由应用宿主唯一维护。本库不重复保存或分发补丁，不运行自动修改消费者依赖的安装脚本。验证环境必须由同一维护源准备 SDK，不能由库重新实现一套修改。

所需能力包括按次定位资源与地址参数隔离、位置/地点元数据序列化、地点分页及距离排序、隐私与搜索共用初始化、真实用户拖动开始/结束事件、部分相机参数以及 Circle 数值颜色处理。对应 SDK 集成用例由调用方工程维护，未修补 SDK 不能替代。

调用方的补丁集成验证与真实运行遵循以下步骤：

1. 从宿主维护源取得适用于 2.3.2 的既有补丁或由该来源准备的 SDK，核对来源与摘要。
2. 安装本库和精确的 SDK 版本后，确认实际解析位置：`node -p "require.resolve('expo-gaode-map/package.json')"`。在 monorepo 中分别从原生宿主根目录执行，不能只修改另一个 node_modules 副本。
3. 通过宿主已有的补丁工具在该位置应用原补丁；例如宿主使用 patch-package 时，从对应宿主目录运行 `patch-package --patch-dir "$HOST_PATCH_DIR"`。`HOST_PATCH_DIR` 由宿主提供，不是本包目录。本库没有内置补丁下载地址或私有仓库凭据。
4. 在调用方工程维护并运行真实 SDK 集成用例，保留既有行为断言；核对该工程实际解析的 SDK，再安装 Pods、执行平台构建。公共库不复制这些用例，也不要求公共 CI 读取宿主补丁。
5. 更新补丁后重建实际 iOS/Android 二进制；旧二进制即使更新 JavaScript 仍可能缺少参数或事件。

## 证据层级

公共库 CI 安装官方 SDK，验证库自身行为、类型、实际 tarball 的公开入口及 Web 分支。运行期扩展类型只描述宿主已有能力，不在库内实现补丁。SDK 集成测试与夹具由调用方工程维护并在其实际 SDK 上执行；合并发布前必须同时核对库 CI 与调用方集成通过的结果。普通原生构建成功不能证明补丁行为已经验收。

真机仍需检查：实际用户同意、权限拒绝/降低精度/设置返回、按次地址隔离、持续观察调频/接替/停止、地图拖动与缩放、候选/搜索/确认/取消、键盘与安全区、关闭后的迟到结果、外部高德已安装/未安装，以及真实高德服务响应。无真实 key、设备或服务结果时，不以 mock、网站、Expo Go 或一次构建声称这些通过。
