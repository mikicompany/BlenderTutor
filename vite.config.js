import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import sitemap from 'vite-plugin-sitemap'
import { posts } from './src/blog/posts.js'

// Blog routes come straight from the posts data so the sitemap can never
// drift out of sync with the actual slugs.
const postRoutes = posts.map((post) => `/blog/${post.slug}`)
const postLastmod = Object.fromEntries(
  posts.map((post) => [`/blog/${post.slug}`, new Date(post.date)])
)
const postPriority = Object.fromEntries(postRoutes.map((route) => [route, 0.7]))
const postChangefreq = Object.fromEntries(
  postRoutes.map((route) => [route, 'monthly'])
)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sitemap({
      hostname: 'https://www.blendertutoring.com',
      outDir: 'docs',
      // '/' is picked up from docs/index.html, so listing it here too
      // would emit a duplicate entry.
      dynamicRoutes: ['/blog', ...postRoutes, '/radar', '/free', '/terms', '/privacy'],
      // The SPA fallback page and the Search Console verification file are
      // real .html files in docs/, but neither belongs in a sitemap.
      //
      // /pay is excluded for a different reason: it is a payment link sent
      // privately. The plugin scans docs/ for .html files, and prerender.js
      // writes docs/pay.html — so from the second build onward it would be
      // picked up automatically without this.
      // The two old Maya posts were merged into /blog/blender-for-maya-users.
      // Their URLs now serve redirect stubs (public/blog/...), which must stay
      // out of the sitemap.
      exclude: [
        '/404',
        '/googlea46d0184849e086f',
        '/pay',
        '/blog/blender-maya-theme',
        '/blog/maya-workflow-kit-blender',
        // Removed post; its URL now serves a redirect stub to /blog.
        '/blog/how-to-make-lava-blender',
      ],
      priority: {
        '/': 1.0,
        '/blog': 0.8,
        '/radar': 0.7,
        ...postPriority,
        '/terms': 0.3,
        '/privacy': 0.3,
        '*': 0.5,
      },
      changefreq: {
        '/': 'monthly',
        '/blog': 'weekly',
        '/radar': 'daily',
        ...postChangefreq,
        '/terms': 'yearly',
        '/privacy': 'yearly',
        '*': 'monthly',
      },
      // Posts carry their own publish date; everything else falls back to
      // the build time.
      lastmod: postLastmod,
      // `readable: true` indents the URL inside <loc>, so parsers see the
      // address surrounded by newlines. Keep the compact form.
      readable: false,
    }),
  ],
  assetsInclude: ['**/*.md'],
  build: {
    outDir: 'docs',
  },
})
