import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendProxyTarget = process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:3000'
const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true'
const buildOutDir = process.env.VITE_BUILD_OUTDIR || 'dist'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: buildOutDir,
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5173,
    open: false,
    watch: usePolling ? { usePolling: true, interval: 120 } : undefined,
    proxy: {
      '/api': {
        target: backendProxyTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: backendProxyTarget,
        changeOrigin: true,
        ws: true
      },
      '/health': {
        target: backendProxyTarget,
        changeOrigin: true
      }
    }
  }
})
