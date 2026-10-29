const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const root =
  process.env.SDK_ROOT ||
  path.dirname(require.resolve('expo-gaode-map/package.json'));
const mode = process.argv[2];
let androidInputs;
if (['android', 'android-drag', 'android-wiring'].includes(mode)) {
  const evidence =
    process.env.AMAP_EVIDENCE || '/tmp/portal-places-query-evidence.json';
  const androidJar =
    process.env.ANDROID_JAR ||
    path.join(
      os.homedir(),
      'Library/Android/sdk/platforms/android-36/android.jar',
    );
  const kotlinEnv =
    process.env.KOTLIN_ENV || '/tmp/portal-location-kotlin-env.json';
  function requireFile(file, label) {
    if (
      typeof file !== 'string' ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      throw Error(
        `Missing ${label}: set ${label} to an existing input file (${file})`,
      );
    }
  }
  requireFile(evidence, 'AMAP_EVIDENCE');
  requireFile(androidJar, 'ANDROID_JAR');
  requireFile(kotlinEnv, 'KOTLIN_ENV');
  const { jar } = JSON.parse(fs.readFileSync(evidence, 'utf8'));
  requireFile(jar, 'AMAP_EVIDENCE.jar');
  const env = JSON.parse(fs.readFileSync(kotlinEnv, 'utf8'));
  for (const field of [
    'java',
    'compilerClasspath',
    'compilerMain',
    'compileClasspath',
    'runtimeClasspath',
  ]) {
    if (typeof env[field] !== 'string' || !env[field])
      throw Error(`KOTLIN_ENV requires ${field}`);
  }
  androidInputs = { jar, androidJar, env };
}
if (process.argv.includes('--check-inputs')) {
  if (!androidInputs) throw Error('--check-inputs requires an android mode');
  console.log('Map Android inputs verified; no native compiler invoked');
  process.exit(0);
}
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-map-native-'));
function method(source, start) {
  const begin = source.indexOf(start);
  if (begin < 0) throw Error('Missing actual method: ' + start);
  const brace = source.indexOf('{', begin);
  let depth = 1,
    end = brace + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw Error('Unclosed method');
  return source.slice(begin, end);
}
if (
  mode === 'android' ||
  mode === 'android-drag' ||
  mode === 'android-wiring'
) {
  const file = path.join(out, 'AndroidBoundary.kt');
  const actual = fs
    .readFileSync(
      path.join(
        root,
        'android/src/main/java/expo/modules/gaodemap/managers/CameraManager.kt',
      ),
      'utf8',
    )
    .replace(/^(package|import) .+\n/gm, '');
  fs.writeFileSync(
    file,
    fs
      .readFileSync(path.join(__dirname, 'AndroidBoundary.kt'), 'utf8')
      .replace('// ACTUAL_CAMERA', actual),
  );
  if (mode === 'android-drag')
    fs.copyFileSync(path.join(__dirname, 'AndroidDrag.kt'), file);
  if (mode === 'android-wiring') {
    const view = fs.readFileSync(
      path.join(
        root,
        'android/src/main/java/expo/modules/gaodemap/ExpoGaodeMapView.kt',
      ),
      'utf8',
    );
    const tracker = fs
      .readFileSync(
        path.join(
          root,
          'android/src/main/java/expo/modules/gaodemap/managers/UserDragTracker.kt',
        ),
        'utf8',
      )
      .replace(/^(package|import) .+\n/gm, '');
    const names = [
      'override fun dispatchTouchEvent(',
      'internal fun cancelUserDrag(',
      'internal fun releaseUserDrag(',
      'fun moveCamera(position:',
    ];
    const property = view.slice(
      view.indexOf('private val userDrag ='),
      view.indexOf('    override fun dispatchTouchEvent'),
    );
    let boundary = fs
      .readFileSync(path.join(__dirname, 'AndroidBoundary.kt'), 'utf8')
      .split('fun main()')[0]
      .replace('// ACTUAL_CAMERA', actual);
    boundary = boundary.replace(
      'class AMap {',
      'class AMap {\n var gesture:AMapGestureListener?=null;fun setAMapGestureListener(value:AMapGestureListener?){gesture=value}',
    );
    fs.writeFileSync(
      file,
      fs
        .readFileSync(path.join(__dirname, 'AndroidWiring.kt'), 'utf8')
        .replace('// ACTUAL_CAMERA_AND_BOUNDARY', boundary)
        .replace('// ACTUAL_TRACKER_PROPERTY', property)
        .replace('// ACTUAL_TRACKER', tracker)
        .replace(
          '// ACTUAL_VIEW_METHODS',
          names.map((name) => method(view, name)).join('\n'),
        ),
    );
  }
  const extra =
    mode === 'android-drag'
      ? [
          path.join(
            root,
            'android/src/main/java/expo/modules/gaodemap/managers/UserDragTracker.kt',
          ),
        ]
      : [];
  const { jar, androidJar, env } = androidInputs;
  cp.execFileSync(
    env.java,
    [
      '-cp',
      env.compilerClasspath,
      env.compilerMain,
      '-no-stdlib',
      '-no-reflect',
      '-classpath',
      [env.compileClasspath, jar, androidJar].join(path.delimiter),
      '-jvm-target',
      '17',
      '-d',
      out,
      file,
      ...extra,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(
    env.java,
    [
      '-cp',
      [out, env.runtimeClasspath, jar, androidJar].join(path.delimiter),
      mode === 'android-drag'
        ? 'expo.modules.gaodemap.managers.AndroidBoundaryKt'
        : 'AndroidBoundaryKt',
    ],
    { stdio: 'inherit' },
  );
} else if (mode === 'ios' || mode === 'ios-drag' || mode === 'ios-wiring') {
  const file = path.join(out, 'main.swift');
  const actual = fs
    .readFileSync(path.join(root, 'ios/managers/CameraManager.swift'), 'utf8')
    .replace(/^import .+\n/gm, '');
  fs.writeFileSync(
    file,
    fs
      .readFileSync(path.join(__dirname, 'IOSBoundary.swift'), 'utf8')
      .replace('// ACTUAL_CAMERA', actual),
  );
  if (mode === 'ios-drag')
    fs.writeFileSync(
      file,
      fs
        .readFileSync(path.join(__dirname, 'IOSDrag.swift'), 'utf8')
        .replace(
          '// ACTUAL_TRACKER',
          fs.readFileSync(
            path.join(root, 'ios/managers/UserDragTracker.swift'),
            'utf8',
          ),
        ),
    );
  if (mode === 'ios-wiring') {
    const view = fs.readFileSync(
      path.join(root, 'ios/ExpoGaodeMapView.swift'),
      'utf8',
    );
    const names = [
      'public func mapView(_ mapView: MAMapView, mapWillMoveByUser',
      'public func mapView(_ mapView: MAMapView, mapDidMoveByUser',
      'public func mapView(_ mapView: MAMapView, mapWillZoomByUser',
      'public func mapView(_ mapView: MAMapView, mapDidZoomByUser',
    ];
    fs.writeFileSync(
      file,
      fs
        .readFileSync(path.join(__dirname, 'IOSWiring.swift'), 'utf8')
        .replace(
          '// ACTUAL_TRACKER',
          fs.readFileSync(
            path.join(root, 'ios/managers/UserDragTracker.swift'),
            'utf8',
          ),
        )
        .replace(
          '// ACTUAL_OBSERVER',
          fs
            .readFileSync(
              path.join(root, 'ios/managers/DragTouchObserver.swift'),
              'utf8',
            )
            .replace('import UIKit', ''),
        )
        .replace(
          '// ACTUAL_DELEGATES',
          names.map((name) => method(view, name)).join('\n'),
        ),
    );
  }
  cp.execFileSync(
    'xcrun',
    [
      'swiftc',
      '-module-cache-path',
      path.join(out, 'cache'),
      '-o',
      path.join(out, 'probe'),
      file,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(path.join(out, 'probe'), [], { stdio: 'inherit' });
} else throw Error('Pass android or ios');
