/* CartView.jsx — the shopping cart page.
   Props: items (the cart lines the server last returned), error (a message from the
   API, if the last change failed), setView, and the three line handlers.

   The lines come from req.session.cart, so their fields are the session's names:
   { productId, name, price, qty, size, color, image }.

   Receives the array as a prop and uses .map() to render one CartItem per line — the
   spec names .map() explicitly for the cart, same as for ProductList.

   The subtotal and the item count are both COMPUTED from the array here with
   reduce(). Nothing is stored separately: count and subtotal are derived from cart
   state, never kept as their own variables.

   Empty cart gets its own short view instead of an empty list. */

import CartItem from './CartItem'

function CartView({ items, error, onIncrease, onDecrease, onRemove, setView }) {
  if (items.length === 0) {
    return (
      <section className="bk-section">
        <div className="container text-center">
          <h2 className="bk-section-title">Your cart is empty</h2>
          <p className="bk-section-sub">Nothing in here yet.</p>
          {error && <p className="bk-error">{error}</p>}
          <button className="btn btn-bk" onClick={() => setView('shop')}>
            Shop the collection
          </button>
        </div>
      </section>
    )
  }

  // itemCount — how many pairs in total (quantities summed)
  // subtotal  — the money: price x qty, per line
  const itemCount = items.reduce((n, item) => n + item.qty, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <section className="bk-section">
      <div className="container">
        <h2 className="bk-section-title">Your cart</h2>
        <p className="bk-section-sub">
          {itemCount} {itemCount === 1 ? 'pair' : 'pairs'} in your cart
        </p>

        {error && <p className="bk-error">{error}</p>}

        <div className="bk-cart-list">
          {items.map((item) => (
            <CartItem
              key={item.productId + '-' + item.size + '-' + item.color}
              item={item}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
            />
          ))}
        </div>

        <div className="bk-cart-total">
          <div className="bk-cart-total-row">
            <span>Subtotal</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>
          <div className="bk-cart-total-row">
            <span>Items</span>
            <strong>{itemCount}</strong>
          </div>

          <button className="btn btn-bk w-100 mt-3" onClick={() => setView('checkout')}>
            Checkout
          </button>
          <button className="btn btn-bk-outline w-100 mt-2" onClick={() => setView('shop')}>
            Keep shopping
          </button>
          <p className="text-muted small mb-0 mt-3">
            Sales tax and the final total are shown on the checkout page.
          </p>
        </div>
      </div>
    </section>
  )
}

export default CartView
