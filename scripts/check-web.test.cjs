const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
const webpack = require(
  require.resolve('webpack', { paths: [path.join(root, 'website')] }),
);
test('实际 tarball 在默认 Web ESM 解析中使用 unsupported 分支且不加载高德原生 SDK', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unif-amap-web-'));
  try {
    const packed = JSON.parse(
      execFileSync(
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', dir],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            npm_config_cache: path.join(dir, 'npm-cache'),
          },
        },
      ),
    );
    const pack = Object.values(packed)[0];
    const installed = path.join(dir, 'node_modules/@unif/react-native-amap');
    fs.mkdirSync(installed, { recursive: true });
    execFileSync('tar', [
      '-xzf',
      path.join(dir, pack.filename),
      '--strip-components=1',
      '-C',
      installed,
    ]);
    fs.writeFileSync(
      path.join(dir, 'entry.js'),
      "import * as amap from '@unif/react-native-amap'; window.amap = amap;\n",
    );
    const stats = await new Promise((resolve, reject) => {
      webpack(
        {
          mode: 'development',
          target: 'web',
          context: dir,
          entry: './entry.js',
          output: { path: path.join(dir, 'out'), filename: 'bundle.js' },
          externals: [
            ({ request }, callback) =>
              request &&
              !request.startsWith('.') &&
              request !== '@unif/react-native-amap'
                ? callback(null, `commonjs ${request}`)
                : callback(),
          ],
          stats: 'errors-warnings',
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
    });
    assert.equal(
      stats.hasErrors(),
      false,
      stats.toString({ all: false, errors: true }),
    );
    const modules = stats
      .toJson({ all: false, modules: true })
      .modules.map((item) => item.name)
      .join('\n');
    assert.doesNotMatch(modules, /external ["']expo-gaode-map/);
    for (const file of [
      'MapPicker.web.js',
      'openMapPicker.web.js',
      'getCurrentLocation.web.js',
      'startLocationUpdates.web.js',
      'executePlaceQuery.web.js',
      'openAmap.web.js',
      'initializeGaode.web.js',
    ])
      assert(modules.includes(file), file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
