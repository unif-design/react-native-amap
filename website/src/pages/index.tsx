import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
export default function Home() {
  return (
    <Layout title="高德地图与位置能力">
      <main className="amap-home">
        <p>Unif React Native</p>
        <h1>
          地图、位置与选择，
          <br />
          各有清晰的边界。
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
          由宿主提供，使用前由用户完成隐私同意；原生能力通过设备与真实服务验证。
        </p>
        <Link to="/docs/native-host">查看原生示例与 SDK 补丁 →</Link>
      </main>
    </Layout>
  );
}
