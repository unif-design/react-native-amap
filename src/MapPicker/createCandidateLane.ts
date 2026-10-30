import type { PlaceQueryResult, PlaceSearchPage } from '../places';
import { MAP_PICKER_MESSAGES } from './constants';
import { snapshotValue } from './snapshotMapPickerInput';
import type {
  MapPickerCandidateQuery,
  MapPickerCandidateState,
  MapPickerQueryLane,
} from './types';

export function createCandidateLane(
  isActive: () => boolean,
  receive: (state: MapPickerCandidateState) => void,
): MapPickerQueryLane {
  let cancelCurrent: (() => void) | undefined;
  let failedQuery: MapPickerCandidateQuery | undefined;
  let revision = 0;
  const lane: MapPickerQueryLane = {
    cancel() {
      revision += 1;
      failedQuery = undefined;
      cancelCurrent?.();
    },
    async retry() {
      if (!failedQuery) return;
      try {
        await lane.run(failedQuery);
      } catch {
        /* The lane already presents the error for this explicit UI retry. */
      }
    },
    run(query) {
      if (!isActive()) {
        return Promise.resolve({ status: 'cancelled' });
      }
      const currentRevision = ++revision;
      failedQuery = undefined;
      cancelCurrent?.();
      if (!isActive() || currentRevision !== revision) {
        return Promise.resolve({ status: 'cancelled' });
      }
      const controller = new AbortController();
      let pending = true;
      let resolve!: (result: PlaceQueryResult<PlaceSearchPage>) => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<PlaceQueryResult<PlaceSearchPage>>(
        (yes, no) => {
          resolve = yes;
          reject = no;
        },
      );
      const cancel = () => {
        pending = false;
        cancelCurrent = undefined;
        resolve({ status: 'cancelled' });
        if (isActive()) {
          receive({ status: 'cancelled' });
        }
        controller.abort();
      };
      cancelCurrent = cancel;
      receive({ status: 'loading' });
      const success = (result: PlaceQueryResult<PlaceSearchPage>) => {
        if (!pending) {
          return;
        }
        const state: MapPickerCandidateState = {
          status: result.status,
          result: snapshotValue(result),
          ...(result.status === 'failed'
            ? { message: MAP_PICKER_MESSAGES.query }
            : {}),
        };
        pending = false;
        cancelCurrent = undefined;
        failedQuery = result.status === 'failed' ? query : undefined;
        resolve(result);
        if (isActive()) {
          receive(state);
        }
      };
      const failure = (error: unknown) => {
        if (!pending) {
          return;
        }
        pending = false;
        cancelCurrent = undefined;
        failedQuery = query;
        if (isActive()) {
          receive({ status: 'exception', message: MAP_PICKER_MESSAGES.query });
        }
        reject(error);
      };
      try {
        if (pending && isActive()) {
          Promise.resolve(query({ signal: controller.signal }))
            .then(success)
            .catch(failure);
        }
      } catch (error) {
        failure(error);
      }
      return promise;
    },
  };
  return lane;
}
