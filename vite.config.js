import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['three/examples/jsm/webgpu'] // ignore optional WebGPU import
  },
  build: {
    commonjsOptions: {
      ignoreTryCatch: trueimport { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()]
});

    }
  }
});
