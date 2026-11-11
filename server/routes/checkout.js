/* routes/checkout.js — TIEN'S SLICE (rubric #6, 30 pts).

   Stub for now so the server boots. Fill these in after cart and login work,
   because checkout depends on both: it needs a signed-in user AND a non-empty
   cart.

   The contract:

     GET  /api/checkout   -> { user, cart, count, subtotal, tax, total, taxRate }
                             what the checkout page needs to display before paying
     POST /api/checkout   -> 201 { orderId, order }
                             409/400 if the cart is empty or nobody is signed in

   Requirements straight from the rubric:
     - refuse an empty cart
     - shipping info comes from the user's account if it exists, otherwise it is
       collected in the form
     - billing info is collected and stored too
     - the order document goes in the 'orders' collection
     - the order document contains a reference to the user's document in 'users'
     - the confirmation shows: all user info, all payment + shipping info, every
       product with name / productId / qty, and the total cost INCLUDING TAX
*/

import express from 'express'
import { getOrders } from '../db.js'

const router = express.Router()

// Tax rate used on the checkout page. Any rate is fine as long as it is shown.
export const TAX_RATE = 0.095

router.get('/checkout', (req, res) => {
  const cart = req.session.cart || []
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  res.json({
    user: req.session.user || null,
    cart,
    count: cart.reduce((n, line) => n + line.qty, 0),
    subtotal,
    taxRate: TAX_RATE,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
  })
})

router.post('/checkout', async (req, res, next) => {
  try {
    const cart = req.session.cart || []
    if (cart.length === 0) return res.status(400).json({ error: 'Your cart is empty.' })
    if (!req.session.user) return res.status(401).json({ error: 'Please log in before checking out.' })

    // TODO: build the order document here (see the list at the top of this file),
    // insert it with getOrders().insertOne(...), clear the session cart, and
    // answer 201 with the order id.
    res.status(501).json({ error: 'Checkout is not implemented yet.' })
  } catch (err) {
    next(err)
  }
})

export default router
