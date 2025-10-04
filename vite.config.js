import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["three/examples/jsm/webgpu"], // 👈 prevent missing module warning
  },
  build: {
    commonjsOptions: {
      ignoreTryCatch: false, // 👈 ensures optional imports don't break build
    },
  },
});
