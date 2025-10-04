import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      three: "three", // ensures consistent path resolution
    },
  },
  optimizeDeps: {
    exclude: ["three/examples/jsm/webgpu", "three/examples/jsm/webxr"],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore missing export warnings from three
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" || /webgpu/.test(warning.message)) return;
        warn(warning);
      },
    },
    commonjsOptions: {
      ignoreTryCatch: false, // Prevent optional import crashes
    },
  },
});
