const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('Map harness checks explicit portable inputs without invoking a native compiler', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'map-inputs-'));
  try {
    const jar = path.join(root, 'amap.jar');
    const androidJar = path.join(root, 'android.jar');
    const evidence = path.join(root, 'evidence.json');
    const kotlinEnv = path.join(root, 'kotlin.json');
    fs.writeFileSync(jar, 'fixture');
    fs.writeFileSync(androidJar, 'fixture');
    fs.writeFileSync(evidence, JSON.stringify({ jar }));
    fs.writeFileSync(
      kotlinEnv,
      JSON.stringify({
        java: 'MUST-NOT-EXECUTE',
        compilerClasspath: 'fixture',
        compilerMain: 'fixture',
        compileClasspath: 'fixture',
        runtimeClasspath: 'fixture',
      }),
    );
    const env = {
      ...process.env,
      AMAP_EVIDENCE: evidence,
      ANDROID_JAR: androidJar,
      KOTLIN_ENV: kotlinEnv,
    };
    const run = (overrides) =>
      spawnSync(
        process.execPath,
        [
          path.join(__dirname, 'nativeHarness.cjs'),
          'android',
          '--check-inputs',
        ],
        { env: { ...env, ...overrides }, encoding: 'utf8' },
      );
    const passed = run({});
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /no native compiler invoked/);
    for (const key of ['AMAP_EVIDENCE', 'ANDROID_JAR', 'KOTLIN_ENV']) {
      const failed = run({ [key]: path.join(root, 'missing') });
      assert.equal(failed.status, 1);
      assert.match(failed.stderr, new RegExp('Missing ' + key));
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
