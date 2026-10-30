---
sidebar_position: 1
---

# 快速开始

`@unif/react-native-amap` 为 iOS/Android 提供选点、定位、地点查询和外部高德唤起。纯地图视图继续直接使用 `expo-gaode-map`。Web 保留明确的不支持结果；原生行为需要编译后的宿主。

## 安装

```sh
npm install @unif/react-native-amap expo-gaode-map@2.3.2
```

本仓开发组合为 React 19.3.1、React Native 0.88.1、Expo 58.0.20 / Expo Modules Core 58.0.27、Design 1.13.6、Icons 0.5.3、Reanimated 4.7.1、Worklets 0.13.0、Gesture Handler 3.4.0、Safe Area Context 5.10.1、SVG 15.16.0、Zustand 5.0.16 和 Logger 0.1.3。React 与 RN 的声明范围分别为 `^19.3.0`、`>=0.88.0`，其余 peer 采用上述精确版本；完整列表以 [package.json](https://github.com/unif-design/react-native-amap/blob/main/package.json) 为准。设计系统自身的 peer 和原生接线也必须满足。开发组合不表示所有版本组合都已验收。

本库不分发补丁，也不自动修改消费者依赖。请由应用宿主在实际解析的 `expo-gaode-map@2.3.2` 上应用既有补丁，再安装 Pods 并重建两端应用。需要使用同一个已修补 SDK 副本；缺少所需原生事件或按次请求能力时，不能按普通未修补 SDK 验收。详见[宿主接线](./native-host.md)。

## 提供宿主依赖

```ts
import { configureAmapHost } from '@unif/react-native-amap';

configureAmapHost({
  getPermissionAccess,
  keyboard: {
    KeyboardViewport,
    KeyboardPresentationScope,
    useKeyboardPresentation,
  },
  canOpenExternalUrl,
  openExternalUrl,
});
```

上述标识由应用已有能力提供；完整实现参考仓库 `example/src/host`。在任何地图操作、定位操作或选点渲染前安装，并保持这些对象的身份稳定。

`getPermissionAccess()` 返回同一个前台权限访问，`read(['location'])` 得到 `requestable / blocked / granted / limited / unavailable`，`request('location')` 和 `openSettings()` 保留宿主的协调与错误行为。库在 `requestable` 时请求一次再重读；`granted` 与 `limited` 均可用。

键盘宿主必须与应用上层使用同一套 Context。`useKeyboardPresentation(true)` 登记呈现层，`KeyboardPresentationScope` 管理其子层，`KeyboardViewport` 只避让搜索面板。不能用无状态占位组件替代并宣称完成原生键盘验收。

URL 查询与打开分别接收 URI，返回 `Promise<boolean>` 与 `Promise<void>`。库保留宿主原异常；例子使用真实 React Native Linking 和既有格式检查、中文带 code 错误。

## 同意后初始化

```ts
import { initializeGaode } from '@unif/react-native-amap';

// 只有真实同意隐私说明后才执行；key 来自宿主配置。
initializeGaode({ iosKey, androidKey });
```

调用同一运行期只尝试一次，缺 key 或初始化抛错也不会自动重试。先关闭厂商日志，再同步隐私状态，再交付当前平台 key。调用本身不代表用户已同意；同意记录、恢复时机和 key 配置属于应用。各能力继续读取 SDK 的公开就绪状态，不使用第二份“初始化成功”缓存。

## 选点

在 ThemeProvider、手势、安全区和键盘宿主内挂载一次 `MapPickerHost`，即可调用：

```ts
import { openMapPicker } from '@unif/react-native-amap';

const result = await openMapPicker({
  initialLocationRequest: { includeAddress: false },
});
if (result.status === 'success') {
  console.log(result.selection.coordinates);
}
```

也可以直接渲染 `<MapPicker onResult={onResult} />`，通过 `ref` 取得同一个控制接口。函数式调用可传 `{ signal }`；返回与取消只结束本轮，关闭后迟到结果不会影响新选点。确认只交付选择，不发起业务保存。
