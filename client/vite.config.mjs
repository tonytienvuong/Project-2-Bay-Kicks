// vite.config.js — build settings for the React client (CS351 Project 2).
//
// The React app now lives in client/ and the Express server in server/, which is
// the split the project page asks for ("I want top level client and server
// directories"). Vite treats this directory as its root, so index.html, src/ and
// public/ are found here and the build lands in client/dist — the folder Express
// serves to the browser.

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // '/' works because Express serves the built app from the domain root and hands
  // index.html back for every page route (/shop, /cart, ...). Absolute asset paths
  // resolve correctly from any of those URLs, including a Cloud Run hostname.
  base: '/',
  plugins: [react()],
  build: {
    // client/dist — the folder server/app.js points express.static at.
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // During `npm run dev` the Vite dev server has no API of its own, so /api calls
    // are forwarded to the Express server on port 3000.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
