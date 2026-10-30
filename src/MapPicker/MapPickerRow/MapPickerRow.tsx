import { CheckOutlined } from '@unif/react-native-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useColors, useThemedStyles } from '@unif/react-native-design';
import { makeStyles } from './styles';
import type { MapPickerRowProps } from './types';

export function MapPickerRow({
  title,
  address,
  icon,
  titleExtra,
  descriptionExtra,
  distance,
  selected = false,
  summary = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  onSelect,
}: MapPickerRowProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const content = (
    <>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, summary && styles.summaryTitle]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {titleExtra}
        </View>
        <View style={styles.descriptionRow}>
          {descriptionExtra}
          {distance ? (
            <>
              <Text style={styles.distance}>{distance}</Text>
              <Text style={styles.address}>·</Text>
            </>
          ) : null}
          <Text style={styles.address} numberOfLines={1}>
            {address}
          </Text>
        </View>
      </View>
    </>
  );
  return (
    <View
      style={[
        styles.row,
        selected && styles.rowSelected,
        summary && styles.summary,
      ]}
    >
      {onSelect ? (
        <Pressable
          style={styles.action}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ??
            [title, distance, address].filter(Boolean).join('，')
          }
          accessibilityHint={accessibilityHint}
          accessibilityState={{ selected, disabled }}
          onPress={onSelect}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.action}>{content}</View>
      )}
      {!summary ? (
        <View style={styles.check}>
          {selected ? <CheckOutlined color={colors.primary} size={18} /> : null}
        </View>
      ) : null}
    </View>
  );
}
