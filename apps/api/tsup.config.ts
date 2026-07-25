import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  // Bundle EVERYTHING (workspace @repo/* packages + all npm deps) into a single
  // self-contained dist/index.js so the container needs only Node — no node_modules.
  // @repo/* have no runtime entry point, so they MUST be inlined here.
  noExternal: [/.*/],
  external: ["pg-native"], // optional native driver pg loads lazily; not installed
  shims: true, // inject import.meta.url / __dirname shims so bundled ESM deps' createRequire works
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
