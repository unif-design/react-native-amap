import type { ReactNode, Ref } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import type { ConfirmOptions } from '@unif/react-native-design';
import type { CircleProps, MapViewProps, MapViewRef } from 'expo-gaode-map';
import type {
  GetCurrentLocationInput,
  GetCurrentLocationResult,
  LocationCoordinates,
} from '../location';
import type {
  PlaceQueryOptions,
  PlaceQueryResult,
  PlaceReadView,
  PlaceSearchPage,
} from '../places';

export interface MapSelection {
  coordinates: LocationCoordinates;
  place?: Omit<PlaceReadView, 'location'>;
}
export type MapPickerSelectionSource =
  'map' | 'search' | 'original' | 'location' | 'poi';
export interface MapPickerSelectionPresentation {
  title?: string;
  address?: string;
  source?: MapPickerSelectionSource;
}
export interface MapPickerHostProps {
  children?: ReactNode;
}
export interface MapPickerInitialInput extends Pick<
  MapViewProps,
  'initialCameraPosition'
> {
  initialLocationRequest?: GetCurrentLocationInput;
  initialQueryCenter?: LocationCoordinates;
  initialSelection?: MapSelection;
  initialSelectionPresentation?: MapPickerSelectionPresentation;
  selectInitialLocation?: boolean;
}
export interface MapPickerDisplayOptions extends Pick<
  MapViewProps,
  'scrollGesturesEnabled' | 'zoomGesturesEnabled' | 'myLocationEnabled'
> {
  circle?: CircleProps | null;
}
export interface MapPickerControls extends Pick<
  MapViewRef,
  'setCenter' | 'moveCamera' | 'setZoom' | 'getCameraPosition'
> {
  readonly signal: AbortSignal;
  updateDisplay(options: MapPickerDisplayOptions): void;
  setQueryCenter(center: LocationCoordinates): void;
  setSelection(
    selection: MapSelection | null,
    presentation?: MapPickerSelectionPresentation,
  ): boolean;
  loadCandidates(
    query: MapPickerCandidateQuery,
  ): Promise<PlaceQueryResult<PlaceSearchPage>>;
  restoreCandidates(): void;
  exitSearch(): void;
}
export interface MapPickerEvents extends Pick<
  MapViewProps,
  'onLoad' | 'onCameraMove' | 'onCameraIdle' | 'onMapPress' | 'onUserDragStart'
> {
  onRequestRelocate?(controls: MapPickerControls): void | Promise<void>;
  onSelectionChange?(selection: Readonly<MapSelection> | null): void;
  onUserDragEnd?(
    center: Readonly<LocationCoordinates>,
    controls: MapPickerControls,
  ): void | Promise<void>;
}
export interface MapPickerSearchInput {
  keyword: string;
  queryCenter?: LocationCoordinates;
  displayCenter?: LocationCoordinates;
}
export interface MapPickerSearchOptions {
  debounceMs: number;
  query(
    input: Readonly<MapPickerSearchInput>,
    options: PlaceQueryOptions,
  ): Promise<PlaceQueryResult<PlaceSearchPage>>;
  onClear?(controls: MapPickerControls): void | Promise<void>;
  onExit?(controls: MapPickerControls): void | Promise<void>;
}
export interface MapPickerPanelContext {
  selection: Readonly<MapSelection> | null;
  searchActive: boolean;
  controls: MapPickerControls;
}
export interface MapPickerPanelOptions {
  visible?: boolean;
  unselectedTitle?: string;
  renderAdditionalOptions?(context: Readonly<MapPickerPanelContext>): ReactNode;
}
export interface MapPickerConfirmAllowed {
  canConfirm: true;
}
export interface MapPickerConfirmBlocked {
  canConfirm: false;
  message: string;
}
export type MapPickerConfirmResult =
  MapPickerConfirmAllowed | MapPickerConfirmBlocked;
