/* routes/cart.js — rubric #4 (add to cart, session storage) and #5 (cart page data).

   The cart lives in the SESSION, not in the browser:

     req.session.cart = [ { productId, name, price, qty, size, color, image }, ... ]

   express-session keeps that array on the server and hands the browser only a
   signed cookie with an id, so the cart survives page loads and a second tab
   sees the same lines. Nothing here trusts the browser for money or names: the
   price and the product name are looked up in src/data/products.json every time,
   because a posted price would be trivially forged.

   The contract the React side calls:

     POST /api/cart/add     { productId, qty, size, color }  -> { cart, count, subtotal }
     GET  /api/cart                                          -> { cart, count, subtotal }
     POST /api/cart/update  { productId, qty, size, color }  -> { cart, count, subtotal }
     POST /api/cart/remove  { productId, size, color }       -> { cart, count, subtotal }
     POST /api/cart/clear                                    -> { cart, count, subtotal }

   Graded rules, all enforced below:
     - adding the same product + size + color raises its qty, it does not add a
       duplicate line
     - count is the number of pairs in the cart — what the nav bar badge shows
     - setting a qty to 0 (or less) removes the line
     - a quantity can never go past the stock the product has
*/

import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const router = express.Router()

/* ---------- the product catalogue ---------- */
// Loaded once at startup instead of per request: the file is small and read-only,
// and re-reading it on every add would be wasted disk work. This array is the only
// authority on price, name and stock.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const products = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'products.json'), 'utf8'),
)

// productId -> product, so a lookup is one step instead of a scan of 25 items.
const byId = new Map(products.map((p) => [p.id, p]))

/* ---------- small helpers ---------- */

// The cart array for this browser, created empty on first use.
function getCart(req) {
  if (!Array.isArray(req.session.cart)) req.session.cart = []
  return req.session.cart
}

// What the price actually charged is: the sale price when there is one, the
// normal price otherwise. Rounded to cents so totals do not drift.
function priceOf(product) {
  const raw =
    product.salePrice !== null && product.salePrice < product.price
      ? product.salePrice
      : product.price
  return Math.round(raw * 100) / 100
}

// Two lines are the same line only if product AND size AND color match — the same
// shoe in another size is a different thing in the box.
function findLine(cart, productId, size, color) {
  return cart.find((l) => l.productId === productId && l.size === size && l.color === color)
}

// Response shape used by every route here: the lines, the badge count (sum of
// quantities, so 2 pairs show as 2, not 1 line), and the money.
function summarize(req) {
  const cart = getCart(req)
  const count = cart.reduce((n, line) => n + line.qty, 0)
  const subtotal =
    Math.round(cart.reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100
  return { cart, count, subtotal }
}

// Turns whatever arrived in the body into a whole number of pairs, or null when it
// is not a usable number at all.
function readQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

// Looks up the product named in the body and checks size/color against what that
// product actually comes in. Returns { product, size, color } or { error }.
function resolveProduct(body) {
  const productId = Number(body.productId)
  if (!Number.isFinite(productId)) return { error: 'productId is required.' }

  const product = byId.get(productId)
  if (!product) return { error: 'No product with id ' + productId + '.' }

  const size = body.size === undefined || body.size === '' ? null : String(body.size)
  const color = body.color === undefined || body.color === '' ? null : String(body.color)

  if (size !== null && !product.sizes.map(String).includes(size)) {
    return { error: 'Size ' + size + ' is not offered for ' + product.name + '.' }
  }
  if (color !== null && !product.colors.includes(color)) {
    return { error: 'Color ' + color + ' is not offered for ' + product.name + '.' }
  }

  return { product, size, color }
}

/* ---------- routes ---------- */

// #4 add to cart. A repeat add of the same line raises the quantity instead of
// creating a second line, and the quantity is capped at the product's stock.
router.post('/cart/add', (req, res) => {
  const { product, size, color, error } = resolveProduct(req.body)
  if (error) return res.status(400).json({ error })

  const asked = readQty(req.body.qty === undefined ? 1 : req.body.qty)
  if (asked === null || asked < 1) {
    return res.status(400).json({ error: 'qty must be a whole number of 1 or more.' })
  }

  const cart = getCart(req)
  const existing = findLine(cart, product.id, size, color)
  const cap = product.quantityInStock

  if (existing) {
    existing.qty = Math.min(existing.qty + asked, cap)
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: priceOf(product),
      qty: Math.min(asked, cap),
      size,
      color,
      image: product.image,
    })
  }

  res.json(summarize(req))
})

// #5 read the cart: what the cart page and the nav badge both draw from.
router.get('/cart', (req, res) => {
  res.json(summarize(req))
})

// #5 change a quantity. Zero removes the line; anything above stock is held to
// stock, so the button cannot oversell.
router.post('/cart/update', (req, res) => {
  const { product, size, color, error } = resolveProduct(req.body)
  if (error) return res.status(400).json({ error })

  const asked = readQty(req.body.qty)
  if (asked === null) {
    return res.status(400).json({ error: 'qty must be a whole number.' })
  }

  const cart = getCart(req)
  const line = findLine(cart, product.id, size, color)
  if (!line) return res.status(404).json({ error: 'That line is not in the cart.' })

  if (asked <= 0) {
    req.session.cart = cart.filter((l) => l !== line)
  } else {
    line.qty = Math.min(asked, product.quantityInStock)
  }

  res.json(summarize(req))
})

// #5 remove one line outright.
router.post('/cart/remove', (req, res) => {
  const { product, size, color, error } = resolveProduct(req.body)
  if (error) return res.status(400).json({ error })

  const cart = getCart(req)
  const line = findLine(cart, product.id, size, color)
  if (!line) return res.status(404).json({ error: 'That line is not in the cart.' })

  req.session.cart = cart.filter((l) => l !== line)
  res.json(summarize(req))
})

// Empty the cart. Used after a successful checkout, and handy while testing.
router.post('/cart/clear', (req, res) => {
  req.session.cart = []
  res.json(summarize(req))
})

export default router
