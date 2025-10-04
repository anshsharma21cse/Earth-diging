// vite.config.js
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [], // don't pre-bundle anything
    exclude: ["three"]
  },
  build: {
    commonjsOptions: {
      ignoreTryCatch: true
    }
  }
});
