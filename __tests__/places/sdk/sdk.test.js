const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const root =
  process.env.SDK_ROOT ||
  path.dirname(require.resolve('expo-gaode-map/package.json'));
function load(native) {
  const cache = new Map();
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
        if (id === 'expo-modules-core')
          return {
            requireNativeModule: (name) =>
              name === 'ExpoGaodeMapSearch' ? native : {},
          };
        if (!id.startsWith('.')) throw Error('Unexpected dependency ' + id);
        return moduleAt(require.resolve(path.resolve(path.dirname(file), id)));
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  return moduleAt(path.join(root, 'build/search/index.js'));
}
test('actual SDK public JS keeps each explicit request and response once', async () => {
  const calls = [];
  const native = {};
  const pending = [];
  for (const name of ['searchPOI', 'searchNearby', 'getPoiDetail', 'reGeocode'])
    native[name] = function (input) {
      assert.equal(this, native);
      calls.push([name, input]);
      return new Promise((resolve, reject) =>
        pending.push({ resolve, reject }),
      );
    };
  const sdk = load(native);
  const options = {
    keyword: '',
    types: '050000|060000',
    pageNum: 2,
    pageSize: 25,
    center: { latitude: 0, longitude: 0 },
    radius: 0,
    requireExtension: false,
  };
  const a = sdk.searchPOI(options);
  const b = sdk.searchNearby(options);
  const c = sdk.getPoiDetail('same');
  const d = sdk.reGeocode(options);
  assert.deepEqual(calls, [
    ['searchPOI', options],
    ['searchNearby', options],
    ['getPoiDetail', 'same'],
    ['reGeocode', options],
  ]);
  const response = {
    pois: [{}, { id: 'same', location: { latitude: 0 } }, { id: 'same' }],
    pageNum: 2,
  };
  pending[1].resolve(response);
  pending[0].resolve({});
  pending[2].resolve({});
  pending[3].resolve({ formattedAddress: '' });
  assert.equal(await b, response);
  assert.deepEqual(await a, {});
  assert.deepEqual(await c, {});
  assert.deepEqual(await d, { formattedAddress: '' });
  assert.equal(calls.length, 4);
});
test('actual SDK public JS preserves native failure without retry', async () => {
  let calls = 0;
  const failure = Error('fixture-only');
  const sdk = load({
    searchPOI() {
      calls++;
      return Promise.reject(failure);
    },
  });
  await assert.rejects(
    sdk.searchPOI({ keyword: 'x', pageNum: 1, pageSize: 1 }),
    (error) => error === failure,
  );
  assert.equal(calls, 1);
});
test('result declarations permit absent/partial native data; request coordinates remain complete', () => {
  const file = path.join(root, 'build/search/__places_contract_probe.ts');
  const content = `import type {POI,SearchResult,ReGeocodeResult,Coordinates} from './ExpoGaodeMapSearch.types';
const poi:POI={location:{latitude:0},indoor:{floor:0},website:null};
const empty:SearchResult={};const result:ReGeocodeResult={addressComponent:{country:'',streetNumber:{location:{longitude:0}}}};
const coordinates:Coordinates={latitude:0,longitude:0};
// @ts-expect-error Requests still need both coordinates
const invalid:Coordinates={latitude:0};
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
  const originalGet = host.getSourceFile;
  host.getSourceFile = (name, version, ...args) =>
    name === file
      ? ts.createSourceFile(file, content, version, true)
      : originalGet.call(host, name, version, ...args);
  const diagnostics = ts.getPreEmitDiagnostics(
    ts.createProgram([file], options, host),
  );
  assert.deepEqual(
    diagnostics.map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    ),
    [],
  );
});
