import type { LocationCoordinates } from '../location';
import { omitUndefined, record } from './preparePlaceQuery';
import type {
  PlaceReadView,
  PlaceSearchPage,
  PlaceBusinessDetails,
  PlacePhoto,
  PlaceIndoorDetails,
  PlaceAddressComponent,
  PlaceBusinessArea,
  PlaceStreetNumber,
  PlaceRoad,
  PlaceRoadCross,
  PlaceArea,
  ReverseGeocodeData,
} from './types';
function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
function distance(value: unknown): number | undefined {
  const result = number(value);
  return result !== undefined && result >= 0 ? result : undefined;
}
function boolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
function nested<T>(
  value: unknown,
  convert: (source: unknown) => T,
): T | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? convert(value)
    : undefined;
}
function list<T>(
  value: unknown,
  convert: (source: unknown) => T,
): T[] | undefined {
  return Array.isArray(value) ? Array.from(value, convert) : undefined;
}
function coordinates(value: unknown): Partial<LocationCoordinates> {
  const source = record(value);
  const latitude = number(source.latitude);
  const longitude = number(source.longitude);
  return omitUndefined({
    latitude:
      latitude !== undefined && latitude >= -90 && latitude <= 90
        ? latitude
        : undefined,
    longitude:
      longitude !== undefined && longitude >= -180 && longitude <= 180
        ? longitude
        : undefined,
  });
}
function business(value: unknown): PlaceBusinessDetails {
  const source = record(value);
  return omitUndefined({
    openTime: text(source.opentime),
    openTimeToday: text(source.opentimeToday),
    rating: text(source.rating),
    cost: text(source.cost),
    parkingType: text(source.parkingType),
    tag: text(source.tag),
    tel: text(source.tel),
    alias: text(source.alias),
    businessArea: text(source.businessArea),
  });
}
function photo(value: unknown): PlacePhoto {
  const source = record(value);
  return omitUndefined({ title: text(source.title), url: text(source.url) });
}
function indoor(value: unknown): PlaceIndoorDetails {
  const source = record(value);
  const floor = text(source.floor) ?? number(source.floor);
  return omitUndefined({
    floor: floor === undefined ? undefined : String(floor),
    floorName: text(source.floorName),
    poiId: text(source.poiId),
    hasIndoorMap: boolean(source.hasIndoorMap),
  });
}
export function convertPlace(value: unknown): PlaceReadView {
  const source = record(value);
  return omitUndefined({
    id: text(source.id),
    name: text(source.name),
    address: text(source.address),
    location: nested(source.location, coordinates),
    typeCode: text(source.typeCode),
    typeDescription: text(source.typeDes),
    tel: text(source.tel),
    distanceMeters: distance(source.distance),
    cityName: text(source.cityName),
    cityCode: text(source.cityCode),
    provinceName: text(source.provinceName),
    districtName: text(source.adName),
    districtCode: text(source.adCode),
    businessArea: text(source.businessArea),
    parkingType: text(source.parkingType),
    website: text(source.website),
    email: text(source.email),
    postcode: text(source.postcode),
    direction: text(source.direction),
    hasIndoorMap: boolean(source.hasIndoorMap),
    business: nested(source.business, business),
    photos: list(source.photos, photo),
    indoor: nested(source.indoor, indoor),
  });
}
export function convertPlacePage(value: unknown): PlaceSearchPage {
  const source = record(value);
  return omitUndefined({
    items: list(source.pois, convertPlace),
    total: number(source.total),
    page: number(source.pageNum),
    pageSize: number(source.pageSize),
    pageCount: number(source.pageCount),
  });
}
function businessArea(value: unknown): PlaceBusinessArea {
  const source = record(value);
  return omitUndefined({
    name: text(source.name),
    location: nested(source.location, coordinates),
  });
}
function streetNumber(value: unknown): PlaceStreetNumber {
  const source = record(value);
  return omitUndefined({
    street: text(source.street),
    number: text(source.number),
    location: nested(source.location, coordinates),
    direction: text(source.direction),
    distanceMeters: distance(source.distance),
  });
}
function addressComponent(value: unknown): PlaceAddressComponent {
  const source = record(value);
  return omitUndefined({
    country: text(source.country),
    countryCode: text(source.countryCode),
    province: text(source.province),
    city: text(source.city),
    district: text(source.district),
    township: text(source.township),
    townshipCode: text(source.towncode),
    neighborhood: text(source.neighborhood),
    building: text(source.building),
    cityCode: text(source.cityCode),
    districtCode: text(source.adCode),
    streetNumber: nested(source.streetNumber, streetNumber),
    businessAreas: list(source.businessAreas, businessArea),
  });
}
function road(value: unknown): PlaceRoad {
  const source = record(value);
  return omitUndefined({
    id: text(source.id),
    name: text(source.name),
    location: nested(source.location, coordinates),
    distanceMeters: distance(source.distance),
    direction: text(source.direction),
  });
}
function roadCross(value: unknown): PlaceRoadCross {
  const source = record(value);
  return omitUndefined({
    location: nested(source.location, coordinates),
    distanceMeters: distance(source.distance),
    direction: text(source.direction),
    firstRoadId: text(source.firstId),
    firstRoadName: text(source.firstName),
    secondRoadId: text(source.secondId),
    secondRoadName: text(source.secondName),
  });
}
function area(value: unknown): PlaceArea {
  const source = record(value);
  return omitUndefined({
    id: text(source.id),
    name: text(source.name),
    districtCode: text(source.adCode),
    location: nested(source.location, coordinates),
    area: number(source.area),
  });
}
export function convertReverseGeocode(
  value: unknown,
  includeExtensions: boolean,
): ReverseGeocodeData {
  const source = record(value);
  const base = omitUndefined({
    formattedAddress: text(source.formattedAddress),
    addressComponent: nested(source.addressComponent, addressComponent),
  });
  return includeExtensions
    ? omitUndefined({
        ...base,
        places: list(source.pois, convertPlace),
        roads: list(source.roads, road),
        roadCrosses: list(source.roadCrosses, roadCross),
        areas: list(source.aois, area),
      })
    : base;
}
