const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const root =
  process.env.SDK_ROOT ||
  path.dirname(require.resolve('expo-gaode-map/package.json'));
const output = fs.mkdtempSync(
  path.join(os.tmpdir(), 'portal-location-native-'),
);
const baseline = process.env.SDK_BASELINE === '1';
function method(source, start) {
  const begin = source.indexOf(start);
  if (begin < 0) throw new Error('Missing actual method: ' + start);
  const brace = source.indexOf('{', begin);
  let depth = 1,
    end = brace + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw new Error('Unclosed method');
  return source.slice(begin, end);
}
if (process.argv[2] === 'android') {
  const env = JSON.parse(
    fs.readFileSync(
      process.env.KOTLIN_ENV || '/tmp/portal-location-kotlin-env.json',
      'utf8',
    ),
  );
  const source = fs.readFileSync(
    path.join(
      root,
      'android/src/main/java/expo/modules/gaodemap/modules/LocationManager.kt',
    ),
    'utf8',
  );
  const methods = [
    'fun getCurrentLocation(',
    'private fun formatLocation(',
    'private fun isMockLocation(',
    'private fun getTrustedLevel(',
  ]
    .map((start) => method(source, start))
    .join('\n');
  const template = fs.readFileSync(
    path.join(__dirname, 'AndroidBoundary.kt'),
    'utf8',
  );
  const harness = template
    .replace('// ACTUAL_METHODS', methods)
    .replace(
      '// BASELINE_ADAPTER',
      baseline
        ? 'fun getCurrentLocation(includeAddress: Boolean?, promise: Promise) = getCurrentLocation(promise)'
        : '',
    );
  const file = path.join(output, 'AndroidBoundary.kt');
  fs.writeFileSync(file, harness);
  cp.execFileSync(
    env.java,
    [
      '-cp',
      env.compilerClasspath,
      env.compilerMain,
      '-no-stdlib',
      '-no-reflect',
      '-classpath',
      env.compileClasspath,
      '-jvm-target',
      '17',
      '-d',
      output,
      file,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(
    env.java,
    [
      '-cp',
      output + path.delimiter + env.runtimeClasspath,
      'AndroidBoundaryKt',
    ],
    { stdio: 'inherit' },
  );
} else if (process.argv[2] === 'ios') {
  const source = fs.readFileSync(
    path.join(root, 'ios/modules/LocationManager.swift'),
    'utf8',
  );
  const template = fs.readFileSync(
    path.join(__dirname, 'IOSBoundary.swift'),
    'utf8',
  );
  const stripped = source
    .split('\n')
    .filter((line) => !line.startsWith('import '))
    .join('\n');
  const harness = template
    .replace('// ACTUAL_CLASS', stripped)
    .replace(
      '// BASELINE_ADAPTER',
      baseline
        ? 'extension LocationManager { func requestSingleLocation(includeAddress: Bool?, completion: @escaping (CLLocation?, AMapLocationReGeocode?, Error?) -> Void) { requestSingleLocation(completion: completion) } }'
        : '',
    );
  const file = path.join(output, 'main.swift');
  fs.writeFileSync(file, harness);
  cp.execFileSync(
    'xcrun',
    [
      'swiftc',
      '-module-cache-path',
      path.join(output, 'module-cache'),
      '-o',
      path.join(output, 'ios-boundary'),
      file,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(path.join(output, 'ios-boundary'), [], { stdio: 'inherit' });
} else throw new Error('Pass android or ios');
