import { StyleSheet } from 'react-native';
import { fw, radius, type as typography } from '@unif/react-native-design';
import type { ColorTokens } from '@unif/react-native-design';

export const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    sourceTag: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      alignSelf: 'center',
      borderRadius: radius.sm,
      backgroundColor: colors.primaryContainer,
      color: colors.primary,
      fontSize: typography.nano,
      fontWeight: fw.regular,
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    rating: {
      color: colors.warning,
      fontSize: typography.nano,
      fontWeight: fw.semi,
    },
  });
