import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'maskable-icon.png', 'manifest.webmanifest'],
      // We are using a static manifest in public/manifest.webmanifest
      // to ensure Vercel serves it correctly.
    })
  ],
})
