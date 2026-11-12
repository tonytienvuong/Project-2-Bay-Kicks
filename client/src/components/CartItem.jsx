/* CartItem.jsx — one line in the shopping cart.
   Props: item (one cart line from the server) plus three handlers passed down
   from App:
     onIncrease(item)   ask the server for one more of this line
     onDecrease(item)   ask the server for one fewer
     onRemove(item)     ask the server to drop this line

   The line's fields are the session's own names — productId, qty, price, size,
   color, image, name. They are NOT edited here: every button posts to the API and
   App replaces the whole cart with whatever the server answers. That is why this
   file has no stock logic — the server caps quantities at stock.

   A line is identified by productId + size + color, because the same shoe in a
   different size is a different line.

   The line total is price times qty — worked out here, never stored. */

function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  const lineTotal = item.price * item.qty

  return (
    <div className="bk-cart-item">
      <img className="bk-cart-img" src={item.image} alt={item.name} />

      <div className="bk-cart-info">
        <h3 className="bk-cart-name">{item.name}</h3>
        <p className="bk-cart-options">Size {item.size} · {item.color}</p>
        <p className="bk-cart-unit">${item.price.toFixed(2)} each</p>
      </div>

      <div className="bk-cart-qty">
        <button
          className="bk-qty-btn"
          onClick={() => onDecrease(item)}
          disabled={item.qty <= 1}
          aria-label={'Decrease quantity of ' + item.name}
        >
          −
        </button>

        <span className="bk-qty-value">{item.qty}</span>

        <button
          className="bk-qty-btn"
          onClick={() => onIncrease(item)}
          aria-label={'Increase quantity of ' + item.name}
        >
          +
        </button>
      </div>

      <p className="bk-cart-line-total">${lineTotal.toFixed(2)}</p>

      <button className="bk-cart-remove" onClick={() => onRemove(item)}>
        Remove
      </button>
    </div>
  )
}

export default CartItem
