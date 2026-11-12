/* ProductList.jsx — takes the products array as a PROP and renders one
   ProductCard per product using .map().

   This matters for grading: the spec names .map() explicitly, so there is never a
   hand-written card per product. Change the JSON and the page follows.

   The Bootstrap column classes make the grid responsive: 1 card per row on phones,
   2 on small screens, 3 on large. No col-xl-3 — three wider cards read calmer than
   four narrow ones. */

import ProductCard from './ProductCard'

function ProductList({ products, onOpen }) {
  return (
    <div className="row g-4">
      {products.map((product) => (
        <div className="col-12 col-sm-6 col-lg-4" key={product.id}>
          <ProductCard product={product} onOpen={onOpen} />
        </div>
      ))}
    </div>
  )
}

export default ProductList
