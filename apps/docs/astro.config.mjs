// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [wasm(), topLevelAwait()],
    build: {
      rollupOptions: {
        treeshake: false,
      },
    },
  },
  integrations: [
    starlight({
      title: "SBX",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ["../../packages/core/src/index.ts"],
          tsconfig: "../../packages/core/tsconfig.json",
        }),
      ],
      sidebar: [
        {
          label: "Guides",
          items: [{ label: "Getting Started", slug: "guides/getting-started" }],
        },
        {
          label: "Examples",
          items: [
            { label: "Input Keys", link: "/examples/input-keys" },
            { label: "Physics", link: "/examples/physics" },
          ],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
});
