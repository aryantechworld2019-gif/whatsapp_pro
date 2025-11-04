import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// This configures our React + Vite build process
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  // Get backend URL from environment variable or use default
  const backendTarget = env.VITE_BACKEND_URL || 'http://45.117.183.187:8085'

  return {
    plugins: [react()],
    server: {
      // This allows the dev server to be accessed
      host: '0.0.0.0',
      port: 5173, // Default Vite port
      // 🔁 Proxy setup for Python backend
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false, // Allow HTTP
          rewrite: (path) => path.replace(/^\/api/, ''), // Removes '/api' prefix
        },
      },
    },
  }
})

