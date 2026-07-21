# Vanilla JavaScript example

Minimal, no-bundler usage of `@praxo/core`.

## Run

```bash
# from the repo root
npm install
npm run example
```

This builds every package and serves the repo root at `http://localhost:5173/`. Open
`http://localhost:5173/examples/vanilla/`.

Or do it manually:

```bash
npm install
npm run build
npx serve .   # serve the repo root, not this directory — see note below
```

Then open `http://localhost:<port>/examples/vanilla/`.

`main.js` imports directly from `../../packages/core/dist/editor.esm.js` via a relative path, so
the static server must be rooted at the repo root (not this directory) for that import to resolve,
and `npm run build` must have completed first.

**Don't open `index.html` directly as a `file://` URL** — browsers block ES module imports from
the local filesystem, so the editor will silently fail to appear. This example now catches that
and renders a red error banner explaining the fix (missing build or wrong protocol) instead of
failing silently.
