import { createLogger } from '@unif/react-native-logger';
import type { OperationContext } from '@unif/react-native-logger';
import { SDK_ERROR_TYPES, SAFE_ERROR_NAMES } from './constants';
const log = createLogger('location');
export function diagnoseLocation(
  phase: string,
  context: OperationContext,
  error?: unknown,
): void {
  let sdkType: string | undefined;
  let errorName: string | undefined;
  if (error && typeof error === 'object') {
    // 只读取数据属性与已知值；不执行 getter、不保留任意 message/stack/原生对象。
    const type = Object.getOwnPropertyDescriptor(error, 'type')?.value;
    const name = Object.getOwnPropertyDescriptor(error, 'name')?.value;
    if (typeof type === 'string' && SDK_ERROR_TYPES.has(type)) sdkType = type;
    if (typeof name === 'string' && SAFE_ERROR_NAMES.has(name))
      errorName = name;
  }
  const code =
    phase === 'observer_location' || phase === 'observer_stopped'
      ? 'location.observer_failed'
      : phase === 'invalid_coordinates'
        ? 'location.invalid_coordinates'
        : 'location.unavailable';
  log.warn(code, {
    context,
    phase,
    code,
    fields: {
      sdkType: sdkType ?? 'unknown',
      errorName: errorName ?? 'unknown',
    },
  });
}
