// RNGH 3 的 Swipeable 订阅 SharedValue；官方 Reanimated mock 尚未提供这两个接口。
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const mock = require('react-native-reanimated/mock');
  const makeMutable = (initialValue: unknown) => {
    const value = mock.useSharedValue(initialValue);
    const listeners = new Map<number, (mockNext: unknown) => void>();
    const update = (next: unknown) => {
      if (Object.is(value.value, next)) return;
      value.value = next;
      for (const listener of listeners.values()) listener(next);
    };
    return new Proxy(value, {
      get(target, key) {
        if (key === 'addListener')
          return (id: number, listener: (mockNext: unknown) => void) =>
            listeners.set(id, listener);
        if (key === 'removeListener')
          return (id: number) => listeners.delete(id);
        if (key === 'set')
          return (next: unknown) =>
            update(typeof next === 'function' ? next(value.value) : next);
        return Reflect.get(target, key);
      },
      set(_target, key, next) {
        if (key !== 'value') return false;
        update(next);
        return true;
      },
    });
  };
  return {
    ...mock,
    makeMutable,
    useSharedValue(initialValue: unknown) {
      const ref = React.useRef();
      if (ref.current === undefined) ref.current = makeMutable(initialValue);
      return ref.current;
    },
  };
});

// RN/Worklets 的 Jest 帧时钟使用 0ms 定时器，真实循环动画会持续向 act 派发更新。
// Portal 验证真实组件的内容和交互；循环动画时钟采用 RN 官方替身，有限动画保持原实现。
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const animated = jest.requireActual(
    'react-native/Libraries/Animated/Animated',
  );
  animated.default.loop = jest.requireActual(
    'react-native/Libraries/Animated/AnimatedMock',
  ).default.loop;
  return animated;
});

jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

const { configureAmapHost } = require('../src/host');
configureAmapHost({
  getPermissionAccess: require('../example/src/host/permissions')
    .getPermissionAccess,
  keyboard: require('../example/src/host/keyboard'),
  ...require('../example/src/host/externalUrl'),
});
