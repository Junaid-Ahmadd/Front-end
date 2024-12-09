import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte({
    hot: {
      // Prevent automatic reload on syntax error
      noReload: true,
      // Prevent preservation of local component state
      preserveState: false
    }
  })],
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    strictPort: true, // Fail if port is in use
    open: true, // Open browser on start
    hmr: {
      overlay: false // Disable the HMR error overlay
    }
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
