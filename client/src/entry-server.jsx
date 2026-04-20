import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'

/**
 * Server entry point for prerendering.
 * React Router 7's MemoryRouter is SSR-safe as it doesn't depend on the DOM.
 */
export function render(url) {
  return renderToString(
    <React.StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </React.StrictMode>
  )
}
