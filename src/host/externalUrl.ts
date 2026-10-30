import { getAmapHost } from './index';
export function canOpenExternalUrl(url: string): Promise<boolean> {
  return getAmapHost().canOpenExternalUrl(url);
}
export function openExternalUrl(url: string): Promise<void> {
  return getAmapHost().openExternalUrl(url);
}
