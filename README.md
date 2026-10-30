# @unif/react-native-amap

为 React Native 应用提供高德地图选点、单次与持续定位、地点查询和外部高德应用唤起。

[文档站](https://unif-design.github.io/react-native-amap/) · [API](website/docs/api.md) · [原生示例](example/README.md) · [npm](https://www.npmjs.com/package/@unif/react-native-amap) · [MIT 许可证](LICENSE)

## 接入要求

iOS／Android 需要原生宿主、高德平台 key 和前台位置权限。Expo Go 和 Web 不提供本库的原生能力。仅展示地图时，直接使用 `expo-gaode-map` 的地图组件。

| 依赖              | 支持要求               | 本仓开发组合 |
| ----------------- | ---------------------- | ------------ |
| React             | `^19.3.0`              | 19.3.1       |
| React Native      | `>=0.88.0`             | 0.88.1       |
| Expo              | 精确 58.0.20           | 58.0.20      |
| Expo Modules Core | 精确 58.0.27           | 58.0.27      |
| expo-gaode-map    | 精确 2.3.2，需宿主补丁 | 2.3.2        |

Design、Icons、Logger、动画与手势等 peer 也必须满足，完整清单见[快速开始](website/docs/quick-start.md#安装)和 [package.json](package.json)。开发组合不表示版本范围内的所有组合都已通过设备验证。

## 安装与初始化

1. 安装本库与地图 SDK：

   ```sh
   npm install @unif/react-native-amap expo-gaode-map@2.3.2
   ```

2. 按[原生宿主与补丁](website/docs/native-host.md)完成依赖接线、位置权限和平台 key 配置。在原生工程实际使用的 SDK 副本上应用宿主维护的补丁，再安装 Pods 并重建应用。本包不附带或自动应用补丁。
3. 按[宿主配置](website/docs/quick-start.md#提供宿主依赖)调用 `configureAmapHost`，复用应用的权限、键盘和 URL 能力，并挂载 `MapPickerHost`。在用户同意隐私说明后调用 `initializeGaode`；这些准备应在地图操作或选点渲染前完成。

## 打开选点

宿主配置完成后，在异步事件处理中调用：

```ts
import { openMapPicker } from '@unif/react-native-amap';

const result = await openMapPicker({
  initialLocationRequest: { includeAddress: false },
});
if (result.status === 'success') {
  console.log(result.selection.coordinates);
} else if (result.status === 'failed') {
  console.warn(result.error.message);
}
```

结果为 `success`、`cancelled` 或 `failed`。成功只交付用户确认的选择，业务保存由应用负责。需要取消时可传入 `{ signal }`，具体配置见 [MapPicker API](website/docs/api.md#mappicker)。

## 更多用法

- [定位、地点查询与外部高德](website/docs/api.md)：输入、返回结果、错误与取消语义。
- [原生示例](example/README.md)：完整宿主实现、环境配置和运行步骤；真实位置与高德服务需在设备中验证。
- [开发资料](docs/DEVELOPMENT.md)与[贡献指南](CONTRIBUTING.md)：工程来源、检查和交付流程。
