import { createStore } from 'zustand/vanilla';
import { toast } from '@unif/react-native-design';
import type { MapViewRef } from 'expo-gaode-map';
import { getCurrentLocation } from '../location';
import { getPermissionAccess } from '../host/permissions';
import type { GetCurrentLocationResult } from '../location';
import { createCandidateLane } from './createCandidateLane';
import { MAP_PICKER_MESSAGES } from './constants';
import {
  invalidInput,
  snapshotConfig,
  snapshotDisplay,
  snapshotSelection,
  snapshotSelectionPresentation,
  snapshotValue,
  validateCamera,
  validateCoordinates,
  validatePoint,
} from './snapshotMapPickerInput';
import type {
  MapPickerConfig,
  MapPickerCameraEvent,
  MapPickerConfirmationAttempt,
  MapPickerControls,
  MapPickerOperationLease,
  MapPickerResult,
  MapPickerSelectionPresentation,
  MapPickerSession,
  MapPickerState,
  MapSelection,
} from './types';

export function createMapPickerSession(
  input: MapPickerConfig,
  onResult: (result: MapPickerResult) => void,
): MapPickerSession {
  let invalid = false;
  let config: MapPickerConfig;
  try {
    config = snapshotConfig(input);
  } catch {
    config = snapshotConfig({});
    invalid = true;
  }
  const store = createStore<MapPickerState>(() => ({
    display: snapshotValue({
      scrollGesturesEnabled: true,
      zoomGesturesEnabled: true,
      circle: null,
      ...Object.fromEntries(
        Object.entries(config.initialDisplay ?? {}).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    }),
    queryCenter: config.initialQueryCenter,
    selection: config.initialSelection ?? null,
    selectionPresentation: config.initialSelection
      ? { source: 'original', ...config.initialSelectionPresentation }
      : null,
    scenario: { status: 'idle' },
    search: { status: 'idle' },
    candidateSource: 'scenario',
    searchActive: false,
    searchText: '',
    initialLocationPending: false,
    locationPermissionDenied: false,
    locationSettingsBusy: false,
    relocateBusy: false,
    completing: false,
    confirmation: null,
    localError: null,
    result: null,
  }));
  let active = true;
  let activated = false;
  let paused = false;
  let pendingState: Partial<MapPickerState> | undefined;
  let pendingLoad: (() => void) | undefined;
  let lifecycle = 0;
  let map: MapViewRef | null = null;
  let loaded = false;
  let ready = false;
  let locationResult: GetCurrentLocationResult | undefined;
  let locationDelivered = false;
  let locationApplied = false;
  let locationDisplayApplied = false;
  let displayModified = config.initialCameraPosition?.target !== undefined;
  let displayCenter = config.initialCameraPosition?.target;
  let queryModified = config.initialQueryCenter !== undefined;
  let selectionModified = config.initialSelection !== undefined;
  let initialLocationSuperseded = false;
  let operationEpoch = 0;
  const roundController = new AbortController();
  const operationLeases = new Set<MapPickerOperationLease>();
  function createLease(epoch = operationEpoch): MapPickerOperationLease {
    const lease = { epoch, controller: new AbortController() };
    operationLeases.add(lease);
    return lease;
  }
  function advanceOperation(owner?: MapPickerOperationLease): number {
    const epoch = ++operationEpoch;
    const previous = [...operationLeases];
    operationLeases.clear();
    if (owner) {
      owner.epoch = epoch;
      operationLeases.add(owner);
    }
    // Publish ownership before abort listeners can synchronously start newer work.
    for (const lease of previous) {
      if (lease !== owner) lease.controller.abort();
    }
    return epoch;
  }
  let selectionRevision = 0;
  let dragEpoch: number | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchRevision = 0;
  let attemptSequence = 0;
  let attempt: MapPickerConfirmationAttempt | undefined;
  const locationController = new AbortController();
  const isActive = () => active && !paused;
  const localError = (message: string) => {
    if (isActive()) {
      store.setState({ localError: message });
    }
  };
  // An already dispatched query still owns its original result while UI adoption is paused.
  function receiveState(update: Partial<MapPickerState>): void {
    if (!active) {
      return;
    }
    if (paused) {
      pendingState = { ...pendingState, ...update };
    } else {
      store.setState(update);
    }
  }
  const scenarioLane = createCandidateLane(
    () => active,
    (scenario) => receiveState({ scenario }),
  );
  const searchLane = createCandidateLane(
    () => active,
    (search) => receiveState({ search }),
  );

  function observe(
    action: () => void | Promise<void>,
    current: () => boolean = isActive,
    message = MAP_PICKER_MESSAGES.operation,
  ): void {
    if (!current()) {
      return;
    }
    try {
      Promise.resolve(action()).catch(() => {
        if (current()) {
          localError(message);
        }
      });
    } catch {
      if (current()) {
        localError(message);
      }
    }
  }
  function observeDisplayCenter(event: MapPickerCameraEvent): void {
    try {
      const target = event?.nativeEvent?.cameraPosition?.target;
      if (!target) return;
      validateCoordinates(target);
      displayCenter = snapshotValue(target);
    } catch {
      /* Invalid or incomplete native camera events do not replace the last center. */
    }
  }
  function releaseAttempt(): void {
    const previous = attempt;
    if (!previous) {
      return;
    }
    attempt = undefined;
    previous.settle?.(false);
    previous.settle = undefined;
    const release = previous.release;
    previous.release = undefined;
    previous.binding = undefined;
    if (release) {
      try {
        release();
      } catch {
        /* The attempt is already settled. */
      }
    }
    receiveState({ completing: false, confirmation: null });
  }
  function clearSearchWork(): void {
    searchRevision += 1;
    if (searchTimer !== undefined) {
      clearTimeout(searchTimer);
      searchTimer = undefined;
    }
    searchLane.cancel();
  }
  function finish(result: MapPickerResult): void {
    if (!active) {
      return;
    }
    active = false;
    pendingState = undefined;
    pendingLoad = undefined;
    advanceOperation();
    roundController.abort();
    lifecycle += 1;
    clearSearchWork();
    scenarioLane.cancel();
    locationController.abort();
    releaseAttempt();
    map = null;
    store.setState({
      result: snapshotValue(result),
      confirmation: null,
      initialLocationPending: false,
      relocateBusy: false,
      completing: false,
    });
    try {
      Promise.resolve(onResult(result)).catch(() => {
        /* Ended observers cannot publish another result. */
      });
    } catch {
      /* Result observers cannot reopen or resettle a round. */
    }
  }
  function writeSelection(
    value: MapSelection | null,
    presentation: MapPickerSelectionPresentation | null,
    epoch: number,
  ): boolean {
    releaseAttempt();
    if (!isActive() || operationEpoch !== epoch) return false;
    const revision = ++selectionRevision;
    store.setState({
      selection: value,
      selectionPresentation: value ? presentation : null,
      localError: null,
    });
    const observer = config.onSelectionChange;
    if (observer) {
      observe(
        () => observer(snapshotSelection(value)),
        () => selectionRevision === revision,
      );
    }
    return selectionRevision === revision;
  }
  async function dispatchCamera<T>(
    current: () => boolean,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (current()) {
        localError(MAP_PICKER_MESSAGES.operation);
      }
      throw error;
    }
  }
  function createControls(lease?: MapPickerOperationLease): MapPickerControls {
    const current = () =>
      isActive() &&
      (!lease ||
        (!lease.controller.signal.aborted && lease.epoch === operationEpoch));
    const changedSelection = () => advanceOperation(lease);
    const controls: MapPickerControls = {
      signal: lease?.controller.signal ?? roundController.signal,
      async setCenter(center, animated) {
        if (!current()) {
          throw new Error(MAP_PICKER_MESSAGES.inactive);
        }
        validatePoint(center);
        const target = map;
        if (!target || !ready) {
          throw new Error(MAP_PICKER_MESSAGES.unavailable);
        }
        displayModified = true;
        return dispatchCamera(current, () =>
          target.setCenter(snapshotValue(center), animated),
        );
      },
      async moveCamera(position, duration) {
        if (!current()) {
          throw new Error(MAP_PICKER_MESSAGES.inactive);
        }
        validateCamera(position);
        if (
          duration !== undefined &&
          (!Number.isFinite(duration) || duration < 0)
        ) {
          invalidInput();
        }
        const target = map;
        if (!target || !ready) {
          throw new Error(MAP_PICKER_MESSAGES.unavailable);
        }
        if (position.target !== undefined) {
          displayModified = true;
        }
        return dispatchCamera(current, () =>
          target.moveCamera(snapshotValue(position), duration),
        );
      },
      async setZoom(zoom, animated) {
        if (!current()) {
          throw new Error(MAP_PICKER_MESSAGES.inactive);
        }
        if (!Number.isFinite(zoom)) {
          invalidInput();
        }
        const target = map;
        if (!target || !ready) {
          throw new Error(MAP_PICKER_MESSAGES.unavailable);
        }
        return dispatchCamera(current, () => target.setZoom(zoom, animated));
      },
      async getCameraPosition() {
        if (!current()) {
          throw new Error(MAP_PICKER_MESSAGES.inactive);
        }
        const target = map;
        if (!target || !ready) {
          throw new Error(MAP_PICKER_MESSAGES.unavailable);
        }
        return dispatchCamera(current, () => target.getCameraPosition());
      },
      updateDisplay(options) {
        if (!current()) {
          return;
        }
        const snapshot = snapshotDisplay(options);
        const entries = Object.entries(snapshot).filter(
          ([, value]) => value !== undefined,
        );
        if (entries.length) {
          store.setState({
            display: Object.freeze({
              ...store.getState().display,
              ...Object.fromEntries(entries),
            }),
          });
        }
      },
      setQueryCenter(center) {
        if (!current()) {
          return;
        }
        validateCoordinates(center);
        queryModified = true;
        store.setState({ queryCenter: snapshotValue(center) });
      },
      setSelection(selection, presentation) {
        if (!current()) return false;
        const next = snapshotSelection(selection);
        const nextPresentation = next
          ? snapshotSelectionPresentation(presentation)
          : null;
        selectionModified = true;
        const epoch = changedSelection();
        if (!current() || operationEpoch !== epoch) return false;
        return writeSelection(next, nextPresentation, epoch);
      },
      loadCandidates(query) {
        if (!current()) {
          return Promise.resolve({ status: 'cancelled' });
        }
        if (!store.getState().searchActive) {
          store.setState({ candidateSource: 'scenario' });
        }
        return scenarioLane.run(query);
      },
      restoreCandidates() {
        if (current()) {
          store.setState({ candidateSource: 'scenario' });
        }
      },
      exitSearch() {
        if (current()) {
          exitSearch(changedSelection);
        }
      },
    };
    return controls;
  }
  const controls = createControls();

  function adoptInitialLocation(): void {
    if (!isActive() || !locationResult) {
      return;
    }
    if (!locationApplied) {
      locationApplied = true;
      if (locationResult.status === 'success') {
        const { latitude, longitude, coordinateSystem } =
          locationResult.location;
        const center = {
          latitude,
          longitude,
          ...(coordinateSystem === undefined ? {} : { coordinateSystem }),
        };
        validateCoordinates(center);
        if (!queryModified) {
          store.setState({ queryCenter: snapshotValue(center) });
        }
      } else if (
        locationResult.status === 'failed' &&
        !initialLocationSuperseded
      ) {
        const denied = locationResult.error.reason === 'permission_denied';
        store.setState({ locationPermissionDenied: denied });
        localError(
          denied
            ? MAP_PICKER_MESSAGES.locationPermission
            : MAP_PICKER_MESSAGES.location,
        );
      }
    }
    applyInitialDisplay();
    notifyLocation();
  }
  function notifyLocation(): void {
    if (!isActive() || !ready || !locationResult || locationDelivered) {
      return;
    }
    locationDelivered = true;
    const result = locationResult;
    if (config.onInitialLocationResult) {
      observe(() => config.onInitialLocationResult!(result, controls));
    }
    if (
      isActive() &&
      result.status === 'success' &&
      !selectionModified &&
      !initialLocationSuperseded &&
      config.selectInitialLocation !== false
    ) {
      const { latitude, longitude, coordinateSystem, address } =
        result.location;
      controls.setSelection(
        {
          coordinates: {
            latitude,
            longitude,
            ...(coordinateSystem === undefined ? {} : { coordinateSystem }),
          },
        },
        { source: 'location', address: address?.formattedAddress },
      );
    }
  }
  function applyInitialDisplay(): void {
    if (
      !isActive() ||
      !ready ||
      !map ||
      locationDisplayApplied ||
      locationResult?.status !== 'success'
    ) {
      return;
    }
    locationDisplayApplied = true;
    if (!displayModified) {
      const { latitude, longitude, coordinateSystem } = locationResult.location;
      const center = {
        latitude,
        longitude,
        ...(coordinateSystem === undefined ? {} : { coordinateSystem }),
      };
      const target = map;
      observe(() => target.setCenter(center));
    }
  }
  function becomeReady(): void {
    if (!isActive() || ready || !loaded || !map) {
      return;
    }
    ready = true;
    applyInitialDisplay();
    if (config.onReady) {
      observe(() => config.onReady!(controls));
    }
    notifyLocation();
  }
  function exitSearch(advance: () => number): void {
    if (!isActive() || !store.getState().searchActive) {
      return;
    }
    const epoch = advance();
    if (!isActive() || operationEpoch !== epoch) return;
    clearSearchWork();
    if (!isActive() || operationEpoch !== epoch) return;
    store.setState({
      searchActive: false,
      searchText: '',
      search: { status: 'idle' },
    });
    const callback = config.search?.onExit;
    if (!isActive() || operationEpoch !== epoch) return;
    if (callback) {
      const lease = createLease();
      const view = createControls(lease);
      observe(
        () => callback(view),
        () => isActive() && lease.epoch === operationEpoch,
      );
    }
  }
  const session: MapPickerSession = {
    validInput: !invalid,
    config,
    store,
    controls,
    activate() {
      if (!active) {
        return;
      }
      paused = false;
      lifecycle += 1;
      const firstActivation = !activated;
      activated = true;
      if (invalid) {
        finish({
          status: 'failed',
          error: {
            reason: 'invalid_input',
            message: MAP_PICKER_MESSAGES.invalidInput,
          },
        });
        return;
      }
      const updates = pendingState;
      pendingState = undefined;
      if (updates) {
        receiveState(updates);
      }
      adoptInitialLocation();
      becomeReady();
      const load = pendingLoad;
      pendingLoad = undefined;
      if (load) {
        observe(load);
      }
      if (!firstActivation || !isActive()) {
        return;
      }
      if (config.initialLocationRequest !== undefined) {
        receiveState({ initialLocationPending: true });
        try {
          Promise.resolve(
            getCurrentLocation(config.initialLocationRequest, {
              signal: locationController.signal,
            }),
          )
            .then((result) => {
              if (!active) {
                return;
              }
              receiveState({ initialLocationPending: false });
              locationResult = snapshotValue(result);
              adoptInitialLocation();
            })
            .catch(() => {
              receiveState({ initialLocationPending: false });
              if (!initialLocationSuperseded)
                localError(MAP_PICKER_MESSAGES.location);
            });
        } catch {
          receiveState({ initialLocationPending: false });
          if (!initialLocationSuperseded)
            localError(MAP_PICKER_MESSAGES.location);
        }
      }
    },
    deactivate() {
      paused = true;
      const revision = ++lifecycle;
      // React's synchronous effect replay can reactivate the same committed round.
      Promise.resolve().then(() => {
        if (paused && revision === lifecycle) {
          finish({ status: 'cancelled' });
        }
      });
    },
    attachMap(value) {
      if (active) {
        map = value;
        becomeReady();
      }
    },
    events: {
      onLoad(event) {
        if (!active) {
          return;
        }
        loaded = true;
        becomeReady();
        if (config.onLoad) {
          if (paused) {
            pendingLoad = () => config.onLoad!(event);
          } else {
            observe(() => config.onLoad!(event));
          }
        }
      },
      onCameraMove(event) {
        if (!isActive()) return;
        observeDisplayCenter(event);
        if (config.onCameraMove) observe(() => config.onCameraMove!(event));
      },
      onCameraIdle(event) {
        if (!isActive()) return;
        observeDisplayCenter(event);
        if (config.onCameraIdle) observe(() => config.onCameraIdle!(event));
      },
      onMapPress(event) {
        if (isActive() && config.onMapPress) {
          observe(() => config.onMapPress!(event));
        }
      },
      onUserDragStart(event) {
        if (isActive()) {
          displayModified = true;
          selectionModified = true;
          const epoch = advanceOperation();
          if (!isActive() || operationEpoch !== epoch) return;
          dragEpoch = epoch;
          if (config.onUserDragStart)
            observe(() => config.onUserDragStart!(event));
        }
      },
      onUserDragEnd(event) {
        if (
          !isActive() ||
          dragEpoch === undefined ||
          dragEpoch !== operationEpoch
        ) {
          return;
        }
        const lease = createLease(dragEpoch);
        dragEpoch = undefined;
        if (!config.onUserDragEnd) {
          return;
        }
        try {
          validateCoordinates(event.nativeEvent);
          const center = snapshotValue({
            latitude: event.nativeEvent.latitude,
            longitude: event.nativeEvent.longitude,
          });
          const view = createControls(lease);
          observe(
            () => config.onUserDragEnd!(center, view),
            () => isActive() && lease.epoch === operationEpoch,
          );
        } catch {
          localError(MAP_PICKER_MESSAGES.operation);
        }
      },
    },
    enterSearch() {
      if (!isActive() || !config.search || store.getState().searchActive) {
        return;
      }
      const epoch = advanceOperation();
      if (!isActive() || operationEpoch !== epoch) return;
      store.setState({ searchActive: true, candidateSource: 'search' });
    },
    changeSearchText(text) {
      if (!isActive() || !config.search) {
        return;
      }
      const epoch = advanceOperation();
      if (!isActive() || operationEpoch !== epoch) return;
      clearSearchWork();
      if (!isActive() || operationEpoch !== epoch) return;
      store.setState({
        searchActive: true,
        searchText: text,
        search: { status: 'idle' },
        candidateSource: 'search',
      });
      if (!text.trim()) {
        if (config.search.onClear) {
          const lease = createLease();
          const view = createControls(lease);
          observe(
            () => config.search!.onClear!(view),
            () => isActive() && lease.epoch === operationEpoch,
          );
        }
        return;
      }
      const revision = searchRevision;
      const run = () => {
        searchTimer = undefined;
        if (!isActive() || revision !== searchRevision) {
          return;
        }
        const searchInput = snapshotValue({
          keyword: store.getState().searchText.trim(),
          queryCenter: store.getState().queryCenter,
          ...(displayCenter === undefined ? {} : { displayCenter }),
        });
        searchLane
          .run((options) => config.search!.query(searchInput, options))
          .catch(() => {
            /* Lane already presents its safe local error. */
          });
      };
      if (config.search.debounceMs === 0) {
        run();
      } else {
        searchTimer = setTimeout(run, config.search.debounceMs);
      }
    },
    async retryCandidates() {
      if (!isActive()) return;
      const lane =
        store.getState().candidateSource === 'search'
          ? searchLane
          : scenarioLane;
      await lane.retry();
    },
    selectCandidate(place) {
      if (!isActive()) {
        return;
      }
      try {
        const { location, ...fields } = place;
        if (!location) {
          invalidInput();
        }
        validateCoordinates(location as MapSelection['coordinates']);
        controls.setSelection(
          {
            coordinates: location as MapSelection['coordinates'],
            place: fields,
          },
          store.getState().candidateSource === 'search'
            ? { source: 'search' }
            : { source: 'poi' },
        );
      } catch {
        localError(MAP_PICKER_MESSAGES.selection);
      }
    },
    async requestRelocate() {
      if (
        !isActive() ||
        !config.onRequestRelocate ||
        store.getState().relocateBusy
      ) {
        return;
      }
      const epoch = advanceOperation();
      if (!isActive() || operationEpoch !== epoch) return;
      initialLocationSuperseded = true;
      const lease = createLease();
      const view = createControls(lease);
      store.setState({
        relocateBusy: true,
        localError: null,
        locationPermissionDenied: false,
      });
      try {
        if (!isActive() || lease.epoch !== operationEpoch) return;
        await config.onRequestRelocate(view);
      } catch (error) {
        if (isActive() && lease.epoch === operationEpoch) {
          const denied =
            !!error &&
            typeof error === 'object' &&
            'reason' in error &&
            error.reason === 'permission_denied';
          store.setState({ locationPermissionDenied: denied });
          localError(
            denied
              ? MAP_PICKER_MESSAGES.locationPermission
              : MAP_PICKER_MESSAGES.operation,
          );
        }
      } finally {
        receiveState({ relocateBusy: false });
      }
    },
    async openLocationSettings() {
      if (
        !isActive() ||
        !store.getState().locationPermissionDenied ||
        store.getState().locationSettingsBusy
      )
        return;
      store.setState({ locationSettingsBusy: true });
      try {
        await getPermissionAccess().openSettings();
      } catch {
        localError(MAP_PICKER_MESSAGES.locationSettings);
      } finally {
        if (isActive()) store.setState({ locationSettingsBusy: false });
      }
    },
    reportOperationError() {
      localError(MAP_PICKER_MESSAGES.operation);
    },
    async complete() {
      if (!isActive() || attempt || !store.getState().selection) {
        return;
      }
      const selection = snapshotSelection(store.getState().selection)!;
      const current: MapPickerConfirmationAttempt = {
        id: ++attemptSequence,
        revision: selectionRevision,
        selection,
      };
      attempt = current;
      const isCurrent = () =>
        isActive() &&
        attempt === current &&
        selectionRevision === current.revision;
      store.setState({ completing: true, localError: null });
      try {
        if (config.beforeConfirm) {
          const checked = await config.beforeConfirm(selection);
          if (!isCurrent()) {
            return;
          }
          if (!checked || checked.canConfirm !== true) {
            toast({
              position: 'top',
              message:
                checked &&
                checked.canConfirm === false &&
                typeof checked.message === 'string'
                  ? checked.message
                  : MAP_PICKER_MESSAGES.confirmation,
            });
            return;
          }
        }
        if (!isCurrent()) {
          return;
        }
        if (config.getConfirmationOptions) {
          const options = config.getConfirmationOptions(selection);
          if (!isCurrent()) {
            return;
          }
          const request = { id: current.id, options };
          current.request = request;
          const waiting = new Promise<boolean>((resolve) => {
            current.settle = resolve;
          });
          store.setState({ confirmation: request });
          const confirmed = await waiting;
          if (!isCurrent() || !confirmed) {
            return;
          }
        }
        finish({ status: 'success', selection });
      } catch {
        if (isCurrent()) {
          toast({ position: 'top', message: MAP_PICKER_MESSAGES.confirmation });
        }
      } finally {
        if (attempt === current) {
          releaseAttempt();
        }
      }
    },
    cancel() {
      finish({ status: 'cancelled' });
    },
    failUnavailable() {
      if (!isActive()) {
        return;
      }
      finish({
        status: 'failed',
        error: {
          reason: 'unavailable',
          message: MAP_PICKER_MESSAGES.unavailable,
        },
      });
    },
    bindConfirmation(request, confirm, release) {
      const current = attempt;
      // Child effects may register the Host before the parent's synchronous reactivation.
      if (!active || !current || current.request !== request) {
        return () => {};
      }
      const binding = {};
      current.binding = binding;
      current.release = release;
      // Bind after the Host's registration effects; a StrictMode replay replaces this binding.
      Promise.resolve().then(async () => {
        if (!isActive() || attempt !== current || current.binding !== binding) {
          return;
        }
        try {
          const result = await confirm(request.options);
          if (
            isActive() &&
            attempt === current &&
            current.binding === binding
          ) {
            current.settle?.(result);
          }
        } catch {
          if (
            isActive() &&
            attempt === current &&
            current.binding === binding
          ) {
            toast({
              position: 'top',
              message: MAP_PICKER_MESSAGES.confirmation,
            });
            current.settle?.(false);
          }
        }
      });
      return () => {
        if (current.binding !== binding) {
          return;
        }
        current.binding = undefined;
        current.release = undefined;
        Promise.resolve().then(() => {
          if (attempt === current && current.binding === undefined) {
            current.settle?.(false);
          }
        });
      };
    },
  };
  return session;
}
