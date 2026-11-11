/* App.jsx — the shell of the whole site.
   Holds which view is showing and which product is open.
   NavBar sits above everything; the footer sits below. */

import { useState } from 'react'
import './App.css'
import products from './data/products.json'

import NavBar from './components/NavBar'
import HomeView from './components/HomeView'
import ShopView from './components/ShopView'
import ProductDetailView from './components/ProductDetailView'
import CartView from './components/CartView'
import AccountView from './components/AccountView'
import CreateAccountView from './components/CreateAccountView'

// The starting screen comes from the URL, so the page names the rubric uses work
// as real links: /createAccount.html, /account, /cart, /shop, /checkout.
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

  // The shopping cart. cartItems is the array of lines; the count below is
  // COMPUTED from it rather than kept as a separate variable (the spec forbids
  // tracking the count on its own — it must follow the state).
  const [cartItems, setCartItems] = useState([])

  const cartCount = cartItems.reduce((n, item) => n + item.quantity, 0)

  // find() returns undefined until something is selected, which is why the
  // detail block below checks for it before rendering.
  const selectedProduct = products.find((p) => p.id === selectedId)

  function openProduct(id) {
    setSelectedId(id)
    setView('detail')
    window.scrollTo({ top: 0 })
  }

  // Called by the detail view once size and color are both chosen. If the same
  // product+size+color is already in the cart, bump its quantity instead of
  // adding a duplicate line. The quantity is held down to the product's stock.
  function addToCart(line) {
    setCartItems((current) => {
      const match = current.find(
        (i) => i.id === line.id && i.size === line.size && i.color === line.color,
      )
      if (match) {
        return current.map((i) =>
          i === match
            ? { ...i, quantity: Math.min(i.quantity + line.quantity, i.stock) }
            : i,
        )
      }
      return [...current, line]
    })
    setView('cart')
  }

  // Every cart handler matches on id + size + color, because the same shoe in a
  // different size or color is a different line.
  //
  // increase: add one, but never past the stock the product came with.
  function increaseQty(id, size, color) {
    setCartItems((current) =>
      current.map((item) =>
        item.id === id && item.size === size && item.color === color
          ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
          : item,
      ),
    )
  }

  // decrease: take one off, but never below one. (Hitting 1 disables the button,
  // so this floor is a backstop rather than the main guard.)
  function decreaseQty(id, size, color) {
    setCartItems((current) =>
      current.map((item) =>
        item.id === id && item.size === size && item.color === color
          ? { ...item, quantity: Math.max(item.quantity - 1, 1) }
          : item,
      ),
    )
  }

  // remove: filter() keeps everything that is not this line.
  function removeItem(id, size, color) {
    setCartItems((current) =>
      current.filter(
        (item) => !(item.id === id && item.size === size && item.color === color),
      ),
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
            items={cartItems}
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
          © 2026 Bay Kicks · CS351 Project 1 · Tien Vuong
        </div>
      </footer>
    </>
  )
}

export default App
