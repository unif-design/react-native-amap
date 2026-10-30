import { configureAmapHost, getAmapHost } from '../src/host';
import type { AmapHost } from '../src/host/types';
test('配置保留宿主对象及权限队列、键盘组件和 URL 函数身份', () => {
  const host = {
    getPermissionAccess: jest.fn(),
    keyboard: {
      KeyboardViewport: jest.fn(),
      KeyboardPresentationScope: jest.fn(),
      useKeyboardPresentation: jest.fn(),
    },
    canOpenExternalUrl: jest.fn(),
    openExternalUrl: jest.fn(),
  } satisfies AmapHost;
  configureAmapHost(host);
  expect(getAmapHost()).toBe(host);
});
