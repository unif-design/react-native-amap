# @unif/react-native-amap

React Native 高德地图选点、单次与持续定位、地点查询和外部高德唤起。基于 `expo-gaode-map@2.3.2` 及宿主提供的既有补丁，库本体使用 TypeScript/TSX，不提供新的原生桥。

- [文档网站](https://unif-design.github.io/react-native-amap/)
- [API](https://unif-design.github.io/react-native-amap/docs/api) · [原生示例](./example) · [npm](https://www.npmjs.com/package/@unif/react-native-amap)
- [开发资料](./docs/DEVELOPMENT.md) · [MIT 许可证](./LICENSE)

## 安装与支持范围

```sh
npm install @unif/react-native-amap expo-gaode-map@2.3.2
```

iOS / Android 需要真实原生工程、Expo Modules、平台高德 key 与前台位置权限。Expo Go 和 Web 不提供这些原生地图能力；Web 对选点、定位、地点查询和应用唤起保留明确的不支持结果。地图展示组件继续从 `expo-gaode-map` 直接使用。

本版保持采用的宿主依赖：React 19.3.1、React Native 0.88.1、Expo 58.0.20、Expo Modules Core 58.0.27、Design 1.13.6、Icons 0.5.3、Reanimated 4.7.1、Worklets 0.13.0、Gesture Handler 3.4.0、Safe Area Context 5.10.1、SVG 15.16.0、Zustand 5.0.16，以及共用 Logger 0.1.3。完整 peer 列表见 [package.json](./package.json)；同时满足这些依赖各自的原生接线要求。库使用宿主已经安装的 Logger 运行期，不调用 `installLogging`。

## SDK 补丁前置

本库依赖已修补的 `expo-gaode-map@2.3.2`，补丁由应用宿主统一维护和应用；npm 包不携带补丁，也不运行自动修改依赖的安装脚本。仅安装本包不足以获得等价行为。

宿主须在**实际被原生工程解析的 SDK 副本**上应用原补丁，并重装 Pods、重建 iOS/Android 二进制。需要按次定位与取消隔离、地点分页/排序和元数据、共享隐私初始化、真实拖动事件、相机与 Circle 处理等已有能力。完整步骤与验证见 [原生宿主与补丁](https://unif-design.github.io/react-native-amap/docs/native-host)。

## 宿主与最小用法

在任何地图/定位操作及 MapPicker 渲染之前，调用一次 `configureAmapHost`，提供已有权限访问、键盘展示作用域和外部 URL 操作。使用同一权限队列及同一键盘 Context；完整可运行参考见 [example/src/App.tsx](./example/src/App.tsx) 和 [example/src/host](./example/src/host)。这些宿主实现不打入 npm 库。

```tsx
import {
  configureAmapHost, initializeGaode, MapPickerHost, openMapPicker,
} from '@unif/react-native-amap';

configureAmapHost({
  getPermissionAccess, // 宿主原有的前台位置权限访问
  keyboard: { KeyboardViewport, KeyboardPresentationScope, useKeyboardPresentation },
  canOpenExternalUrl,
  openExternalUrl,
});

// 仅在用户真实同意高德隐私说明后调用；key 由宿主传入。
initializeGaode({ iosKey, androidKey });

// 应用 ThemeProvider、手势、安全区、键盘宿主之内挂载：
<MapPickerHost />;

const result = await openMapPicker({
  initialLocationRequest: { includeAddress: false },
});
if (result.status === 'success') {
  // result.selection 交付用户确认的坐标，不代表业务已经保存。
}
```

## 公开 API

| 入口 | 职责 |
| --- | --- |
| `configureAmapHost` / `initializeGaode` | 安装宿主依赖；同意后按平台初始化 SDK，同一运行期只尝试一次 |
| `MapPicker` / `MapPickerHost` / `openMapPicker` | 直接组件与函数式选点，共用选择、取消、搜索、确认及资源收尾 |
| `MapPickerRow` | 场景附加候选行，复用选点行的布局与选中表现 |
| `getCurrentLocation` / `startLocationUpdates` | 按次位置、可停止和调整间隔的持续观察 |
| `projectLocationObservation` | 投影实际观测字段，保留缺值，不补造坐标或采集时间 |
| `searchAround` / `searchByKeyword` / `getPoiById` / `reverseGeocode` | 独立单次查询，显式分页和半径，取消仅结束本次等待 |
| `openAmap` | 六类外部高德动作；系统接收打开不等于路线或业务完成 |

输入、结果和相关类型均从包根导出。完整参数及错误语义见网站 [API](https://unif-design.github.io/react-native-amap/docs/api)，类型以源码生成的 `.d.ts` 为准。

## 示例与验证

```sh
yarn install
yarn test
yarn typecheck
yarn build
yarn example android
# iOS 首次运行先在 example/ios 执行 bundle exec pod install
yarn example ios
```

将 `example/.env.example` 复制为忽略提交的 `example/.env`，由宿主提供适用于示例包名/Bundle ID 的平台 key。真实地图、位置权限、手势、键盘、持续观察、外部高德应用和服务响应需要真机验收；单元测试和网站构建不替代这些结果。
