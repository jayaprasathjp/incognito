import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(import.meta.url)
const prerender = require('vite-plugin-prerender')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prerender({
      staticDir: path.join(process.cwd(), 'dist'),
      routes: ['/', '/leaderboard', '/roadmap', '/rules'],
    }),
  ],
})
