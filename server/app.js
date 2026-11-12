/* app.js — the Express application itself.

   This file only wires things together; the work lives in controllers/.
   The order of the middleware below matters and matches the project page:

     1. parse bodies        req.body for forms and fetch()
     2. sessions            req.session.cart and req.session.user live here
     3. /api routes         the JSON API the React app calls
     4. static React build  client/dist — the HTML, CSS, JS and images
     5. index.html fallback anything else is a React page (/shop, /cart, ...)

   That order is what makes ONE URL serve both the API and the site, which is what
   Cloud Run deployment expects.
*/

const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const path = require('path')

const accountRoutes = require('./routes/accountRoutes')
const productRoutes = require('./routes/productRoutes')
const cartRoutes = require('./routes/cartRoutes')
const orderRoutes = require('./routes/orderRoutes')
const { getConnectionState } = require('./db/databaseConnection')

const app = express()

// Where the built React app lives: project/client/dist.
const clientBuild = path.join(__dirname, '..', 'client', 'dist')

/* ---------- 1. body parsing ---------- */
// JSON for fetch() calls from React; urlencoded for plain <form> posts. Both are
// on so either style works, exactly as in the course sample code.
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/* ---------- 2. sessions ---------- */
// express-session gives each browser a signed cookie holding a session id; the
// data itself (req.session.cart, req.session.user) stays on the server. MemoryStore
// is fine for one machine and a class project — it empties when the server restarts.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // one day
    },
  }),
)

/* ---------- 3. the JSON API ---------- */
// A quick status check: server up, database reachable, who is signed in.
app.get('/api/health', function (req, res) {
  res.json({
    ok: true,
    db: getConnectionState(),
    cartLines: (req.session.cart || []).length,
    signedInAs: req.session.user ? req.session.user.login : null,
  })
})

app.use('/api', accountRoutes) // /api/accounts, /api/login, /api/account
app.use('/api', productRoutes) // /api/products, /api/products/:id
app.use('/api', cartRoutes) // /api/cart, /api/cart/:itemId
app.use('/api', orderRoutes) // /api/checkout, /api/orders

// An unknown /api path answers with JSON, not with the React page, so a typo in a
// fetch() shows up as a clear 404.
app.use('/api', function (req, res) {
  res.status(404).json({ error: 'No such API route: ' + req.method + ' ' + req.originalUrl })
})

/* ---------- 4. the built React app ---------- */
app.use(express.static(clientBuild))

/* ---------- 5. every other URL is a React page ---------- */
// /shop, /cart, /checkout, /account, /createAccount, and the rubric's
// /account.html and /createAccount.html all return the same index.html; App.jsx
// reads the pathname and decides which view to draw.
app.use(function (req, res) {
  res.sendFile(path.join(clientBuild, 'index.html'))
})

/* ---------- errors ---------- */
// Four arguments marks this as Express's error handler: anything a controller
// passes to next(err) lands here instead of crashing the process.
app.use(function (err, req, res, next) {
  console.error('[server]', err.message)
  res.status(err.status || 500).json({ error: err.message })
})

module.exports = app
