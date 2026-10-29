import type { AmapHost } from './types';
let host: AmapHost | undefined;
export function configureAmapHost(value: AmapHost): void {
  host = value;
}
export function getAmapHost(): AmapHost {
  if (!host) throw new Error('请先调用 configureAmapHost 配置地图宿主');
  return host;
}
