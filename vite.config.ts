import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          rapier: ["@react-three/rapier"],
          r3f: ["@react-three/fiber", "@react-three/drei"],
        },
      },
    },
  },
});
