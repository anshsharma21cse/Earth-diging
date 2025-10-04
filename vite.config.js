import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["three/examples/jsm/webgpu"], // ignore optional WebGPU import
  },
  resolve: {
    alias: {
      three: "three/build/three.module.js", // force module build
    },
  },
  build: {
    commonjsOptions: {
      ignoreTryCatch: true, // ignore optional imports like WebGPU
    },
  },
});
