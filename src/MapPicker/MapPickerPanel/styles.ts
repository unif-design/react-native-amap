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
    panel: {
      flex: 1,
      minHeight: 0,
      marginTop: -radius['2xl'],
      backgroundColor: c.surface,
      borderTopLeftRadius: radius['2xl'],
      borderTopRightRadius: radius['2xl'],
      overflow: 'hidden',
    },
    head: { paddingHorizontal: 14, paddingTop: space[3] },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingTop: space[1],
      paddingBottom: space[3],
    },
    summaryIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: c.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryBody: { flex: 1, minWidth: 0 },
    title: {
      fontSize: typography.h3,
      fontWeight: fw.semi,
      color: c.foreground,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      minHeight: 60,
      marginBottom: space[2],
    },
    searchInput: { flex: 1, minWidth: 0 },
    searchButton: { alignSelf: 'center' },
    list: {
      paddingHorizontal: 14,
      paddingTop: space[1],
      paddingBottom: space[8],
    },
    label: {
      fontSize: typography.nano,
      color: c.foregroundSubtle,
      paddingVertical: space[2],
    },
    error: {
      backgroundColor: c.errorContainer,
      borderRadius: radius.md,
      paddingHorizontal: space[2],
      paddingVertical: space[1],
    },
    errorText: { color: c.error, fontSize: typography.xs },
    empty: {
      paddingVertical: 48,
      paddingHorizontal: space[4],
      alignItems: 'center',
    },
    retry: { marginTop: space[3], alignSelf: 'center' },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      borderRadius: radius.lg,
      paddingVertical: space[2],
      paddingLeft: space[3],
      paddingRight: space[2],
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    skeletonLines: { flex: 1, gap: space[2] },

    listScroll: { flex: 1 },
  });
