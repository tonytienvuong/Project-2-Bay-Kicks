/* routes/cart.js — BENJAMIN'S SLICE (rubric #4 add-to-cart, #5 cart page).

   This file is a stub so the server runs and the frontend has something to call
   while those routes are being written. Every handler below answers with an
   empty cart.

   The contract the React side expects (agree before you diverge):

     POST /api/cart/add     { productId, qty }          -> { count, cart }
     GET  /api/cart                                     -> { cart, count, subtotal }
     POST /api/cart/update  { productId, qty }          -> { count, cart }
     POST /api/cart/remove  { productId }               -> { count, cart }
     POST /api/cart/clear                               -> { count }

   The cart lives in req.session.cart, NOT in the browser. Shape:
     [{ productId: 3, name: '...', price: 129.99, qty: 2 }, ...]

   Rules that are graded:
     - adding the same product twice raises its qty, it does not add a second line
     - the count in the response is what the nav bar badge shows
     - changing qty to 0 removes the line
*/

import express from 'express'

const router = express.Router()

// Empty cart every time, until the real handlers replace these.
function emptyCart(req) {
  req.session.cart = req.session.cart || []
  return { cart: req.session.cart, count: 0, subtotal: 0 }
}

router.post('/cart/add', (req, res) => {
  res.json(emptyCart(req))
})

router.get('/cart', (req, res) => {
  res.json(emptyCart(req))
})

router.post('/cart/update', (req, res) => {
  res.json(emptyCart(req))
})

router.post('/cart/remove', (req, res) => {
  res.json(emptyCart(req))
})

router.post('/cart/clear', (req, res) => {
  res.json({ count: 0 })
})

export default router
