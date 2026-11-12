/* databaseConnection.js — the single MongoDB Atlas connection for the server.

   This is the same pattern as the CS351 Lab 10 file of the same name: create one
   MongoClient when the server starts, reuse it for every request. Opening a client
   inside each controller would open a new connection pool per request and exhaust
   the free Atlas tier.

   Exports:
     connectToDatabase()   connect once, ping, remember the database
     getCollection(name)   one collection from the connected database
     getDatabase()         the database object itself
     getConnectionState()  { connected, database } | { connected:false, reason }
     closeDatabase()       clean shutdown, used when the process stops
*/

const { MongoClient, ServerApiVersion } = require('mongodb')

// Held for the life of the process.
let client = null
let db = null
let lastError = null

// Connect to Atlas and keep the connection open. Called from startServer().
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and paste your Atlas connection string.')
  }

  // ServerApiVersion.v1 pins the stable API behaviour; this is the object the Atlas
  // console hands you when you copy the Node.js driver snippet.
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  })

  await client.connect()

  // Ping first: a bad password or a blocked IP fails here, with a clear message,
  // instead of failing later inside a controller.
  await client.db('admin').command({ ping: 1 })

  db = client.db(process.env.MONGODB_DB || 'baykicks')
  lastError = null
  return db
}

// One collection by name: 'users', 'orders', 'products'.
function getCollection(name) {
  if (!db) throw new Error('Database not connected — check MONGODB_URI in .env')
  return db.collection(name)
}

// The database object, for listCollections and similar.
function getDatabase() {
  if (!db) throw new Error('Database not connected — check MONGODB_URI in .env')
  return db
}

// What /api/health reports, and what the startup log prints.
function getConnectionState() {
  if (db) return { connected: true, database: db.databaseName }
  return { connected: false, reason: lastError ? lastError.message : 'not attempted' }
}

// Remember why the connection failed so /api/health can say it.
function noteConnectionError(err) {
  lastError = err
}

// Close the pool on shutdown (Ctrl+C, Cloud Run stopping the instance).
async function closeDatabase() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

module.exports = {
  connectToDatabase,
  getCollection,
  getDatabase,
  getConnectionState,
  noteConnectionError,
  closeDatabase,
}
