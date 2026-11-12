/* api.js — the one place the React app talks to the Express server.

   Every view used to keep its own copy of the cart in useState, which meant a
   refresh erased it and a second tab disagreed. Now the cart lives in the session on
   the server, and these helpers are the only way it changes.

   The paths match the project page's API list: /api/products, /api/accounts,
   /api/login, /api/account, /api/cart, /api/cart/:itemId, /api/orders.

   Each helper returns { ok, status, data } instead of throwing on a 4xx, so a view
   can show the server's own message ("Size 99 is not offered…") rather than a
   generic failure. Only a real network failure throws.

   Cookies: fetch() sends same-origin cookies by default, which is what
   express-session needs — the cart belongs to the browser's session id.
*/

// Sent whenever a body is present, so body-parser can parse it.
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// One request, one shape of answer. Keeps every helper below to a line or two.
async function request(path, { method = 'GET', body } = {}) {
  const options = { method, headers: {} }

  if (body !== undefined) {
    options.headers = JSON_HEADERS
    options.body = JSON.stringify(body)
  }

  const response = await fetch(path, options)

  // A 500 can answer with an HTML error page in some setups; fall back to {} so
  // callers always get an object.
  const data = await response.json().catch(() => ({}))

  return { ok: response.ok, status: response.status, data }
}

/* ---------- products ---------- */

// The whole catalogue, straight from the products collection in MongoDB.
export function fetchProducts() {
  return request('/api/products')
}

/* ---------- accounts ---------- */

// Create an account: { login, email, password, street, city, state, zip, phone }.
export function createAccount(values) {
  return request('/api/accounts', { method: 'POST', body: values })
}

// Sign in with { login, password }. The server sets the session cookie.
export function login(values) {
  return request('/api/login', { method: 'POST', body: values })
}

// Sign out: the server destroys the session.
export function logout() {
  return request('/api/logout', { method: 'POST' })
}

// The signed-in user's profile.
export function fetchAccount() {
  return request('/api/account')
}

/* ---------- cart ---------- */

// Read the cart as the server remembers it.
export function fetchCart() {
  return request('/api/cart')
}

// Add a line: { productId, qty, size, color }. The server looks up name and price.
export function addCartLine(line) {
  return request('/api/cart', { method: 'POST', body: line })
}

// Set a line's quantity: { productId, qty, size, color }. qty 0 removes it.
export function updateCartLine(line) {
  return request('/api/cart/' + line.productId, {
    method: 'PUT',
    body: { qty: line.qty, size: line.size, color: line.color },
  })
}

// Drop a line. Size and colour travel in the query string, because a product can be
// in the cart in two sizes and the URL alone would not say which line is meant.
export function removeCartLine(line) {
  const query =
    '?size=' + encodeURIComponent(line.size ?? '') + '&color=' + encodeURIComponent(line.color ?? '')
  return request('/api/cart/' + line.productId + query, { method: 'DELETE' })
}

/* ---------- checkout ---------- */

// Cart, subtotal, tax, shipping and total, for the checkout page.
export function fetchCheckout() {
  return request('/api/checkout')
}

// Place the order: { shippingAddress, billingAddress, payment: { cardType, last4 } }.
export function placeOrder(payload) {
  return request('/api/orders', { method: 'POST', body: payload })
}

/* ---------- orders ---------- */

// This user's past orders, newest first.
export function fetchOrders() {
  return request('/api/orders')
}

/* ---------- account, edit ---------- */

// Change the profile: { email, firstName, lastName, phone, shippingAddress }.
export function updateAccount(values) {
  return request('/api/account', { method: 'PUT', body: values })
}
