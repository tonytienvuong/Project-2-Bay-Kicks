/* App.jsx — the shell of the whole site.
   Holds which view is showing, which product is open, the product catalogue and the
   cart.

   Neither products nor the cart are hard-coded here any more:
     - products come from GET /api/products, which reads the MongoDB products
       collection (the project page: "no products.json in the code")
     - the cart comes from GET /api/cart, which reads req.session.cart
   This component mirrors the last answer the server gave, and every change follows
   one pattern:

       send the change  ->  server answers with the new state  ->  setState(...) */

import { useEffect, useState } from 'react'
import './App.css'

import {
  addCartLine,
  fetchCart,
  fetchProducts,
  removeCartLine,
  updateCartLine,
} from './api'
import NavBar from './components/NavBar'
import HomeView from './components/HomeView'
import ShopView from './components/ShopView'
import ProductDetailView from './components/ProductDetailView'
import CartView from './components/CartView'
import AccountView from './components/AccountView'
import CreateAccountView from './components/CreateAccountView'

// The starting screen comes from the URL, so the page names the rubric uses work as
// real links: /createAccount.html, /account, /cart, /shop.
function viewFromPath() {
  const cleaned = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '')
  const name = cleaned.split('/').filter(Boolean).pop() || 'home'
  const known = ['shop', 'cart', 'checkout', 'account', 'createAccount']
  return known.includes(name) ? name : 'home'
}

function App() {
  // Which screen is showing. Changing it with setView re-draws the page.
  const [view, setView] = useState(viewFromPath)

  // Which product the detail view is showing (null = none picked yet).
  const [selectedId, setSelectedId] = useState(null)

  // The catalogue, as fetched from the server. Empty until the request answers.
  const [products, setProducts] = useState([])

  // The cart as the server last reported it. Lines look like
  // { productId, name, price, qty, size, color, image }.
  const [cart, setCart] = useState([])

  // Anything that went wrong talking to the server, shown on the page that failed.
  const [serverError, setServerError] = useState('')

  // The nav badge counts pairs, not lines: two pairs show as 2. Computed from the
  // cart every render, never stored on its own.
  const cartCount = cart.reduce((n, line) => n + line.qty, 0)

  // On first paint, fill the catalogue and re-read this browser's cart. Without the
  // second call a refresh would show 0 even though the session still holds a cart.
  useEffect(() => {
    fetchProducts()
      .then(({ data }) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setServerError('Could not load products. Is the server running?'))

    fetchCart()
      .then(({ data }) => setCart(data.cart || []))
      .catch(() => setServerError('Could not reach the server. Is it running?'))
  }, [])

  // find() returns undefined until something is selected, which is why the detail
  // block below checks for it before rendering.
  const selectedProduct = products.find((p) => p.id === selectedId)

  function openProduct(id) {
    setSelectedId(id)
    setView('detail')
    window.scrollTo({ top: 0 })
  }

  // Called by the detail view once size and color are chosen. The server decides
  // name, price and whether the same line already exists — this only asks.
  async function addToCart(line) {
    try {
      const { ok, data } = await addCartLine(line)
      if (!ok) {
        setServerError(data.error || 'Could not add that to the cart.')
        return
      }
      setServerError('')
      setCart(data.cart)
      setView('cart')
      window.scrollTo({ top: 0 })
    } catch {
      setServerError('Could not reach the server. Is it running?')
    }
  }

  // Shared by the three cart-page handlers: send the change, take the whole cart
  // back, redraw. The server's answer is the truth, so the page never drifts.
  async function sendCartChange(change, fallbackMessage) {
    try {
      const { ok, data } = await change()
      if (!ok) {
        setServerError(data.error || fallbackMessage)
        return
      }
      setServerError('')
      setCart(data.cart)
    } catch {
      setServerError('Could not reach the server. Is it running?')
    }
  }

  // One more of this line. The server caps at stock and removes at zero, so the
  // number that comes back is always the number the page shows.
  function increaseQty(line) {
    return sendCartChange(
      () => updateCartLine({ productId: line.productId, size: line.size, color: line.color, qty: line.qty + 1 }),
      'Could not change the quantity.',
    )
  }

  // One fewer. The button is disabled at 1, so this never sends 0 by accident.
  function decreaseQty(line) {
    return sendCartChange(
      () => updateCartLine({ productId: line.productId, size: line.size, color: line.color, qty: line.qty - 1 }),
      'Could not change the quantity.',
    )
  }

  // Drop the line outright.
  function removeItem(line) {
    return sendCartChange(
      () => removeCartLine({ productId: line.productId, size: line.size, color: line.color }),
      'Could not remove that line.',
    )
  }

  return (
    <>
      <NavBar view={view} setView={setView} cartCount={cartCount} />

      <main>
        {view === 'home' && <HomeView setView={setView} />}

        {view === 'shop' && <ShopView products={products} onOpen={openProduct} />}

        {view === 'detail' && selectedProduct && (
          <ProductDetailView product={selectedProduct} onAddToCart={addToCart} />
        )}

        {view === 'cart' && (
          <CartView
            items={cart}
            error={serverError}
            setView={setView}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
            onRemove={removeItem}
          />
        )}

        {view === 'account' && <AccountView setView={setView} />}

        {view === 'createAccount' && <CreateAccountView setView={setView} />}

        {/* every other view is still a placeholder */}
        {view !== 'home' &&
          view !== 'shop' &&
          view !== 'detail' &&
          view !== 'cart' &&
          view !== 'account' &&
          view !== 'createAccount' && (
            <div className="container py-5">
              <h2 className="text-capitalize">{view}</h2>
              <p className="text-muted">This view gets built in a later step.</p>
            </div>
          )}
      </main>

      <footer className="bk-footer">
        <div className="container text-center">
          © 2026 Bay Kicks · CS351 Project 2 · Tien Vuong
        </div>
      </footer>
    </>
  )
}

export default App
