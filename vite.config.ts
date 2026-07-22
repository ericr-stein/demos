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
    // dev container is reached through Caddy at demos-dev.nonsh.site
    allowedHosts: ['demos-dev.nonsh.site'],
    proxy: {
      // the dev containers set this: demos-api:3000 on the devbox stack,
      // api:3000 in the local stack; bare `make dev` falls back to :3000
      '/api': process.env.DEMOS_API_PROXY ?? 'http://127.0.0.1:3000',
    },
  },
})
