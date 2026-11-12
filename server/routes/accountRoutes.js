/* accountRoutes.js — URL → controller for everything about accounts.

   Mounted at /api in app.js, so these paths become:
     POST /api/accounts  POST /api/login  POST /api/logout
     GET  /api/account   PUT  /api/account

   body-parser is attached here, the way the course sample code does it, so both
   JSON (fetch from React) and urlencoded (plain <form> posts) arrive as req.body.
*/

const express = require('express')
const bodyParser = require('body-parser')

const router = express.Router()
const accountController = require('../controllers/accountController')
const requireLogin = require('../middleware/requireLogin')

// Turn the request body into JavaScript values before any route runs.
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

// Create an account. The alias keeps the name used in the Canvas rubric
// (createAccount.html posting to /api/createAccount) working alongside the
// project page's /api/accounts.
router.post('/accounts', accountController.createAccount)
router.post('/createAccount', accountController.createAccount)

// Sign in / sign out.
router.post('/login', accountController.login)
router.post('/logout', accountController.logout)

// Read or edit the signed-in user's profile.
router.get('/account', requireLogin, accountController.getAccount)
router.put('/account', requireLogin, accountController.updateAccount)

module.exports = router
