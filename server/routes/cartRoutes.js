/* cartRoutes.js — URL → controller for the session cart.

   Mounted at /api in app.js:
     GET    /api/cart            read the cart
     POST   /api/cart            add a product
     PUT    /api/cart/:itemId    change a quantity
     DELETE /api/cart/:itemId    remove a line

   :itemId is the product id. When the same product is in the cart in two sizes,
   the request also sends size and color so it is clear which line is meant.
*/

const express = require('express')
const bodyParser = require('body-parser')

const router = express.Router()
const cartController = require('../controllers/cartController')

router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

router.get('/cart', cartController.getCart)
router.post('/cart', cartController.addToCart)
router.put('/cart/:itemId', cartController.updateCartItem)
router.delete('/cart/:itemId', cartController.removeCartItem)

module.exports = router
