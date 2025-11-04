import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This configures our React + Vite build process
export default defineConfig({
  plugins: [react()],
  server: {
    // This allows the dev server to be accessed
    host: '0.0.0.0',
    port: 5173, // Default Vite port
    // 🔁 Proxy setup for Python backend
    proxy: {
      '/api': {
        target: 'http://45.117.183.187:8085', // Your Python backend
        changeOrigin: true,
        secure: false, // Allow HTTP
        rewrite: (path) => path.replace(/^\/api/, ''), // Removes '/api' prefix
      },
    },
  },
})

