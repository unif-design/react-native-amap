import React from 'react';
import { View } from 'react-native';
import { Skeleton, useThemedStyles } from '@unif/react-native-design';
import { makeStyles } from './styles';

export function MapPickerSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      {[0, 1, 2, 3].map((index) => (
        <View
          style={styles.skeletonRow}
          key={index}
          testID={`map-poi-skeleton-row-${index}`}
        >
          <Skeleton shape="rect" width={38} height={38} radius={8} />
          <View style={styles.skeletonLines}>
            <Skeleton shape="line" width="52%" height={10} />
            <Skeleton shape="line" width="78%" height={10} />
          </View>
        </View>
      ))}
    </>
  );
}
