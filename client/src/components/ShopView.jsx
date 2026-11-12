/* ShopView.jsx — all products, with pagination at 10 per page.
   Props: products (the full array), onOpen (opens the detail view).

   Only the current page's slice is handed to ProductList, so at most ten
   cards are in the DOM at a time. */

import { useState } from 'react'
import ProductList from './ProductList'

const PER_PAGE = 10

function ShopView({ products, onOpen }) {
  // 'page' is the page number being shown. useState so React redraws on change.
  const [page, setPage] = useState(1)

  // The catalogue arrives from the server after the first paint, so show a short
  // note instead of an empty grid while the request is in flight.
  if (products.length === 0) {
    return (
      <section className="bk-section">
        <div className="container text-center">
          <h2 className="bk-section-title">Shop all sneakers</h2>
          <p className="bk-section-sub">Loading the catalogue…</p>
        </div>
      </section>
    )
  }

  const pageCount = Math.ceil(products.length / PER_PAGE)
  const start = (page - 1) * PER_PAGE
  const visible = products.slice(start, start + PER_PAGE)

  function goTo(n) {
    setPage(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="bk-section">
      <div className="container">
        <h2 className="bk-section-title">Shop all sneakers</h2>
        <p className="bk-section-sub">
          {products.length} pairs · showing {start + 1}–{start + visible.length} · click any
          product for details
        </p>

        <ProductList products={visible} onOpen={onOpen} />

        {pageCount > 1 && (
          <nav className="bk-pager" aria-label="Product pages">
            <button onClick={() => goTo(page - 1)} disabled={page === 1}>
              Prev
            </button>

            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={n === page ? 'active' : ''}
                onClick={() => goTo(n)}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </button>
            ))}

            <button onClick={() => goTo(page + 1)} disabled={page === pageCount}>
              Next
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}

export default ShopView
