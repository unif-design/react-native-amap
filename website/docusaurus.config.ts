import type { Config } from '@docusaurus/types';
const config: Config = {
  title: 'Unif AMap',
  tagline: '高德地图、选点、定位与地点查询',
  url: 'https://unif-design.github.io',
  baseUrl: '/react-native-amap/',
  organizationName: 'unif-design',
  projectName: 'react-native-amap',
  onBrokenLinks: 'throw',
  i18n: { defaultLocale: 'zh-Hans', locales: ['zh-Hans'] },
  presets: [
    [
      'classic',
      {
        docs: { sidebarPath: './sidebars.ts' },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Unif AMap',
      items: [
        { to: '/docs/quick-start', label: '接入', position: 'left' },
        { to: '/docs/api', label: 'API', position: 'left' },
        {
          href: 'https://github.com/unif-design/react-native-amap',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        {
          title: '资源',
          items: [
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/@unif/react-native-amap',
            },
            { label: 'LLM 文档', href: 'pathname:///llms.txt' },
            { label: 'Unif', href: 'https://unif.design' },
          ],
        },
      ],
      copyright: '@unif/react-native-amap · MIT',
    },
    colorMode: { respectPrefersColorScheme: true },
  },
};
export default config;
