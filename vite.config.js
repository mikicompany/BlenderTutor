import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sitemap({
      hostname: 'https://www.blendertutoring.com',
      outDir: 'docs',
      dynamicRoutes: [
        '/',
        '/blog',
        '/blog/how-long-to-learn-blender',
        '/blog/10-blender-modeling-addons',
        '/blog/blender-keyboard-shortcuts-beginners',
        '/blog/best-free-blender-tutorials-2026',
        '/radar'
      ]
    })
  ],
  assetsInclude: ['**/*.md'],
  build: {
    outDir: 'docs'
  }
})