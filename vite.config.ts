import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    port: 5177,
    proxy: {
      '/api': {
        target: 'http://2ca57570.r26.cpolar.top', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/audio': {
        target: 'http://2ca57570.r26.cpolar.top',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/audio/, '/audio')
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
