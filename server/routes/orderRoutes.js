/* orderRoutes.js — URL → controller for checkout and order history.

   Mounted at /api in app.js:
     GET  /api/checkout      what the checkout page shows before paying
     POST /api/orders        place the order held in the session cart
     GET  /api/orders        this user's orders
     GET  /api/orders/:id    one of this user's orders

   All of these need a signed-in user, so requireLogin runs first: an order needs a
   userId to point at, and the account page needs to know whose account it is.
*/

const express = require('express')
const bodyParser = require('body-parser')

const router = express.Router()
const orderController = require('../controllers/orderController')
const requireLogin = require('../middleware/requireLogin')

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

// The numbers the checkout page displays: cart, subtotal, tax, shipping, total.
router.get('/checkout', requireLogin, async function (req, res, next) {
  try {
    const cart = req.session.cart || []
    let subtotal = 0
    cart.forEach(function (line) {
      subtotal += line.price * line.qty
    })
    subtotal = Math.round(subtotal * 100) / 100
    const tax = Math.round(subtotal * orderController.TAX_RATE * 100) / 100

    res.json({
      user: req.session.user,
      cart: cart,
      count: cart.reduce(function (n, line) { return n + line.qty }, 0),
      subtotal: subtotal,
      taxRate: orderController.TAX_RATE,
      tax: tax,
      shippingCost: orderController.SHIPPING_COST,
      total: Math.round((subtotal + tax + orderController.SHIPPING_COST) * 100) / 100,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/orders', requireLogin, orderController.createOrder)
router.get('/orders', requireLogin, orderController.getOrders)
router.get('/orders/:id', requireLogin, orderController.getOrderById)

module.exports = router
