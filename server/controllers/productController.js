/* productController.js — product data served from MongoDB (not from a JSON file).

   The project page is explicit about this: "you no longer have a products.json in
   the code, everything comes from the database". The catalogue is seeded once into
   the products collection, and from then on this controller is the only way the
   React app sees a product.

   Endpoints:
     GET /api/products       every product, for Shop View
     GET /api/products/:id   one product, for Product Detail View
*/

const { getCollection } = require('../db/databaseConnection')

// The products collection.
function products() {
  return getCollection('products')
}

// GET /api/products — the whole catalogue, ordered by the catalogue's own id so the
// grid keeps the same order on every request.
module.exports.getProducts = async function (req, res, next) {
  try {
    const list = await products().find({}).sort({ id: 1 }).toArray()
    res.json(list)
  } catch (err) {
    next(err)
  }
}

// GET /api/products/:id — one product, or 404 if that id is not in the collection.
module.exports.getProductById = async function (req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Product id must be a number.' })
    }

    const product = await products().findOne({ id })
    if (!product) return res.status(404).json({ error: 'No product with id ' + id + '.' })

    res.json(product)
  } catch (err) {
    next(err)
  }
}
