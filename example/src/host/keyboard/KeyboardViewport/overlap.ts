import type { KeyboardMetrics, LayoutRectangle } from 'react-native';

export function overlap(
  region: LayoutRectangle,
  keyboard: KeyboardMetrics,
  bottomOffset: number,
): number {
  const { x, y, width, height } = region;
  const {
    screenX,
    screenY,
    width: keyboardWidth,
    height: keyboardHeight,
  } = keyboard;
  if (
    ![
      x,
      y,
      width,
      height,
      screenX,
      screenY,
      keyboardWidth,
      keyboardHeight,
    ].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    keyboardWidth <= 0 ||
    keyboardHeight <= 0 ||
    x + width <= screenX ||
    x >= screenX + keyboardWidth ||
    y + height < screenY ||
    y >= screenY + keyboardHeight
  )
    return 0;
  const offset =
    Number.isFinite(bottomOffset) && bottomOffset >= 0 ? bottomOffset : 0;
  return Math.min(height, Math.max(0, y + height - screenY + offset));
}
