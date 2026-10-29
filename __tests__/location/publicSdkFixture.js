const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the installed SDK's actual JS; only Expo and React Native are replaced.
function loadPublicSdk(native) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) {
      return cache.get(filename).exports;
    }
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;
    const execute = new vm.Script(
      `(function(require, module, exports) {${code}\n})`,
      { filename },
    ).runInThisContext();
    execute(
      (id) => {
        if (id === 'expo') {
          return { requireNativeModule: () => native };
        }
        if (id === 'react-native') {
          return {
            Platform: {
              OS: 'ios',
              select: (values) => values.ios ?? values.default,
            },
          };
        }
        if (!id.startsWith('.')) {
          throw new Error(`Unexpected SDK dependency: ${id}`);
        }
        return load(require.resolve(path.resolve(path.dirname(filename), id)));
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  return {
    ExpoGaodeMapModule: load(
      require.resolve('expo-gaode-map/build/ExpoGaodeMapModule'),
    ).default,
    ErrorLogger: load(
      require.resolve('expo-gaode-map/build/utils/ErrorHandler'),
    ).ErrorLogger,
  };
}
module.exports = { loadPublicSdk };
