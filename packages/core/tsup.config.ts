import { defineConfig } from 'tsup';

// @praxo/utils is an internal implementation-detail package, not something
// consumers should have to install or resolve separately — it's inlined
// into every core build output rather than left as an external import.
const noExternal = ['@praxo/utils'];

export default defineConfig([
  {
    entry: { editor: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    noExternal,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.esm.js' : '.js' };
    },
  },
  {
    // Browser-ready, minified global build (`<script src="editor.min.js">`).
    entry: { editor: 'src/index.ts' },
    format: ['iife'],
    globalName: 'Praxo',
    minify: true,
    sourcemap: true,
    noExternal,
    outExtension() {
      return { js: '.min.js' };
    },
  },
]);
