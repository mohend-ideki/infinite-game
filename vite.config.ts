import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (normalizedId.includes("/node_modules/three/")) {
            return "three";
          }

          if (normalizedId.includes("/node_modules/@react-three/rapier/")) {
            return "rapier";
          }

          if (
            normalizedId.includes("/node_modules/@react-three/fiber/") ||
            normalizedId.includes("/node_modules/@react-three/drei/")
          ) {
            return "r3f";
          }
        },
      },
    },
  },
});
