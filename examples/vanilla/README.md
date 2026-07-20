# Vanilla JavaScript example

Minimal, no-bundler usage of `@praxo/core`.

## Run

```bash
# from the repo root
npm install
npm run build
npx serve .   # serve the repo root, not this directory — see note below
```

Then open `http://localhost:<port>/examples/vanilla/`.

`main.js` imports directly from `../../packages/core/dist/editor.esm.js` via a relative path, so
the static server must be rooted at the repo root (not this directory) for that import to resolve,
and `npm run build` must have completed first.
