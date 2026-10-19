import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep the optional 3D renderer and its dependencies in cacheable chunks.
        manualChunks(id) {
          if (id.includes('/node_modules/@deck.gl/')) return 'deck';
          if (id.includes('/node_modules/@luma.gl/')) return 'luma';
          if (id.includes('/node_modules/@loaders.gl/')) return 'loaders';
          if (id.includes('/node_modules/leaflet/') || id.includes('/node_modules/react-leaflet/') ||
              id.includes('/node_modules/@react-leaflet/')) return 'leaflet';
          if (id.includes('/node_modules/')) return 'vendor';
        },
      },
    },
  },
})
