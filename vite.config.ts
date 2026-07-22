import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // bind mounts on Windows/macOS Docker don't deliver file events — the
    // dockerized dev stacks set this so HMR works by polling instead
    watch: process.env.VITE_FORCE_POLLING
      ? { usePolling: true, interval: 300 }
      : undefined,
    proxy: {
      // the dev stack sets this to api:3000; bare `pnpm dev` falls back
      '/api': process.env.DEMOS_API_PROXY ?? 'http://127.0.0.1:3000',
    },
  },
})
