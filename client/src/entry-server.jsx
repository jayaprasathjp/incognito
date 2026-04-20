import React from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'

// SSR Mocking for browser globals
if (typeof global !== 'undefined' && !global.localStorage) {
  global.localStorage = {
    getItem: () => null,
    setItem: () => null,
    removeItem: () => null,
  };
}

/**
 * Server entry point for prerendering.
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
