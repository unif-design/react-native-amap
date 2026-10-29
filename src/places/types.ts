import type { LocationCoordinates } from '../location';

export interface PlacePageInput {
  page: number;
  pageSize: number;
}

export interface SearchAroundInput extends PlacePageInput {
  center: LocationCoordinates;
  radiusMeters: number;
  keyword: string;
  categories?: readonly string[];
}

export interface SearchByKeywordInput extends PlacePageInput {
  keyword: string;
  city?: string;
  categories?: readonly string[];
  center?: LocationCoordinates;
  sortByDistance?: boolean;
}

export interface ReverseGeocodeInput {
  location: LocationCoordinates;
  radiusMeters: number;
  includeExtensions: boolean;
}

export interface PlaceQueryOptions {
  signal?: AbortSignal;
}

export interface PlaceBusinessDetails {
  openTime?: string;
  openTimeToday?: string;
  rating?: string;
  cost?: string;
  parkingType?: string;
  tag?: string;
  tel?: string;
  alias?: string;
  businessArea?: string;
}

export interface PlacePhoto {
  title?: string;
  url?: string;
}

export interface PlaceIndoorDetails {
  floor?: string;
  floorName?: string;
  poiId?: string;
  hasIndoorMap?: boolean;
}

export interface PlaceReadView {
  id?: string;
  name?: string;
  address?: string;
  location?: Partial<LocationCoordinates>;
  typeCode?: string;
  typeDescription?: string;
  tel?: string;
  distanceMeters?: number;
  cityName?: string;
  cityCode?: string;
  provinceName?: string;
  districtName?: string;
  districtCode?: string;
  businessArea?: string;
  parkingType?: string;
  website?: string;
  email?: string;
  postcode?: string;
  direction?: string;
  hasIndoorMap?: boolean;
  business?: PlaceBusinessDetails;
  photos?: readonly PlacePhoto[];
  indoor?: PlaceIndoorDetails;
}

export interface PlaceSearchPage {
  items?: readonly PlaceReadView[];
  total?: number;
  page?: number;
  pageSize?: number;
  pageCount?: number;
}

export interface PlaceBusinessArea {
  name?: string;
  location?: Partial<LocationCoordinates>;
}

export interface PlaceStreetNumber {
  street?: string;
  number?: string;
  location?: Partial<LocationCoordinates>;
  direction?: string;
  distanceMeters?: number;
}

export interface PlaceAddressComponent {
  country?: string;
  countryCode?: string;
  province?: string;
  city?: string;
  district?: string;
  township?: string;
  townshipCode?: string;
  neighborhood?: string;
  building?: string;
  cityCode?: string;
  districtCode?: string;
  streetNumber?: PlaceStreetNumber;
  businessAreas?: readonly PlaceBusinessArea[];
}

export interface PlaceRoad {
  id?: string;
  name?: string;
  location?: Partial<LocationCoordinates>;
  distanceMeters?: number;
  direction?: string;
}

export interface PlaceRoadCross {
  location?: Partial<LocationCoordinates>;
  distanceMeters?: number;
  direction?: string;
  firstRoadId?: string;
  firstRoadName?: string;
  secondRoadId?: string;
  secondRoadName?: string;
}

export interface PlaceArea {
  id?: string;
  name?: string;
  districtCode?: string;
  location?: Partial<LocationCoordinates>;
  area?: number;
}

export interface ReverseGeocodeData {
  formattedAddress?: string;
  addressComponent?: PlaceAddressComponent;
  places?: readonly PlaceReadView[];
  roads?: readonly PlaceRoad[];
  roadCrosses?: readonly PlaceRoadCross[];
  areas?: readonly PlaceArea[];
}

export type PlaceQueryErrorReason =
  'invalid_input' | 'unsupported' | 'unavailable';

export interface PlaceQueryError {
  reason: PlaceQueryErrorReason;
  message: string;
}

export interface PlaceQuerySuccess<T> {
  status: 'success';
  data: T;
}

export interface PlaceQueryCancelled {
  status: 'cancelled';
}

export interface PlaceQueryFailed {
  status: 'failed';
  error: PlaceQueryError;
}

export type PlaceQueryResult<T> =
  PlaceQuerySuccess<T> | PlaceQueryCancelled | PlaceQueryFailed;

export type PlaceOperation =
  'searchAround' | 'searchByKeyword' | 'getPoiById' | 'reverseGeocode';
export interface PlaceInputRecord {
  [field: string]: unknown;
}
