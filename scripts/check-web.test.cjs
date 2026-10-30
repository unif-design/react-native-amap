const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const webpack = require(
  require.resolve('webpack', { paths: [path.join(root, 'website')] }),
);
test('实际 tarball 公开类型可使用官方 SDK，Web 入口不加载原生 SDK', async () => {
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
    const manifest = JSON.parse(
      fs.readFileSync(path.join(installed, 'package.json'), 'utf8'),
    );
    for (const dependency of [
      ...Object.keys(manifest.peerDependencies),
      '@types',
    ]) {
      const destination = path.join(dir, 'node_modules', dependency);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.symlinkSync(
        path.join(root, 'node_modules', dependency),
        destination,
        'junction',
      );
    }
    const entry = path.join(dir, 'publicEntry.ts');
    fs.copyFileSync(path.join(root, '__tests__/types/publicEntry.ts'), entry);
    const program = ts.createProgram([entry], {
      noEmit: true,
      strict: true,
      // 沿用 RN 宿主配置，检查消费代码而非第三方声明内部。
      skipLibCheck: true,
      types: ['react', 'node'],
      lib: ['lib.esnext.d.ts'],
      customConditions: ['react-native-strict-api'],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactNative,
      esModuleInterop: true,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => dir,
        getCanonicalFileName: (file) => file,
        getNewLine: () => '\n',
      }),
    );
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
