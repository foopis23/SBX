import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { defineConfig } from "vite";
import { resolve, dirname } from 'node:path';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        physics: resolve(__dirname, 'examples/physics/index.html'),
        input_keys: resolve(__dirname, 'examples/input-keys/index.html')
      }
    }
  }
});
