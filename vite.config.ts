// vite.config.ts
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Effect Camera PWA",
        short_name: "EffectCam",
        start_url: ".",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {src: "pwa-192.png", sizes: "192x192", type: "image/png"},
          {src: "pwa-512.png", sizes: "512x512", type: "image/png"},
        ],
      },
    }),
  ],
});
