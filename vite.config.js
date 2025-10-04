import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["three/examples/jsm/webgpu"] // prevent Vite trying to resolve missing webgpu
  },
  build: {
    commonjsOptions: {
      ignoreTryCatch: false
    }
  }
});
