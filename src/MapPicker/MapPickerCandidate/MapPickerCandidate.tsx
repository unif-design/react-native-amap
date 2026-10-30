import React from 'react';
import { Text, View } from 'react-native';
import { useColors, useThemedStyles } from '@unif/react-native-design';
import {
  candidateSelected,
  placeDistance,
  placeAddress,
  placeTitle,
  selectableCoordinates,
} from '../placePresentation';
import { makeStyles } from './styles';
import type { MapPickerCandidateProps } from './types';
import { MapPickerGlyph } from '../MapPickerGlyph/MapPickerGlyph';
import { MapPickerRow } from '../MapPickerRow';
import { MAP_PLACE_CATEGORIES, MAP_SELECTION_SOURCE_LABELS } from './constants';
import { placeCategory } from './placeCategory';

export function MapPickerCandidate({
  place,
  selection,
  presentation,
  summary = false,
  onSelect,
}: MapPickerCandidateProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const selected = !summary && candidateSelected(place, selection ?? null);
  const displayPresentation = summary || selected ? presentation : undefined;
  const category = placeCategory(place.typeCode);
  const metadata = MAP_PLACE_CATEGORIES[category];
  const rawRating = place.business?.rating;
  const rating =
    rawRating?.trim() && Number.isFinite(Number(rawRating))
      ? Number(rawRating).toFixed(1)
      : undefined;
  const distance = placeDistance(place.distanceMeters);
  const presentationTitle = displayPresentation?.title?.trim();
  const presentationAddress = displayPresentation?.address?.trim();
  const hasPlaceDetails = Object.keys(place).some((key) => key !== 'location');
  const title = place.name?.trim()
    ? place.name
    : presentationTitle || presentationAddress || placeTitle(place);
  const address =
    placeAddress(place) ||
    (place.name?.trim() || presentationTitle ? presentationAddress : '') ||
    (summary && !hasPlaceDetails ? '' : metadata.label);
  const source =
    summary && displayPresentation?.source
      ? MAP_SELECTION_SOURCE_LABELS[displayPresentation.source]
      : undefined;
  return (
    <MapPickerRow
      title={title}
      address={address}
      distance={distance}
      selected={selected}
      summary={summary}
      disabled={!selectableCoordinates(place)}
      onSelect={onSelect}
      accessibilityLabel={[
        title,
        source,
        rating ? `评分${rating}` : '',
        distance,
        address,
      ]
        .filter(Boolean)
        .join('，')}
      accessibilityHint="选择此地点并移动地图"
      icon={
        <MapPickerGlyph
          name={summary ? 'selection' : category}
          color={summary ? colors.primary : colors[metadata.color]}
        />
      }
      titleExtra={
        <>
          {rating ? (
            <View style={styles.ratingRow}>
              <MapPickerGlyph name="rating" color={colors.warning} size={12} />
              <Text style={styles.rating}>{rating}</Text>
            </View>
          ) : null}
        </>
      }
      descriptionExtra={
        source ? (
          <Text numberOfLines={1} style={styles.sourceTag}>
            {source}
          </Text>
        ) : null
      }
    />
  );
}
