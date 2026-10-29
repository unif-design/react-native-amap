import { StyleSheet } from 'react-native';
import { radius, space, type as typography } from '@unif/react-native-design';
import type { ColorTokens, ShadowTokens } from '@unif/react-native-design';

export const hostStyles = StyleSheet.create({ root: { flex: 1 } });

export const makeStyles = (c: ColorTokens, shadow: ShadowTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    map: { flex: 1 },
    mapBlock: { overflow: 'hidden' },
    toolbar: {
      position: 'absolute',
      left: space[3],
      right: space[3],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.outline,
      ...shadow.card,
    },
    floating: {
      position: 'absolute',
      right: space[3],
      bottom: space[3],
      gap: space[2],
    },
    floatingAbovePanel: { marginBottom: radius['2xl'] },
    square: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.outline,
      ...shadow.card,
    },
    status: {
      position: 'absolute',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      borderRadius: radius.pill,
      height: 40,
      paddingLeft: 13,
      paddingRight: space[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.outline,
      ...shadow.card,
    },
    statusText: { color: c.foreground, fontSize: typography.xs },
    statusMaterial: { borderRadius: radius.pill },
    pin: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinInner: { marginBottom: 50, alignItems: 'center' },
    pinShadow: {
      width: 12,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.mapPinShadow,
      marginTop: -2,
    },
    error: {
      backgroundColor: c.errorContainer,
      borderRadius: radius.md,
      paddingHorizontal: space[2],
      paddingVertical: space[1],
    },
    errorText: { color: c.error, fontSize: typography.xs },
    mapError: {
      position: 'absolute',
      bottom: space[3],
      left: space[3],
      right: 64,
    },
  });
