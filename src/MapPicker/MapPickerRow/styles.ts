import { StyleSheet } from 'react-native';
import {
  fw,
  radius,
  space,
  type as typography,
} from '@unif/react-native-design';
import type { ColorTokens } from '@unif/react-native-design';

export const makeStyles = (c: ColorTokens) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingVertical: space[2],
      paddingLeft: space[3],
      paddingRight: space[2],
      borderRadius: radius.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.outline,
    },
    rowSelected: {
      backgroundColor: c.primaryContainerSubtle,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: c.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summary: { borderBottomWidth: 0 },
    action: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    body: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
    title: {
      fontSize: typography.sm,
      fontWeight: fw.medium,
      color: c.foreground,
      flexShrink: 1,
    },
    summaryTitle: { fontSize: typography.h3 },
    descriptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 3,
    },
    distance: {
      color: c.primary,
      fontSize: typography.nano,
      fontWeight: fw.medium,
    },
    address: {
      color: c.foregroundSubtle,
      fontSize: typography.nano,
      flexShrink: 1,
    },
    check: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
