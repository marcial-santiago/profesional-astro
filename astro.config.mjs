// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://profesional-astro.vercel.app/",
  integrations: [mdx(), sitemap()],
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss()],
  },
});
