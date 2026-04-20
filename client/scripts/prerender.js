import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, '..', p)

async function prerender() {
  const manifest = {} // Optional manifest if needed
  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
  
  // Dynamic import the server entry built by Vite
  const { render } = await import('../dist-server/entry-server.js')

  const routesWithPrerender = [
    { path: '/', file: 'index.html' },
    { path: '/leaderboard', file: 'leaderboard/index.html' },
    { path: '/roadmap', file: 'roadmap/index.html' },
    { path: '/rules', file: 'rules/index.html' }
  ]

  console.log('--- Starting Prerender ---')

  for (const { path: url, file } of routesWithPrerender) {
    try {
      const appHtml = await render(url)
      
      // Inject the rendered HTML into the template at the <div id="root">
      // We also add a placeholder comment so we know it was prerendered
      const html = template.replace(
        '<!--app-html-->', 
        `<!--prerendered-->${appHtml}`
      ).replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      )

      const filePath = toAbsolute(`dist/${file}`)
      const dir = path.dirname(filePath)
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(filePath, html)
      console.log(`✓ Prerendered: ${url} -> ${file}`)
    } catch (e) {
      console.error(`✗ Error prerendering ${url}:`, e.stack || e)
    }
  }

  console.log('--- Prerender Complete ---')
}

prerender()
