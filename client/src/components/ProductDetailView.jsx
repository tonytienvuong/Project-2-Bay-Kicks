/* ProductDetailView.jsx — the full page for one product.
   Props: product (one object), onAddToCart (called with the finished cart line).

   Right column: the name, the short and long descriptions, the full spec list,
   then the buy box — the detail view shows the product's information, not a
   curated slice of it. The spec rows come from the SPECS list below rather than
   hand-written markup. */

import { Fragment, useState } from 'react'

// Each row is [what the shopper reads, which products.json field it comes from].
const SPECS = [
  ['Material', 'material'],
  ['Gender', 'gender'],
  ['Weight', 'weight'],
  ['Heel drop', 'heelDrop'],
  ['Water resistant', 'waterResistant'],
  ['Arch support', 'archSupport'],
  ['In stock', 'quantityInStock'],
]

function ProductDetailView({ product, onAddToCart }) {
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [qty, setQty] = useState(1)

  const onSale = product.salePrice !== null && product.salePrice < product.price
  const unitPrice = onSale ? product.salePrice : product.price

  // The gate: both dropdowns must hold a real value, which is why they start ''.
  const ready = size !== '' && color !== ''

  function handleSubmit(e) {
    e.preventDefault()              // a form submit reloads the page — stop that
    if (!ready) return

    onAddToCart({
      productId: product.id,
      qty,
      size,
      color,
    })

    setSize('')                     // reset so the next add starts clean
    setColor('')
    setQty(1)
  }

  return (
    <section className="bk-section">
      <div className="container">
        <div className="row g-5">
          <div className="col-12 col-lg-6">
            <img className="bk-detail-img" src={product.image} alt={product.name} />
          </div>

          <div className="col-12 col-lg-6">
            <p className="bk-detail-brand">{product.brand}</p>
            <h1 className="bk-detail-name">{product.name}</h1>
            <p className="bk-detail-rating">
              ★ {product.rating} · {product.numberOfReviews} reviews
            </p>

            <p className="bk-detail-price">
              ${unitPrice.toFixed(2)}
              {onSale && <span className="bk-price-was">${product.price.toFixed(2)}</span>}
            </p>

            <p className="bk-detail-desc">{product.description}</p>
            <p className="bk-detail-desc">{product.longDescription}</p>

            <dl className="bk-specs">
              {SPECS.map(([label, key]) => (
                <Fragment key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {/* the JSON stores this as true/false — shoppers read Yes/No */}
                    {key === 'waterResistant'
                      ? product[key]
                        ? 'Yes'
                        : 'No'
                      : product[key]}
                  </dd>
                </Fragment>
              ))}
            </dl>

            <form className="bk-buybox" onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="bk-size">Size</label>
              <select
                id="bk-size"
                className="form-select mb-3"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="">Choose a size</option>
                {product.sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <label className="form-label" htmlFor="bk-color">Color</label>
              <select
                id="bk-color"
                className="form-select mb-3"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                <option value="">Choose a color</option>
                {product.colors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label className="form-label" htmlFor="bk-qty">Quantity</label>
              <input
                id="bk-qty"
                type="number"
                className="form-control mb-3"
                min="1"
                max={product.quantityInStock}
                value={qty}
                onChange={(e) => {
                  // Math.max(1, ...) also covers the cleared field: Number('') is 0
                  setQty(Math.max(1, Math.trunc(Number(e.target.value) || 1)))
                }}
              />

              <button type="submit" className="btn btn-bk w-100" disabled={!ready}>
                {ready ? 'Add to Cart' : 'Choose size and color'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductDetailView
