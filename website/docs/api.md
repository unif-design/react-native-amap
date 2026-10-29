---
sidebar_position: 2
---
# API

所有入口和类型从 `@unif/react-native-amap` 根入口导入。源码产生的 TypeScript 声明为类型依据；不支持深层内部文件导入。

## MapPicker

`MapPicker(props)`、`MapPickerHost({ children? })`、`openMapPicker(config, { signal }?)` 共用选点行为。组件的 `onResult` 与函数 Promise 返回 `MapPickerResult`：

- `success`：`selection: { coordinates, place? }`，只包含实际选择资料。
- `cancelled`：返回、调用信号取消或被下一次函数调用接替。
- `failed`：`error.reason` 为 `invalid_input` 或 `unavailable`，包含中文 `message`。

| 配置 | 含义 |
| --- | --- |
| `initialCameraPosition` | SDK 初始视野，独立于查询中心、选择和范围圈 |
| `initialLocationRequest` | 显式配置后执行一次定位；`includeAddress` 必须给定 |
| `initialQueryCenter` | 初始查询中心；缺省时仅采用本轮请求的初始定位 |
| `initialSelection` / `initialSelectionPresentation` | 原有选择及仅用于展示的标题、地址、来源 |
| `selectInitialLocation` | 默认启用；已有初始定位可成为待选，不另发定位 |
| `initialDisplay` | 拖动/缩放开关、位置图层和独立 `circle` |
| `search` | 明确 `debounceMs` 与查询函数；可用 `onClear` / `onExit` 组合恢复 |
| `panel` | `visible`、`unselectedTitle`、`renderAdditionalOptions` |
| `beforeConfirm` | 同步或异步返回 `{ canConfirm: true }` 或 `{ canConfirm: false, message }` |
| `getConfirmationOptions` | 直接使用 Design `ConfirmOptions`，取消确认保留选点窗口 |
| `showCompleteButton` | 控制完成按钮；不改变选择或业务校验 |
| `onReady` / `onInitialLocationResult` | 地图可操作与初始观测分别交接 |

事件还包括 SDK 的 `onLoad / onCameraMove / onCameraIdle / onMapPress / onUserDragStart`，以及 `onUserDragEnd(center, controls)`、`onRequestRelocate(controls)`、`onSelectionChange(selection)`。移动视野不等于用户拖图；业务查询只由显式组合触发。

`MapPickerControls` 提供 SDK 相机操作 `setCenter / moveCamera / setZoom / getCameraPosition`，以及 `updateDisplay / setQueryCenter / setSelection / loadCandidates / restoreCandidates / exitSearch`。`setSelection` 返回本次是否实际采用，`signal` 标识操作有效范围。候选与搜索各自取消，旧回调不能覆盖新选择；圈整体替换，地图实例保持。

`MapPickerRow(props)` 供场景的附加候选行使用，同样保留选中、无障碍和点击交接；它不构造地点资料。相关类型包括 `MapPickerConfig / MapPickerProps / MapPickerControls / MapPickerResult / MapSelection / MapPickerSelectionPresentation / MapPickerRowProps` 及各输入、事件、搜索、面板与确认类型。

## 定位

```ts
getCurrentLocation({ includeAddress: false }, { signal });
startLocationUpdates({ intervalMs: 1000 }, {
  onLocation(location) {},
  onStopped(reason) {},
}, { signal });
```

单次返回 `success / cancelled / failed`。持续定位返回 `subscribed` 时，`updates.setInterval(intervalMs)` 可调整请求间隔，`updates.stop()` 可重复结束本轮。`subscribed` 不代表已获得位置；新有效观察接管旧观察，旧句柄与迟到结果不能误停新观察。停止原因是 `stopped / cancelled / replaced`。

`includeAddress` 只影响本次原生单次请求，持续观察不附带地址。`intervalMs` 为 0 到 2147483647 的整数；Android 交给 SDK，iOS 限制事件交付频率，均不保证固定采样。

`LocationObservation` 的经纬度为有限合法坐标，0 合法；时间、精度、海拔、速度、方向、坐标系、地址和来源信息只保留实际值。`projectLocationObservation(value)` 投影同一结构，不用收到事件的时间补采集时间。

失败原因：`invalid_input / permission_denied / unsupported / unavailable / invalid_coordinates`。取消仅结束本次等待；已经发出的原生单次请求按其自身完成后释放，不调用全局 stop。相关类型包括 `LocationCoordinates / LocationObservation / LocationAddress / GetCurrentLocationInput / GetCurrentLocationResult / StartLocationUpdatesInput / StartLocationUpdatesResult / LocationUpdates / LocationCallOptions`。

## 地点查询

| 操作 | 必需输入 |
| --- | --- |
| `searchAround(input, options?)` | `center`、`radiusMeters`、`page`、`pageSize` |
| `searchByKeyword(input, options?)` | `keyword`、`page`、`pageSize`，可给 `center / sortByDistance / city` |
| `getPoiById(id, options?)` | 地点 ID |
| `reverseGeocode(input, options?)` | `location`、`radiusMeters`、`includeExtensions` |

`options.signal` 取消当前等待。每次只发一个请求，不定位、不自动翻页、不补查或缓存。page 是 1–100 的整数，pageSize 是 1–25；周边半径 0–50000 米，逆地理半径 0–3000 米。坐标系只接受 GCJ02 或省略，不转换 WGS84；距离排序必须显式给有效中心。

`PlaceQueryResult<T>` 为 `success(data) / cancelled / failed(error)`。保留空字符串、合法零值、部分坐标、缺失列表和空记录位置；成功空对象不被推断为不存在。真实服务的零半径效果仍需单独验证。

查询输入及 `PlaceReadView / PlaceSearchPage / ReverseGeocodeData` 与所有嵌套地点、地址、照片、室内和商业资料类型均从根导出。

## 外部高德

```ts
await openAmap({ action: 'home' }, { sourceApplication: '应用名称', signal });
```

`AmapLaunchRequest` 支持 `home / current_location / marker / navigate / ride / route`；位置携带明确的 `coordinateSystem: 'GCJ02'`。调用方提供 `sourceApplication`，不传平台 scheme 或原始 URI。

验证后构造一次 URI、查询一次、可处理且尚未取消时打开一次。`true` 只表示系统接收打开交接；`false` 表示未打开或打开前取消。打开已发出后保留系统实际结果。非法参数、平台无法保持意图和系统异常保留中文带 code 错误，不跳商店、不改用其他路线，也不自动定位。

## 宿主与初始化类型

`configureAmapHost(host: AmapHost): void` 安装权限、键盘和外部 URL 依赖。`initializeGaode(keys: AmapKeys): void` 接收可选 `iosKey / androidKey`，只使用当前平台原值。`AmapPermissionAccess / AmapPermissionState / AmapKeyboardHost` 定义实际需要的宿主结构。详见[快速开始](./quick-start.md)。
