/* productRoutes.js — URL → controller for the product catalogue.

   Mounted at /api in app.js:
     GET /api/products       the whole catalogue (Shop View)
     GET /api/products/:id   one product (Product Detail View)
*/

const express = require('express')

const router = express.Router()
const productController = require('../controllers/productController')

router.get('/products', productController.getProducts)
router.get('/products/:id', productController.getProductById)

module.exports = router
