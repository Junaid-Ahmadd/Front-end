import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [svelte({
    hot: command === 'serve' ? {
      // Prevent automatic reload on syntax error
      noReload: true,
      // Prevent preservation of local component state
      preserveState: false
    } : false
  })],
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    strictPort: true, // Fail if port is in use
    open: true, // Open browser on start
    hmr: command === 'serve' ? {
      overlay: false // Disable the HMR error overlay
    } : false
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
}))
