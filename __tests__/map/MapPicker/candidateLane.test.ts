import { createCandidateLane } from '@amap/MapPicker/createCandidateLane';
import type { PlaceQueryResult, PlaceSearchPage } from '@amap/places';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('失效会话不能发起候选查询', async () => {
  const receive = jest.fn();
  const lane = createCandidateLane(() => false, receive);
  const query = jest.fn();
  await expect(lane.run(query)).resolves.toEqual({ status: 'cancelled' });
  expect(query).not.toHaveBeenCalled();
  expect(receive).not.toHaveBeenCalled();
});

test('会话失效后的查询成功仍返回调用方，但不更新界面', async () => {
  let active = true;
  const receive = jest.fn();
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const lane = createCandidateLane(() => active, receive);
  const result = lane.run(() => pending.promise);
  active = false;
  pending.resolve({ status: 'success', data: { items: [{ id: 'place' }] } });
  await expect(result).resolves.toMatchObject({ status: 'success' });
  expect(receive.mock.calls).toEqual([[{ status: 'loading' }]]);
  lane.cancel();
});

test('会话失效后的查询异常仍返回调用方，但不更新界面', async () => {
  let active = true;
  const receive = jest.fn();
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const lane = createCandidateLane(() => active, receive);
  const result = lane.run(() => pending.promise);
  active = false;
  pending.reject(new Error('query unavailable'));
  await expect(result).rejects.toThrow('query unavailable');
  expect(receive.mock.calls).toEqual([[{ status: 'loading' }]]);
  lane.cancel();
});

test('取消通知和 abort 监听器同步重入不会重复结算旧查询', async () => {
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const receive = jest.fn((state) => {
    if (state.status === 'cancelled') lane.cancel();
  });
  const lane = createCandidateLane(() => true, receive);
  const onAbort = jest.fn(() => lane.cancel());
  const result = lane.run(({ signal }) => {
    signal!.addEventListener('abort', onAbort);
    return pending.promise;
  });
  lane.cancel();
  await expect(result).resolves.toEqual({ status: 'cancelled' });
  pending.resolve({ status: 'success', data: {} });
  await Promise.resolve();
  expect(receive.mock.calls).toEqual([
    [{ status: 'loading' }],
    [{ status: 'cancelled' }],
  ]);
  expect(onAbort).toHaveBeenCalledTimes(1);
});
