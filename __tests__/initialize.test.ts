import { Platform } from 'react-native';

const mockInit = jest.fn();
const mockPrivacy = jest.fn();
const mockLogging = jest.fn();
const mockWarn = jest.fn();
jest.mock('@unif/react-native-logger', () => ({
  createLogger: () => ({ warn: mockWarn }),
}));
jest.mock('expo-gaode-map', () => ({
  ExpoGaodeMapModule: { setPrivacyConfig: mockPrivacy, initSDK: mockInit },
  ErrorLogger: { setEnabled: mockLogging },
}));
jest.mock('react-native-config', () => ({ __esModule: true, default: {} }), {
  virtual: true,
});

beforeEach(() => {
  jest.resetModules();
});
test.each(['ios', 'android'] as const)(
  '宿主传入的 %s key 原样交付，隐私和日志顺序保持原行为且仅尝试一次',
  (platform) => {
    const native = require('react-native') as { Platform: typeof Platform };
    jest.replaceProperty(native.Platform, 'OS', platform);
    const { initializeGaode } = require('../src/initialization');
    initializeGaode({
      iosKey: ' fixture-ios ',
      androidKey: ' fixture-android ',
    });
    initializeGaode({ iosKey: 'changed', androidKey: 'changed' });
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      platform === 'ios'
        ? { iosKey: ' fixture-ios ' }
        : { androidKey: ' fixture-android ' },
    );
    expect(mockPrivacy).toHaveBeenCalledWith({
      hasShow: true,
      hasContainsPrivacy: true,
      hasAgree: true,
    });
    expect(mockLogging).toHaveBeenCalledWith(false);
    expect(mockLogging.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrivacy.mock.invocationCallOrder[0],
    );
    expect(mockPrivacy.mock.invocationCallOrder[0]).toBeLessThan(
      mockInit.mock.invocationCallOrder[0],
    );
  },
);
test('缺少 key 的首次尝试不自动重试或写入隐私状态', () => {
  const { initializeGaode } = require('../src/initialization');
  initializeGaode({});
  initializeGaode({ iosKey: 'fixture', androidKey: 'fixture' });
  expect(mockInit).not.toHaveBeenCalled();
  expect(mockPrivacy).not.toHaveBeenCalled();
  expect(mockWarn).toHaveBeenCalledWith('gaode.unavailable', {
    phase: 'configuration',
    code: 'gaode.key_missing',
  });
});
test('SDK 抛错沿用 unavailable 诊断，不泄漏 key 或自动重试', () => {
  mockInit.mockImplementationOnce(() => {
    throw new Error('secret key');
  });
  const { initializeGaode } = require('../src/initialization');
  initializeGaode({ iosKey: 'fixture', androidKey: 'fixture' });
  initializeGaode({ iosKey: 'fixture', androidKey: 'fixture' });
  expect(mockInit).toHaveBeenCalledTimes(1);
  expect(mockWarn).toHaveBeenCalledWith('gaode.unavailable', {
    phase: 'initialize',
    code: 'gaode.unavailable',
  });
});
