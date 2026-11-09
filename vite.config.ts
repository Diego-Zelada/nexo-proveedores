import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { allowedHosts: ['terminal.local'], proxy: { '/api': 'http://127.0.0.1:3001' } },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
