/* ProductCard.jsx — one product, drawn from one object.
   Props: product (the object), onOpen (called with the product id when clicked).

   Kept deliberately plain: name, description, price, rating. No brand eyebrow and
   no "New" badge — fewer elements per card reads calmer.

   Markup note: the whole card is clickable, but role="button" is NOT put on the
   <article>. The validator rejects role="button" on <article> (bad role value) and
   rejects a heading inside an element carrying role="button". Instead the card is a
   plain <article> and the product NAME is the real control — a <button> that opens
   the detail view. The card's onClick stays as a convenience for mouse users, with
   no role attribute to break the markup. */

function ProductCard({ product, onOpen }) {
  // salePrice is null for most products, so only strike through a price on sale.
  const onSale = product.salePrice !== null && product.salePrice < product.price

  return (
    <article className="bk-card" onClick={() => onOpen(product.id)}>
      <div className="bk-card-media">
        <img className="bk-card-img" src={product.image} alt={product.name} />
      </div>

      <div className="bk-card-body">
        {/* the accessible control: focusable, keyboard-operable, announces itself */}
        <h3 className="bk-card-name">
          <button
            type="button"
            className="bk-card-open"
            onClick={(e) => {
              e.stopPropagation()   // the card's own onClick would fire twice otherwise
              onOpen(product.id)
            }}
          >
            {product.name}
          </button>
        </h3>
        <p className="bk-card-desc">{product.description}</p>

        <div className="bk-card-foot">
          <span className="bk-price">
            ${onSale ? product.salePrice.toFixed(2) : product.price.toFixed(2)}
            {onSale && <span className="bk-price-was">${product.price.toFixed(2)}</span>}
          </span>
          <span className="bk-rating">★ {product.rating}</span>
        </div>
      </div>
    </article>
  )
}

export default ProductCard

