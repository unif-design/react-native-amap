import React, { useLayoutEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastHost } from '@unif/react-native-design';
import { getAmapHost } from '../host';
import { MapPickerContent } from './MapPickerContent';
import type { MapPickerModalProps } from './types';
import { hostStyles } from './styles';

export function MapPickerModal({ session, children }: MapPickerModalProps) {
  const { KeyboardPresentationScope, useKeyboardPresentation } =
    getAmapHost().keyboard;
  const active = useKeyboardPresentation(true);
  const [shown, setShown] = useState(false);
  const alive = useRef(false);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={session.cancel}
      onShow={() => {
        if (alive.current) setShown(true);
      }}
    >
      <KeyboardPresentationScope active={active && shown}>
        <GestureHandlerRootView style={hostStyles.root}>
          <SafeAreaProvider>
            {children ?? <ToastHost />}
            <MapPickerContent session={session} />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </KeyboardPresentationScope>
    </Modal>
  );
}
