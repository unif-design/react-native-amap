import React, { useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useKeyboardPresentationActivity } from '../KeyboardPresentationScope/useKeyboardPresentation';
import { styles } from './styles';
import type { KeyboardBrowserGlobals, KeyboardViewportProps } from './types';

export function KeyboardViewport({
  children,
  active: requestedActive = true,
  mode = 'resize',
  bottomOffset = 0,
  style,
  testID,
}: KeyboardViewportProps): React.JSX.Element {
  const presentationActive = useKeyboardPresentationActivity();
  const active = requestedActive && presentationActive;
  const region = useRef<React.ComponentRef<typeof View>>(null);
  const request = useRef<(() => void) | null>(null);
  const [padding, setPadding] = useState(0);

  useLayoutEffect(() => {
    const browser = (globalThis as unknown as KeyboardBrowserGlobals).window;
    if (
      !browser ||
      typeof browser.addEventListener !== 'function' ||
      typeof browser.removeEventListener !== 'function'
    )
      return;
    const viewport = browser.visualViewport;
    let alive = true;
    let measurement = 0;
    function measure() {
      const current = ++measurement;
      if (!alive) return;
      if (mode === 'external') {
        setPadding(0);
        return;
      }
      const bottom = viewport
        ? viewport.offsetTop + viewport.height
        : browser!.innerHeight;
      const left = viewport?.offsetLeft ?? 0;
      const visibleWidth = viewport?.width ?? browser!.innerWidth;
      region.current?.measureInWindow((x, y, width, height) => {
        if (!alive || current !== measurement) return;
        if (
          ![x, y, width, height, bottom, left, visibleWidth].every(
            Number.isFinite,
          ) ||
          width <= 0 ||
          height <= 0 ||
          bottom <= 0 ||
          visibleWidth <= 0
        ) {
          if (active) setPadding(0);
          return;
        }
        const constrained = viewport
          ? viewport.height < browser!.innerHeight
          : y + height > bottom;
        if (!constrained) {
          setPadding(0);
          return;
        }
        if (!active) return;
        const offset =
          Number.isFinite(bottomOffset) && bottomOffset >= 0 ? bottomOffset : 0;
        const intersects =
          x + width > left && x < left + visibleWidth && y + height >= bottom;
        setPadding(
          intersects
            ? Math.min(height, Math.max(0, y + height - bottom + offset))
            : 0,
        );
      });
    }
    request.current = measure;
    browser.addEventListener('resize', measure);
    browser.addEventListener('scroll', measure, true);
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    measure();
    return () => {
      alive = false;
      ++measurement;
      request.current = null;
      browser.removeEventListener('resize', measure);
      browser.removeEventListener('scroll', measure, true);
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
    };
  }, [active, mode, bottomOffset]);

  const appliedPadding = mode === 'external' ? 0 : padding;

  return (
    <View
      ref={region}
      style={[styles.region, style]}
      testID={testID}
      onLayout={() => request.current?.()}
    >
      <View style={[styles.content, { paddingBottom: appliedPadding }]}>
        {children}
      </View>
    </View>
  );
}