export interface MapPickerConfirmOptions {
  showCompleteButton?: boolean;
  beforeConfirm?(
    selection: Readonly<MapSelection>,
  ): MapPickerConfirmResult | Promise<MapPickerConfirmResult>;
  getConfirmationOptions?(selection: Readonly<MapSelection>): ConfirmOptions;
}
export interface MapPickerConfig
  extends MapPickerInitialInput, MapPickerEvents, MapPickerConfirmOptions {
  initialDisplay?: MapPickerDisplayOptions;
  search?: MapPickerSearchOptions;
  panel?: MapPickerPanelOptions;
  onReady?(controls: MapPickerControls): void | Promise<void>;
  onInitialLocationResult?(
    result: GetCurrentLocationResult,
    controls: MapPickerControls,
  ): void | Promise<void>;
}
export interface MapPickerCallOptions {
  signal?: AbortSignal;
}
export interface MapPickerProps extends MapPickerConfig {
  ref?: Ref<MapPickerControls>;
  onResult(result: MapPickerResult): void;
}
export interface MapPickerSuccess {
  status: 'success';
  selection: MapSelection;
}
export interface MapPickerCancelled {
  status: 'cancelled';
}
export type MapPickerErrorReason = 'invalid_input' | 'unavailable';
export interface MapPickerError {
  reason: MapPickerErrorReason;
  message: string;
}
export interface MapPickerFailed {
  status: 'failed';
  error: MapPickerError;
}
export type MapPickerResult =
  MapPickerSuccess | MapPickerCancelled | MapPickerFailed;

// Private handoff between this unit's session and its React consumer.
export type MapPickerCandidateQuery = (
  options: PlaceQueryOptions,
) => Promise<PlaceQueryResult<PlaceSearchPage>>;
export type MapPickerCandidateSource = 'scenario' | 'search';
export type MapPickerCameraEvent = Parameters<
  NonNullable<MapViewProps['onCameraIdle']>
>[0];
export interface MapPickerCandidateState {
  status: 'idle' | 'loading' | 'success' | 'failed' | 'cancelled' | 'exception';
  result?: PlaceQueryResult<PlaceSearchPage>;
  message?: string;
}
export interface MapPickerConfirmationRequest {
  id: number;
  options: ConfirmOptions;
}
export interface MapPickerState {
  display: MapPickerDisplayOptions;
  queryCenter?: LocationCoordinates;
  selection: MapSelection | null;
  selectionPresentation: MapPickerSelectionPresentation | null;
  scenario: MapPickerCandidateState;
  search: MapPickerCandidateState;
  candidateSource: MapPickerCandidateSource;
  searchActive: boolean;
  searchText: string;
  initialLocationPending: boolean;
  locationPermissionDenied: boolean;
  locationSettingsBusy: boolean;
  relocateBusy: boolean;
  completing: boolean;
  confirmation: MapPickerConfirmationRequest | null;
  localError: string | null;
  result: MapPickerResult | null;
}
export interface MapPickerQueryLane {
  cancel(): void;
  retry(): Promise<void>;
  run(
    query: MapPickerCandidateQuery,
  ): Promise<PlaceQueryResult<PlaceSearchPage>>;
}
export interface MapPickerOperationLease {
  epoch: number;
  controller: AbortController;
}
export interface MapPickerConfirmationAttempt {
  id: number;
  revision: number;
  selection: MapSelection;
  request?: MapPickerConfirmationRequest;
  settle?: (confirmed: boolean) => void;
  binding?: object;
  release?: () => void;
}
export interface MapPickerSession {
  readonly validInput: boolean;
  config: Readonly<MapPickerConfig>;
  store: StoreApi<MapPickerState>;
  controls: MapPickerControls;
  events: Pick<
    MapViewProps,
    | 'onLoad'
    | 'onCameraMove'
    | 'onCameraIdle'
    | 'onMapPress'
    | 'onUserDragStart'
    | 'onUserDragEnd'
  >;
  activate(): void;
  deactivate(): void;
  attachMap(map: MapViewRef | null): void;
  enterSearch(): void;
  changeSearchText(text: string): void;
  retryCandidates(): Promise<void>;
  selectCandidate(place: PlaceReadView): void;
  requestRelocate(): Promise<void>;
  openLocationSettings(): Promise<void>;
  complete(): Promise<void>;
  reportOperationError(): void;
  cancel(): void;
  failUnavailable(): void;
  bindConfirmation(
    request: MapPickerConfirmationRequest,
    confirm: (options: ConfirmOptions) => Promise<boolean>,
    release: () => void,
  ): () => void;
}

export interface MapPickerContentProps {
  session: MapPickerSession;
}
export interface MapPickerModalProps
  extends MapPickerContentProps, MapPickerHostProps {}
export interface MapPickerHostBinding {
  mounted: boolean;
  generation: number;
}
export interface MapPickerPresentation {
  id: number;
  host: MapPickerHostBinding;
  session: MapPickerSession;
}
export interface MapPickerRuntimeState {
  hosts: MapPickerHostBinding[];
  presentation: MapPickerPresentation | null;
  sequence: number;
}
