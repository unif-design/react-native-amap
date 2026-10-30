import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { findNodeHandle, Keyboard, View } from 'react-native';
import {
  KeyboardControllerNative,
  KeyboardEvents,
  useGenericKeyboardHandler,
  useWindowDimensions,
} from 'react-native-keyboard-controller';
import { scheduleOnRN } from 'react-native-worklets';
import type { NativeEvent } from 'react-native-keyboard-controller';
import type { KeyboardEvent } from 'react-native';
import { useKeyboardPresentationActivity } from '../KeyboardPresentationScope/useKeyboardPresentation';
import { overlap } from './overlap';
import { styles } from './styles';
import type { KeyboardViewportProps } from './types';

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
  const keyboard = useRef(Keyboard.metrics());
  const visibleAnchor = useRef(keyboard.current);
  const fullExtent = useRef<number | undefined>(undefined);
  const motionHeight = useRef<number | undefined>(undefined);
  const hiding = useRef(false);
  const request = useRef<
    ((event?: NativeEvent, phase?: 'start' | 'end') => void) | null
  >(null);
  const [padding, setPadding] = useState(0);
  const { width, height } = useWindowDimensions();
  const remeasure = useCallback(() => request.current?.(), []);
  const move = useCallback(
    (event: NativeEvent) => request.current?.(event),
    [],
  );
  const start = useCallback(
    (event: NativeEvent) => request.current?.(event, 'start'),
    [],
  );

  const finish = useCallback(
    (event: NativeEvent) => request.current?.(event, 'end'),
    [],
  );

  useGenericKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';
        scheduleOnRN(start, event);
      },
      onMove: (event) => {
        'worklet';
        scheduleOnRN(move, event);
      },
      onInteractive: (event) => {
        'worklet';
        scheduleOnRN(move, event);
      },
      onEnd: (event) => {
        'worklet';
        scheduleOnRN(finish, event);
      },
    },
    [move, start, finish],
  );

  useLayoutEffect(() => {
    let alive = true;
    let measurement = 0;
    function measure(event?: NativeEvent, phase?: 'start' | 'end') {
      if (event) {
        if (
          !Number.isFinite(event.height) ||
          !Number.isFinite(event.progress) ||
          event.height < 0 ||
          event.progress < 0
        )
          return;
        if (phase === 'start') {
          // onStart reports a destination, never the current keyboard position.
          hiding.current = event.height === 0;
          if (hiding.current) keyboard.current = visibleAnchor.current;
          ++measurement;
          return;
        }
        if (event.progress > 0) {
          const extent = event.height / event.progress;
          if (!Number.isFinite(extent) || extent <= 0) return;
          fullExtent.current = extent;
        } else if (event.height !== 0) {
          return;
        }
        motionHeight.current = event.height;
        if (phase === 'end' && event.height > 0) {
          visibleAnchor.current = keyboard.current;
        }
      }
      const current = ++measurement;
      if (!active || mode === 'external') return;
      const anchor = keyboard.current;
      // Subtract quantities from the same SDK coordinate convention. Its full
      // extent can include a different navigation/accessory area than RN height.
      const frame =
        anchor && motionHeight.current === 0
          ? { ...anchor, height: 0 }
          : anchor &&
              fullExtent.current !== undefined &&
              motionHeight.current !== undefined
            ? {
                ...anchor,
                screenY:
                  anchor.screenY + fullExtent.current - motionHeight.current,
              }
            : anchor;
      const tag = findNodeHandle(region.current);
      if (!frame || tag == null) {
        setPadding(0);
        return;
      }
      KeyboardControllerNative.viewPositionInWindow(tag).then(
        (position) => {
          if (alive && current === measurement)
            setPadding(overlap(position, frame, bottomOffset));
        },
        () => {
          // A missing/unattached host is not a usable window measurement.
          if (alive && current === measurement) setPadding(0);
        },
      );
    }
    function updateFrame(event: KeyboardEvent, settled = false) {
      if (!alive || hiding.current) return;
      const previous = keyboard.current;
      const frame = event.endCoordinates;
      const changed =
        !previous ||
        frame.screenX !== previous.screenX ||
        frame.screenY !== previous.screenY ||
        frame.width !== previous.width ||
        frame.height !== previous.height;
      keyboard.current = frame;
      if (settled || !visibleAnchor.current) visibleAnchor.current = frame;
      if (changed || settled) {
        // A new RN endpoint starts a fresh coordinate anchor; old movement must
        // not be replayed against a different keyboard frame/window geometry.
        fullExtent.current = undefined;
        motionHeight.current = undefined;
      }
      measure();
    }
    request.current = measure;
    const subscriptions = [
      Keyboard.addListener('keyboardWillShow', (event) => {
        if (!alive) return;
        hiding.current = false;
        updateFrame(event);
      }),
      Keyboard.addListener('keyboardDidShow', (event) => {
        if (!alive) return;
        hiding.current = false;
        updateFrame(event, true);
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        if (!alive) return;
        hiding.current = true;
        keyboard.current = visibleAnchor.current;
        ++measurement;
      }),
      Keyboard.addListener('keyboardWillChangeFrame', (event) =>
        updateFrame(event),
      ),
      Keyboard.addListener('keyboardDidChangeFrame', (event) =>
        updateFrame(event, true),
      ),
      // RN Android's didHide comes from layout; SDK didHide follows IME animation end.
      KeyboardEvents.addListener('keyboardDidHide', () => {
        if (!alive) return;
        ++measurement;
        keyboard.current = undefined;
        visibleAnchor.current = undefined;
        fullExtent.current = undefined;
        motionHeight.current = undefined;
        hiding.current = false;
        setPadding(0);
      }),
    ];
    if (mode === 'external') setPadding(0);
    measure();
    return () => {
      alive = false;
      ++measurement;
      request.current = null;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [active, mode, bottomOffset, width, height]);

  const appliedPadding = mode === 'external' ? 0 : padding;

  return (
    <View
      ref={region}
      collapsable={false}
      style={[styles.region, style]}
      testID={testID}
      onLayout={remeasure}
    >
      <View style={[styles.content, { paddingBottom: appliedPadding }]}>
        {children}
      </View>
    </View>
  );
}
