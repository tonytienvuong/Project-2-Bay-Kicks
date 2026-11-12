import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Bootstrap 5 comes from node_modules — a real dependency, not a CDN link:
//   bootstrap.min.css   -> grid, buttons, forms, navbar, utilities
//   bootstrap.bundle.js -> the JavaScript behaviours, including the navbar
//                          hamburger collapsing on small screens
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
