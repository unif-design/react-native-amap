const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const root =
  process.env.SDK_ROOT ||
  path.dirname(require.resolve('expo-gaode-map/package.json'));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-places-native-'));
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
if (process.argv[2] === 'ios') {
  const source = fs.readFileSync(
    path.join(root, 'ios/ExpoGaodeMapSearchModule.swift'),
    'utf8',
  );
  const names = [
    'private func convertPOISearchResponse(',
    'private func convertPOI(',
    'private func convertReGeocodeResponse(',
  ];
  for (const name of ['private func coordinates(', 'private func records<'])
    if (source.includes(name)) names.push(name);
  let template = fs.readFileSync(
    path.join(__dirname, 'IOSBoundary.swift'),
    'utf8',
  );
  if (!source.includes('private func records<'))
    template = template.replace(
      / {4}\/\/ Added helper path[\s\S]*?(?= {4}if failures == 0)/,
      '',
    );
  const text = template.replace(
    '// ACTUAL_METHODS',
    names.map((n) => method(source, n)).join('\n'),
  );
  const file = path.join(output, 'main.swift');
  fs.writeFileSync(file, text);
  cp.execFileSync(
    'xcrun',
    [
      'swiftc',
      '-module-cache-path',
      path.join(output, 'cache'),
      '-o',
      path.join(output, 'probe'),
      file,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(path.join(output, 'probe'), [], { stdio: 'inherit' });
} else if (process.argv[2] === 'ios-privacy') {
  const source = fs.readFileSync(
    path.join(root, 'ios/ExpoGaodeMapSearchModule.swift'),
    'utf8',
  );
  const privacy = fs.readFileSync(
    path.join(root, 'ios/GaodeMapPrivacyManager.swift'),
    'utf8',
  );
  const text = fs
    .readFileSync(path.join(__dirname, 'IOSPrivacy.swift'), 'utf8')
    .replace('// KEY_METHOD', method(source, 'private func ensureAPIKeyIsSet('))
    .replace(
      '// PRIVACY_METHOD',
      method(privacy, 'static func applyPrivacyState('),
    );
  const file = path.join(output, 'main.swift');
  fs.writeFileSync(file, text);
  cp.execFileSync(
    'xcrun',
    [
      'swiftc',
      '-module-cache-path',
      path.join(output, 'cache'),
      '-o',
      path.join(output, 'probe'),
      file,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(path.join(output, 'probe'), [], { stdio: 'inherit' });
} else if (process.argv[2] === 'android-privacy') {
  const base = path.join(root, 'android/src/main/java/expo/modules/gaodemap');
  const initializer = fs.readFileSync(
    path.join(base, 'modules/SDKInitializer.kt'),
    'utf8',
  );
  const search = fs.readFileSync(
    path.join(base, 'search/ExpoGaodeMapSearchModule.kt'),
    'utf8',
  );
  const names = ['fun applyPrivacyState(', 'fun initSDK('];
  if (initializer.includes('fun getAPIKey(')) names.push('fun getAPIKey(');
  const text = fs
    .readFileSync(path.join(__dirname, 'AndroidPrivacy.kt'), 'utf8')
    .replace(
      '// INITIALIZER_METHODS',
      names.map((n) => method(initializer, n)).join('\n'),
    )
    .replace(
      '// SEARCH_METHOD',
      method(search, 'private fun ensureAPIKeyIsSet('),
    )
    .replaceAll('android.util.Log', 'Log')
    .replaceAll(
      'expo.modules.kotlin.exception.CodedException',
      'CodedException',
    )
    .replaceAll('android.content.pm.PackageManager', 'PackageManager');
  const env = JSON.parse(
    fs.readFileSync(
      process.env.KOTLIN_ENV || '/tmp/portal-location-kotlin-env.json',
      'utf8',
    ),
  );
  const file = path.join(output, 'AndroidPrivacy.kt');
  fs.writeFileSync(file, text);
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
    ['-cp', output + path.delimiter + env.runtimeClasspath, 'AndroidPrivacyKt'],
    { stdio: 'inherit' },
  );
} else if (process.argv[2] === 'android-serialization') {
  const source = fs.readFileSync(
    path.join(
      root,
      'android/src/main/java/expo/modules/gaodemap/search/ExpoGaodeMapSearchModule.kt',
    ),
    'utf8',
  );
  const names = [
    'private fun convertPoiItem(',
    'private fun convertLegacyPoiItem(',
    'private fun convertPoiResult(',
    'private fun convertRegeocodeResult(',
  ];
  const text = fs
    .readFileSync(path.join(__dirname, 'AndroidSerialization.kt'), 'utf8')
    .replace(
      '// ACTUAL_METHODS',
      names.map((n) => method(source, n)).join('\n'),
    );
  const env = JSON.parse(
    fs.readFileSync(
      process.env.KOTLIN_ENV || '/tmp/portal-location-kotlin-env.json',
      'utf8',
    ),
  );
  const jar = JSON.parse(
    fs.readFileSync(
      process.env.AMAP_EVIDENCE || '/tmp/portal-places-query-evidence.json',
      'utf8',
    ),
  ).jar;
  const androidJar =
    process.env.ANDROID_JAR ||
    path.join(
      os.homedir(),
      'Library/Android/sdk/platforms/android-36/android.jar',
    );
  const file = path.join(output, 'AndroidSerialization.kt');
  fs.writeFileSync(file, text);
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
      output,
      file,
    ],
    { stdio: 'inherit' },
  );
  cp.execFileSync(
    env.java,
    [
      '-cp',
      [output, env.runtimeClasspath, jar, androidJar].join(path.delimiter),
      'AndroidSerializationKt',
    ],
    { stdio: 'inherit' },
  );
} else if (process.argv[2] === 'android') {
  const source = fs.readFileSync(
    path.join(
      root,
      'android/src/main/java/expo/modules/gaodemap/search/ExpoGaodeMapSearchModule.kt',
    ),
    'utf8',
  );
  const env = JSON.parse(
    fs.readFileSync(
      process.env.KOTLIN_ENV || '/tmp/portal-location-kotlin-env.json',
      'utf8',
    ),
  );
  const jar = JSON.parse(
    fs.readFileSync(
      process.env.AMAP_EVIDENCE || '/tmp/portal-places-query-evidence.json',
      'utf8',
    ),
  ).jar;
  const androidJar =
    process.env.ANDROID_JAR ||
    path.join(
      os.homedir(),
      'Library/Android/sdk/platforms/android-36/android.jar',
    );
  const queryBlocks = [
    ...source.matchAll(
      /val query = PoiSearchV2.Query\(keyword, types(?:, city)?\)[\s\S]*?query.showFields = PoiSearchV2.ShowFields\(PoiSearchV2.ShowFields.ALL\)/g,
    ),
  ].map((m) => m[0]);
  const reverse = source
    .match(
      /val query = RegeocodeQuery\(point, radius, GeocodeSearch.AMAP\)[\s\S]*?\n\s*geocodeSearch.getFromLocationAsyn/,
    )[0]
    .replace(/\n\s*geocodeSearch.getFromLocationAsyn$/, '');
  const text =
    `import com.amap.api.services.poisearch.PoiSearchV2\nimport com.amap.api.services.geocoder.*\nimport com.amap.api.services.core.LatLonPoint\nfun main() {\nval keyword=""; val types=""; val city=""; val pageSize=25\nvar failures=0\nfun check(ok:Boolean,message:String) { if(!ok) { failures++; println("FAIL: "+message) } }\n` +
    queryBlocks
      .map(
        (block, i) =>
          `for(pageNum in 1..2) {\n${block}\ncheck(query.pageNum == pageNum,"query ${i} page $pageNum became "+query.pageNum)\n}\n`,
      )
      .join('') +
    `for(extension in listOf(false,true)) { val options=mapOf<String,Any?>("requireExtension" to extension); val point=LatLonPoint(0.0,0.0); val radius=0f\n${reverse}\ncheck(query.extensions == (if(extension) "all" else "base"),"extension $extension mapped to "+query.extensions)\ncheck(query.radius==0f,"radius retained")\n}\ncheck(PoiSearchV2.SearchBound(LatLonPoint(0.0,0.0),0).range==0,"zero coordinate/radius parameter retained")\nif(failures>0) throw IllegalStateException("$failures failures")\nprintln("Android actual Query blocks against vendor jar: PASS")\n}`;
  const file = path.join(output, 'AndroidBoundary.kt');
  fs.writeFileSync(file, text);
  const classpath = [env.compileClasspath, jar, androidJar].join(
    path.delimiter,
  );
  cp.execFileSync(
    env.java,
    [
      '-cp',
      env.compilerClasspath,
      env.compilerMain,
      '-no-stdlib',
      '-no-reflect',
      '-classpath',
      classpath,
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
      [output, env.runtimeClasspath, jar, androidJar].join(path.delimiter),
      'AndroidBoundaryKt',
    ],
    { stdio: 'inherit' },
  );
} else throw Error('Pass ios or android');
