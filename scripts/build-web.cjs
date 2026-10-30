const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.join(__dirname, '../lib');
const source = path.join(root, 'module');
const output = path.join(root, 'web');
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, { recursive: true });
for (const file of fs.readdirSync(output, { recursive: true })) {
  if (!file.endsWith('.js')) continue;
  const target = path.join(output, file);
  const resolve = (specifier) => {
    if (!specifier.startsWith('.')) return specifier;
    const base = path.resolve(path.dirname(target), specifier);
    const stem = base.endsWith('.js') ? base.slice(0, -3) : base;
    const candidates = [
      `${stem}.web.js`,
      `${stem}.js`,
      path.join(stem, 'index.web.js'),
      path.join(stem, 'index.js'),
    ];
    const resolved = candidates.find((candidate) => fs.existsSync(candidate));
    if (!resolved)
      throw new Error(`无法解析 Web 产物导入: ${file} -> ${specifier}`);
    const relative = path
      .relative(path.dirname(target), resolved)
      .split(path.sep)
      .join('/');
    return relative.startsWith('.') ? relative : `./${relative}`;
  };
  const rewrite = ({ node }) => {
    if (node.source) node.source.value = resolve(node.source.value);
  };
  const map = `${target}.map`;
  const result = babel.transformSync(fs.readFileSync(target, 'utf8'), {
    filename: target,
    configFile: false,
    babelrc: false,
    sourceMaps: true,
    inputSourceMap: fs.existsSync(map)
      ? JSON.parse(fs.readFileSync(map, 'utf8'))
      : undefined,
    plugins: [
      () => ({
        visitor: {
          ImportDeclaration: rewrite,
          ExportNamedDeclaration: rewrite,
          ExportAllDeclaration: rewrite,
        },
      }),
    ],
  });
  fs.writeFileSync(
    target,
    `${result.code}\n//# sourceMappingURL=${path.basename(map)}\n`,
  );
  fs.writeFileSync(map, JSON.stringify(result.map));
}
console.log('Web 产物使用明确的平台路径与 ESM 扩展名');
