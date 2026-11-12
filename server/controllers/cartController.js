/* cartController.js — the shopping cart, stored in the Express session.

   Rubric #4 and #5. The cart lives on the server:

       req.session.cart = [ { productId, name, price, qty, size, color, image }, ... ]

   The browser only holds a signed cookie with the session id, so the cart survives
   navigation and page refreshes and a second tab sees the same lines.

   Money and names are NEVER taken from the request. Each line's price and name are
   looked up in the products collection, because a posted price would be trivial to
   forge — the project page says the same thing under Server Side Validation.

   Endpoints:
     GET    /api/cart            the current cart
     POST   /api/cart            add { productId, qty, size, color }
     PUT    /api/cart/:itemId    change a line's quantity { qty, size?, color? }
     DELETE /api/cart/:itemId    remove a line (size/color in the query string if needed)
*/

const { getCollection } = require('../db/databaseConnection')

// The products collection, used to price and name every line.
function products() {
  return getCollection('products')
}

// The cart array for this browser, created empty on first use.
function getCart(req) {
  if (!Array.isArray(req.session.cart)) req.session.cart = []
  return req.session.cart
}

// Two lines are the same line only when product AND size AND colour match — the
// same shoe in another size is a different thing in the box.
function findLine(cart, productId, size, color) {
  return cart.find(function (line) {
    return line.productId === productId && line.size === size && line.color === color
  })
}

// The price actually charged: the sale price when there is one, the normal price
// otherwise, rounded to cents.
function priceOf(product) {
  const onSale = product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price
  const raw = onSale ? product.salePrice : product.price
  return Math.round(raw * 100) / 100
}

// Whole number of pairs from whatever arrived in the body, or null if unusable.
function readQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

// Look up the product named in the request and check size/colour against what that
// product actually comes in. Returns { product, size, color } or { error }.
// body may be undefined: DELETE requests carry no body at all.
async function resolveProduct(body, query) {
  const source = body || {}
  const productId = Number(source.productId !== undefined ? source.productId : query.productId)
  if (!Number.isFinite(productId)) return { error: 'productId is required.' }

  const product = await products().findOne({ id: productId })
  if (!product) return { error: 'No product with id ' + productId + '.' }

  const rawSize = source.size !== undefined ? source.size : query.size
  const rawColor = source.color !== undefined ? source.color : query.color
  const size = rawSize === undefined || rawSize === '' ? null : String(rawSize)
  const color = rawColor === undefined || rawColor === '' ? null : String(rawColor)

  if (size !== null && !product.sizes.map(String).includes(size)) {
    return { error: 'Size ' + size + ' is not offered for ' + product.name + '.' }
  }
  if (color !== null && !product.colors.includes(color)) {
    return { error: 'Color ' + color + ' is not offered for ' + product.name + '.' }
  }

  return { product: product, size: size, color: color }
}

// Response shape used by every route here: the lines, the badge count (pairs, not
// lines), and the money.
function summarize(req) {
  const cart = getCart(req)
  let count = 0
  let subtotal = 0
  cart.forEach(function (line) {
    count += line.qty
    subtotal += line.price * line.qty
  })
  return { cart: cart, count: count, subtotal: Math.round(subtotal * 100) / 100 }
}

// GET /api/cart — what the cart page and the nav badge both draw from.
module.exports.getCart = function (req, res) {
  res.json(summarize(req))
}

// POST /api/cart — rubric #4. Adding the same product + size + colour raises the
// quantity instead of creating a second line, and never goes past stock.
module.exports.addToCart = async function (req, res, next) {
  try {
    const found = await resolveProduct(req.body, req.query)
    if (found.error) return res.status(400).json({ error: found.error })

    const asked = readQty(req.body.qty === undefined ? 1 : req.body.qty)
    if (asked === null || asked < 1) {
      return res.status(400).json({ error: 'qty must be a whole number of 1 or more.' })
    }

    const product = found.product
    const cart = getCart(req)
    const existing = findLine(cart, product.id, found.size, found.color)
    const stock = product.quantityInStock

    if (existing) {
      existing.qty = Math.min(existing.qty + asked, stock)
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: priceOf(product),
        qty: Math.min(asked, stock),
        size: found.size,
        color: found.color,
        image: product.image,
      })
    }

    res.json(summarize(req))
  } catch (err) {
    next(err)
  }
}

// PUT /api/cart/:itemId — rubric #5. Quantity 0 removes the line; above stock is
// held to stock so the button cannot oversell.
module.exports.updateCartItem = async function (req, res, next) {
  try {
    const body = req.body || {}
    const found = await resolveProduct({ productId: req.params.itemId, size: body.size, color: body.color }, req.query)
    if (found.error) return res.status(400).json({ error: found.error })

    const asked = readQty(body.qty)
    if (asked === null) return res.status(400).json({ error: 'qty must be a whole number.' })

    const cart = getCart(req)
    const line = pickLine(cart, found.product.id, found.size, found.color)
    if (line.error) return res.status(409).json({ error: line.error })

    if (asked <= 0) {
      req.session.cart = cart.filter(function (l) { return l !== line.match })
    } else {
      line.match.qty = Math.min(asked, found.product.quantityInStock)
    }

    res.json(summarize(req))
  } catch (err) {
    next(err)
  }
}

// DELETE /api/cart/:itemId — rubric #5, remove one line outright.
module.exports.removeCartItem = async function (req, res, next) {
  try {
    const body = req.body || {}
    const found = await resolveProduct({ productId: req.params.itemId, size: body.size, color: body.color }, req.query)
    if (found.error) return res.status(400).json({ error: found.error })

    const cart = getCart(req)
    const line = pickLine(cart, found.product.id, found.size, found.color)
    if (line.error) return res.status(409).json({ error: line.error })

    req.session.cart = cart.filter(function (l) { return l !== line.match })
    res.json(summarize(req))
  } catch (err) {
    next(err)
  }
}

// Find the one line the request means. A product can be in the cart twice (two
// sizes), so when no size/colour is given the request has to say which one.
function pickLine(cart, productId, size, color) {
  const candidates = cart.filter(function (l) {
    if (l.productId !== productId) return false
    if (size !== null && l.size !== size) return false
    if (color !== null && l.color !== color) return false
    return true
  })

  if (candidates.length === 0) return { error: 'That line is not in the cart.' }
  if (candidates.length > 1) {
    return { error: 'This product is in the cart in more than one size or colour — send size and color.' }
  }
  return { match: candidates[0] }
}
