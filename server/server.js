/* server.js — the Express app for Bay Kicks Project 2.

   What it does, in order:
     1. reads .env (Atlas URI, session secret)
     2. parses JSON bodies and HTML form bodies
     3. turns on sessions — this is what makes the cart survive page loads
     4. mounts the three route files under /api
     5. serves the built React app out of dist/

   Run it with:  npm run server     (or npm start)
   Build the React app first with:  npm run build
*/

import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { connectDb, dbState, noteDbError } from './db.js'
import accountsRouter from './routes/accounts.js'
import cartRouter from './routes/cart.js'
import checkoutRouter from './routes/checkout.js'

// ESM has no __dirname, so build it from the module's own URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()
const PORT = process.env.PORT || 3000

/* ---------- body parsing ---------- */
// json() is for fetch() calls from React; urlencoded() is for plain <form>
// posts. Both are on so either style works.
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/* ---------- sessions ---------- */
// express-session gives every browser a signed cookie holding an id. The data
// itself (req.session.cart, req.session.user) lives on the server, keyed by
// that id. MemoryStore is fine for one machine and a class project; it resets
// when the server restarts.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false, // don't re-save a session nobody changed
    saveUninitialized: false, // don't store a session until something is in it
    cookie: {
      httpOnly: true, // page JavaScript can't read the cookie
      sameSite: 'lax', // blocks most cross-site form posts
      maxAge: 1000 * 60 * 60 * 24, // a day
    },
  }),
)

/* ---------- api routes ---------- */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    db: dbState(),
    cartLines: (req.session.cart || []).length,
    signedInAs: req.session.user ? req.session.user.login : null,
  })
})

app.use('/api', accountsRouter) // #2 createAccount, #3 login
app.use('/api', cartRouter) // #4 add to cart, #5 cart page data
app.use('/api', checkoutRouter) // #6 checkout -> orders collection

// Unknown /api path: answer with JSON, not the React index.html, so a typo in a
// fetch() shows up as a clear 404 instead of a page of HTML.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'No such API route: ' + req.method + ' ' + req.originalUrl })
})

/* ---------- the React app ---------- */
app.use(express.static(distDir))

// The rubric names createAccount.html and account.html. The React app is a
// single page, so those paths (and the clean versions) all hand back
// index.html and let the client decide what to draw. App.jsx reads
// window.location.pathname to pick the starting view.
const pageRoutes = [
  '/',
  '/shop',
  '/cart',
  '/checkout',
  '/account',
  '/createAccount',
  '/account.html',
  '/createAccount.html',
]
for (const route of pageRoutes) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

/* ---------- error handler ---------- */
// Four arguments marks this as Express's error handler. Anything thrown inside
// a route lands here instead of killing the process.
app.use((err, req, res, next) => {
  console.error('[server]', err.message)
  res.status(err.status || 500).json({ error: err.message })
})

/* ---------- start ---------- */
async function start() {
  try {
    await connectDb()
    console.log('[db] connected to', dbState().database)
  } catch (err) {
    // Keep the server up anyway: the storefront pages still work without a
    // database, and /api/health tells you exactly what is wrong.
    noteDbError(err)
    console.error('[db] NOT connected:', err.message)
  }

  app.listen(PORT, () => {
    console.log(`[web] Bay Kicks running at http://localhost:${PORT}`)
  })
}

start()
