import type * as GaodeSdk from 'expo-gaode-map';
import { Platform } from 'react-native';
import type { AmapKeys } from '../host/types';
import { createLogger } from '@unif/react-native-logger';

// 与共享 SDK 同一运行期去重尝试，避免 StrictMode 重放构造自动重试。
// 这不是 SDK 健康状态；能力始终读取 SDK 的公开状态。
let attempted = false;
const log = createLogger('bootstrap.gaode');
export function initializeGaode(keys: AmapKeys): void {
  if (attempted) return;
  attempted = true;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const key = Platform.OS === 'ios' ? keys.iosKey : keys.androidKey;
  if (typeof key !== 'string' || !key.trim()) {
    log.warn('gaode.unavailable', {
      phase: 'configuration',
      code: 'gaode.key_missing',
    });
    return;
  }
  try {
    const { ExpoGaodeMapModule: sdk, ErrorLogger } =
      require('expo-gaode-map') as typeof GaodeSdk;
    ErrorLogger.setEnabled(false);
    sdk.setPrivacyConfig({
      hasShow: true,
      hasContainsPrivacy: true,
      hasAgree: true,
    });
    sdk.initSDK(Platform.OS === 'ios' ? { iosKey: key } : { androidKey: key });
  } catch {
    log.warn('gaode.unavailable', {
      phase: 'initialize',
      code: 'gaode.unavailable',
    });
  }
}
