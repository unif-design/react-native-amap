import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
export default function Home() {
  return (
    <Layout
      title="高德地图选点、定位与地点查询"
      description="为 React Native iOS 和 Android 应用提供高德地图选点、单次与持续定位、地点查询和外部高德应用唤起。"
    >
      <main className="amap-home">
        <p>Unif React Native</p>
        <h1>
          高德地图选点，
          <br />
          定位与地点查询。
        </h1>
        <p>
          地图选点、单次和持续定位、四类地点查询，以及外部高德唤起。保留独立的显示中心、查询中心与选择，明确交付取消、失败和实际结果。
        </p>
        <nav>
          <Link className="button button--primary" to="/docs/quick-start">
            开始接入
          </Link>
          <Link className="button button--secondary" to="/docs/api">
            阅读 API
          </Link>
        </nav>
        <h2>在真实原生宿主中运行</h2>
        <p>
          iOS 和 Android example 包含 Expo Modules 接线。高德 key
          由宿主提供，使用前由用户完成隐私同意；地图、定位与服务响应需在设备和真实服务中验证。
        </p>
        <Link to="/docs/native-host">查看原生示例与 SDK 补丁 →</Link>
      </main>
    </Layout>
  );
}
