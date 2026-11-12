/* server.js — start the server: read .env, connect to MongoDB, then listen.

   The project page asks for exactly this shape: "Establish the MongoDB connection
   when the Express application starts and reuse that connection for incoming
   requests. You should add this logic to your async function startServer() in the
   server.js file."

   Run it with:  npm run server
   Build the React app first with:  npm run build
*/

require('dotenv').config()

const app = require('./app')
const { connectToDatabase, getConnectionState, closeDatabase, noteConnectionError } = require('./db/databaseConnection')
const { seedProductsIfEmpty } = require('./seedProducts')

// Port 3000 locally, or whatever Cloud Run sets ($PORT).
const PORT = process.env.PORT || 3000

// Connect once, make sure the catalogue exists, then accept requests.
async function startServer() {
  try {
    await connectToDatabase()
    await seedProductsIfEmpty()
    console.log('[db] connected to', getConnectionState().database)
  } catch (err) {
    // Keep the site up anyway: the storefront pages still render without a
    // database, and /api/health says exactly what is wrong.
    noteConnectionError(err)
    console.error('[db] NOT connected:', err.message)
  }

  const server = app.listen(PORT, function () {
    console.log('[web] Bay Kicks running at http://localhost:' + PORT)
  })

  // Close the MongoDB pool when the process is asked to stop (Ctrl+C, or Cloud Run
  // shutting the instance down).
  function shutdown() {
    console.log('[web] shutting down')
    server.close(function () {
      closeDatabase().finally(function () {
        process.exit(0)
      })
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startServer()
