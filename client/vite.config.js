import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from 'vite-plugin-prerender'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prerender({
      staticDir: 'dist',
      routes: ['/', '/leaderboard', '/roadmap', '/rules'],
    }),
  ],
})
