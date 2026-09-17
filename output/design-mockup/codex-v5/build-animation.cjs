// Run from any working directory; repository paths are resolved from this file.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const fromProject = createRequire(path.join(root, 'package.json'));
const esbuild = fromProject('esbuild');

esbuild.buildSync({
  stdin: {
    contents: fs.readFileSync(path.join(__dirname, 'animation-entry.tsx.txt'), 'utf8'),
    resolveDir: root,
    sourcefile: 'animation-entry.tsx',
    loader: 'tsx',
  },
  outfile: path.join(__dirname, 'animation.bundle.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  alias: { '@': root },
  nodePaths: [path.join(root, 'node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true,
  legalComments: 'eof',
  tsconfigRaw: { compilerOptions: { jsx: 'react-jsx' } },
});
console.log('Rebuilt the preview from LoginJourney, CareerMap and RouteSearchLoader.');
