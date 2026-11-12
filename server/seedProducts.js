/* seedProducts.js — put the catalogue into MongoDB once.

   The project page is firm that the running app must read products from the
   database, not from a JSON file: "you no longer have a products.json in the code,
   everything comes from the database". So the JSON here is only a SEED file, used
   once to fill an empty products collection; after that the database is the copy
   that counts.

   Called automatically by startServer() when the collection is empty, and can also
   be run on its own:  npm run seed
*/

const fs = require('fs')
const path = require('path')
const { getCollection } = require('./db/databaseConnection')

// The seed file, server/data/products.json — the Project 1 catalogue.
const seedFile = path.join(__dirname, 'data', 'products.json')

// Read the seed file from disk.
function readSeedFile() {
  return JSON.parse(fs.readFileSync(seedFile, 'utf8'))
}

// Insert the catalogue only when the collection has no documents yet, so restarting
// the server never duplicates products (and never overwrites hand edits).
async function seedProductsIfEmpty() {
  const products = getCollection('products')
  const existing = await products.countDocuments()
  if (existing > 0) {
    console.log('[seed] products collection already has ' + existing + ' documents')
    return existing
  }

  const catalogue = readSeedFile()
  await products.insertMany(catalogue)
  console.log('[seed] inserted ' + catalogue.length + ' products')
  return catalogue.length
}

// Running the file directly (`node server/seedProducts.js`) seeds, then exits.
if (require.main === module) {
  require('dotenv').config()
  const { connectToDatabase, closeDatabase } = require('./db/databaseConnection')

  connectToDatabase()
    .then(seedProductsIfEmpty)
    .then(function (count) {
      console.log('[seed] done, products in collection:', count)
    })
    .catch(function (err) {
      console.error('[seed] failed:', err.message)
      process.exitCode = 1
    })
    .finally(closeDatabase)
}

module.exports = { seedProductsIfEmpty, readSeedFile }
