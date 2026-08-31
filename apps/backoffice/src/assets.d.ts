/**
 * Binary modules that travel with the Worker bundle (src/lib/cardImage.ts).
 *
 * A Worker cannot compile WebAssembly at runtime and has no system fonts, so
 * the card renderer and its one typeface are imported rather than fetched: the
 * Cloudflare Vite plugin emits the .wasm beside the bundle, and Vite inlines
 * the font as a base64 data URI.
 *
 * Declared in a file of its own, not in env.d.ts, because BOTH TypeScript
 * projects need it — the app one and tsconfig.worker.json, which follows
 * worker.ts into the same libraries.
 */
declare module "*.wasm" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}

declare module "*.ttf?inline" {
  const dataUri: string;
  export default dataUri;
}
