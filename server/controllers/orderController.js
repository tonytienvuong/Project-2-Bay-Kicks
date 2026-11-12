/* orderController.js — rubric #6, checkout.

   A checkout takes the session cart, the signed-in user, and the shipping / billing
   details, and writes ONE document into the orders collection that points back at
   the user's own document (userId). Totals are calculated here, from the products
   collection — never from numbers the browser posted.

   Payment rule from the project page: only the card type and the last four digits
   are stored. Never the full card number, never the CVV.

   Endpoints:
     POST /api/orders       place an order from the current session cart
     GET  /api/orders       this user's orders, newest first
     GET  /api/orders/:id   one of this user's orders
*/

const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/databaseConnection')

// California-style sales tax used on every order. Any rate is fine as long as the
// page displays it — this one is shown on the cart and confirmation pages.
const TAX_RATE = 0.095

// Flat shipping for this project: free.
const SHIPPING_COST = 0

// Collections used by this controller.
function orders() {
  return getCollection('orders')
}
function products() {
  return getCollection('products')
}
function users() {
  return getCollection('users')
}

// Trim text that may not be a string.
function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

// Round to whole cents.
function money(value) {
  return Math.round(value * 100) / 100
}

// An address is usable when the two fields an order cannot ship without are there.
function readAddress(input) {
  if (!input || typeof input !== 'object') return null
  const address = {
    street: text(input.street),
    city: text(input.city),
    state: text(input.state).toUpperCase(),
    zip: text(input.zip),
  }
  if (!address.street || !address.city) return null
  return address
}

// Only card type and last four digits are kept — see the note at the top.
function readPayment(input) {
  if (!input || typeof input !== 'object') return null
  const cardType = text(input.cardType)
  const digits = text(input.last4).replace(/\D/g, '')
  if (!cardType || digits.length !== 4) return null
  return { cardType: cardType, last4: digits }
}

// POST /api/orders — build the order document, insert it, empty the cart.
module.exports.createOrder = async function (req, res, next) {
  try {
    const cart = req.session.cart || []
    if (cart.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' })
    }
    if (!req.session.user) {
      return res.status(401).json({ error: 'Please log in before checking out.' })
    }

    const user = await users().findOne({ _id: new ObjectId(req.session.user.userId) })
    if (!user) return res.status(401).json({ error: 'Your account could not be found. Please log in again.' })

    const body = req.body || {}

    // Shipping defaults to the address on the account; the checkout form may send a
    // different one for this order only.
    const shippingAddress = readAddress(body.shippingAddress) || readAddress(user.shippingAddress)
    if (!shippingAddress) {
      return res.status(400).json({ error: 'A shipping address is required.', fields: { shippingAddress: 'Required.' } })
    }

    // Billing defaults to the shipping address when the form leaves it blank.
    const billingAddress = readAddress(body.billingAddress) || shippingAddress

    // Payment is optional (the project simulates it), but if given it must be a
    // type plus four digits — and only those two fields are stored.
    const payment = readPayment(body.payment)

    // Re-price every line from the products collection: the session cart holds the
    // prices it was built with, but the database is the authority at checkout time.
    const items = []
    let subtotal = 0
    for (const line of cart) {
      const product = await products().findOne({ id: line.productId })
      if (!product) {
        return res.status(409).json({ error: 'Product ' + line.productId + ' is no longer available.' })
      }
      const onSale = product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price
      const unitPrice = money(onSale ? product.salePrice : product.price)
      const lineTotal = money(unitPrice * line.qty)
      subtotal += lineTotal
      items.push({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        size: line.size,
        color: line.color,
        quantity: line.qty,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
      })
    }

    subtotal = money(subtotal)
    const tax = money(subtotal * TAX_RATE)
    const total = money(subtotal + tax + SHIPPING_COST)

    const order = {
      userId: user._id,
      orderDate: new Date(),
      customer: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      payment: payment,
      items: items,
      subtotal: subtotal,
      tax: tax,
      shippingCost: SHIPPING_COST,
      total: total,
      status: 'Submitted',
    }

    const result = await orders().insertOne(order)

    // The cart has become an order, so it is emptied. A refresh cannot re-submit it.
    req.session.cart = []

    res.status(201).json({
      ok: true,
      orderId: result.insertedId,
      order: Object.assign({ _id: result.insertedId }, order),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/orders — only the signed-in user's own orders.
module.exports.getOrders = async function (req, res, next) {
  try {
    const list = await orders()
      .find({ userId: new ObjectId(req.session.user.userId) })
      .sort({ orderDate: -1 })
      .toArray()
    res.json(list)
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/:id — one order, and only if it belongs to this user.
module.exports.getOrderById = async function (req, res, next) {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'That is not a valid order id.' })
    }

    const order = await orders().findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.session.user.userId),
    })
    if (!order) return res.status(404).json({ error: 'Order not found.' })

    res.json(order)
  } catch (err) {
    next(err)
  }
}

// Exported so the checkout preview route can show the same numbers before ordering.
module.exports.TAX_RATE = TAX_RATE
module.exports.SHIPPING_COST = SHIPPING_COST
