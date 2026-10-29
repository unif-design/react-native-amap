const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { render } = require('@testing-library/react-native');
const { View } = require('react-native');

const root =
  process.env.SDK_ROOT ||
  path.dirname(require.resolve('expo-gaode-map/package.json'));

function loadCircle() {
  let received;
  const cache = new Map();
  const NativeView = (props) => {
    received = props;
    return React.createElement(View);
  };

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
        if (id === 'expo-modules-core') {
          return { requireNativeViewManager: () => NativeView };
        }
        if (!id.startsWith('.')) return require(id);
        return moduleAt(require.resolve(path.resolve(path.dirname(file), id)));
      },
      module,
      module.exports,
    );
    return module.exports;
  }

  const Circle = moduleAt(
    path.join(root, 'build/components/overlays/Circle.js'),
  ).default;
  return {
    mount: (props) => render(React.createElement(Circle, props)),
    props: () => received,
    Circle,
  };
}

function parseActualNativeColors(colors) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-circle-color-'));
  const executable = path.join(out, 'probe');
  const shared = path.join(root, 'shared/cpp');
  cp.execFileSync('c++', [
    '-std=c++17',
    '-I',
    shared,
    path.join(__dirname, 'CircleColor.cpp'),
    path.join(shared, 'ColorParser.cpp'),
    '-o',
    executable,
  ]);
  return cp
    .execFileSync(executable, colors, { encoding: 'utf8' })
    .trim()
    .split('\n');
}

test('actual SDK Circle converts signed and unsigned packed ARGB values without losing alpha bits', async () => {
  const sdk = loadCircle();
  const mounted = await sdk.mount({
    center: [121, 31],
    radius: 50,
    fillColor: -2147483648,
    strokeColor: 0,
  });
  expect(sdk.props()).toMatchObject({
    center: { longitude: 121, latitude: 31 },
    fillColor: '#80000000',
    strokeColor: '#00000000',
  });

  await mounted.rerender(
    React.createElement(sdk.Circle, {
      center: [121, 31],
      radius: 50,
      fillColor: 2148676694,
      strokeColor: 4294967295,
    }),
  );
  expect(sdk.props()).toMatchObject({
    fillColor: '#80123456',
    strokeColor: '#FFFFFFFF',
  });

  await mounted.rerender(
    React.createElement(sdk.Circle, {
      center: [121, 31],
      radius: 50,
      fillColor: 1193046,
      strokeColor: 4279383126,
    }),
  );
  expect(sdk.props()).toMatchObject({
    fillColor: '#00123456',
    strokeColor: '#FF123456',
  });
});

test('actual SDK Circle preserves color strings, omission and later updates', async () => {
  const sdk = loadCircle();
  const mounted = await sdk.mount({
    center: { latitude: 31, longitude: 121 },
    radius: 50,
    fillColor: '#10203040',
    strokeColor: 'transparent',
  });
  expect(sdk.props().fillColor).toBe('#10203040');
  expect(sdk.props().strokeColor).toBe('transparent');

  await mounted.rerender(
    React.createElement(sdk.Circle, {
      center: { latitude: 31, longitude: 121 },
      radius: 50,
      fillColor: -1,
    }),
  );
  expect(sdk.props().fillColor).toBe('#FFFFFFFF');
  expect(Object.hasOwn(sdk.props(), 'strokeColor')).toBe(false);
});

test.each([NaN, Infinity, -Infinity, 1.5, -2147483649, 4294967296])(
  'actual SDK Circle does not truncate or wrap invalid packed color %s',
  async (value) => {
    const sdk = loadCircle();
    await sdk.mount({
      center: [121, 31],
      radius: 50,
      fillColor: value,
    });
    expect(sdk.props().fillColor).toBe(value);
  },
);

test('CI native parser preserves ARGB bits from actual SDK Circle output', async () => {
  const sdk = loadCircle();
  const mounted = await sdk.mount({
    center: [121, 31],
    radius: 50,
    fillColor: 0,
    strokeColor: 2148676694,
  });
  const colors = [sdk.props().fillColor, sdk.props().strokeColor];

  await mounted.rerender(
    React.createElement(sdk.Circle, {
      center: [121, 31],
      radius: 50,
      fillColor: 4294967295,
      strokeColor: 4279383126,
    }),
  );
  colors.push(sdk.props().fillColor, sdk.props().strokeColor);

  expect(parseActualNativeColors(colors)).toEqual([
    '00000000',
    '80123456',
    'FFFFFFFF',
    'FF123456',
  ]);
});
