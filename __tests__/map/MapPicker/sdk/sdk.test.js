const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { render, act } = require('@testing-library/react-native');
const { View } = require('react-native');
const root =
  process.env.SDK_ROOT ||
  path.dirname(require.resolve('expo-gaode-map/package.json'));
function load(native) {
  let received;
  const cache = new Map();
  const NativeView = React.forwardRef((props, ref) => {
    received = props;
    React.useImperativeHandle(ref, () => native);
    return React.createElement(View);
  });
  function moduleAt(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;
    new vm.Script(`(function(require,module,exports){${code}\n})`, {
      filename: file,
    }).runInThisContext()(
      (id) => {
        if (id === 'expo-modules-core' || id === 'expo')
          return {
            requireNativeViewManager: () => NativeView,
            requireNativeModule: () => ({
              getPrivacyStatus: () => ({ isReady: true }),
            }),
          };
        if (!id.startsWith('.')) return require(id);
        return moduleAt(require.resolve(path.resolve(path.dirname(file), id)));
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  const Component = moduleAt(
    path.join(root, 'build/ExpoGaodeMapView.js'),
  ).default;
  const ref = React.createRef();
  return {
    ref,
    mount: (props) => render(React.createElement(Component, { ...props, ref })),
    props: () => received,
  };
}
test('actual SDK forwards partial camera input, initial fields and drag event unchanged', async () => {
  const native = {
    moveCamera: jest.fn().mockResolvedValue(undefined),
    setCenter: jest.fn().mockResolvedValue(undefined),
    setZoom: jest.fn().mockResolvedValue(undefined),
    getCameraPosition: jest
      .fn()
      .mockResolvedValue({ target: { latitude: 0, longitude: 0 }, zoom: 13 }),
  };
  const sdk = load(native);
  const drag = jest.fn();
  const idle = jest.fn();
  await sdk.mount({
    initialCameraPosition: { zoom: 14 },
    onUserDragEnd: drag,
    onCameraIdle: idle,
  });
  expect(sdk.props().initialCameraPosition).toEqual({ zoom: 14 });
  await sdk.ref.current.moveCamera({ zoom: 15 });
  expect(native.moveCamera).toHaveBeenCalledWith(
    { zoom: 15, target: undefined },
    0,
  );
  await sdk.ref.current.setCenter({ latitude: 0, longitude: 0 });
  expect(native.setCenter).toHaveBeenCalledWith(
    { latitude: 0, longitude: 0 },
    false,
  );
  await sdk.ref.current.setZoom(16, true);
  expect(native.setZoom).toHaveBeenCalledWith(16, true);
  expect(await sdk.ref.current.getCameraPosition()).toEqual({
    target: { latitude: 0, longitude: 0 },
    zoom: 13,
  });
  const event = { nativeEvent: { latitude: 31, longitude: 121 } };
  await act(() => sdk.props().onUserDragEnd(event));
  expect(drag).toHaveBeenCalledWith(event);
  expect(idle).not.toHaveBeenCalled();
});
test.each(['moveCamera', 'setCenter', 'setZoom', 'getCameraPosition'])(
  'public %s always delivers synchronous native errors through Promise',
  async (name) => {
    const sdk = load({
      [name]: () => {
        throw Error('native execution failed');
      },
    });
    await sdk.mount({});
    let result;
    expect(() => {
      result = sdk.ref.current[name]({ latitude: 0, longitude: 0 });
    }).not.toThrow();
    await expect(result).rejects.toThrow();
  },
);
test.each(['moveCamera', 'setCenter', 'setZoom', 'getCameraPosition'])(
  'public %s preserves rejected native Promise without retry',
  async (name) => {
    const failure = Error('native rejected');
    const method = jest.fn().mockRejectedValue(failure);
    const sdk = load({ [name]: method });
    await sdk.mount({});
    await expect(
      sdk.ref.current[name]({ latitude: 0, longitude: 0 }),
    ).rejects.toThrow();
    expect(method).toHaveBeenCalledTimes(1);
  },
);
test('fitToCoordinates uses the same real native camera entry and propagates its rejection', async () => {
  const failure = Error('move rejected');
  const native = {
    getCameraPosition: jest
      .fn()
      .mockResolvedValue({ zoom: 12, bearing: 20, tilt: 10 }),
    moveCamera: jest.fn().mockRejectedValue(failure),
  };
  const sdk = load(native);
  await sdk.mount({});
  await expect(
    sdk.ref.current.fitToCoordinates([{ latitude: 0, longitude: 0 }], {
      duration: 400,
    }),
  ).rejects.toThrow();
  expect(native.moveCamera).toHaveBeenCalledTimes(1);
  expect(native.moveCamera).toHaveBeenCalledWith(
    { target: { latitude: 0, longitude: 0 }, zoom: 12, bearing: 20, tilt: 10 },
    400,
  );
});
test('SDK public types expose LatLng drag events and retain camera partial fields', () => {
  const file = path.join(root, 'build/__map_contract_probe.ts');
  const source = `import type {MapViewProps,MapViewRef,LatLng} from './index';
const props:MapViewProps={initialCameraPosition:{zoom:13},onUserDragStart(event){const value:LatLng=event.nativeEvent;},onUserDragEnd(event){const value:LatLng=event.nativeEvent;}};
declare const ref:MapViewRef; const moved:Promise<void>=ref.moveCamera({zoom:14}); const center:Promise<void>=ref.setCenter({latitude:0,longitude:0});
`;
  const options = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host = ts.createCompilerHost(options);
  const getSource = host.getSourceFile;
  host.getSourceFile = (name, version, ...args) =>
    name === file
      ? ts.createSourceFile(file, source, version, true)
      : getSource.call(host, name, version, ...args);
  expect(
    ts
      .getPreEmitDiagnostics(ts.createProgram([file], options, host))
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  ).toEqual([]);
});
