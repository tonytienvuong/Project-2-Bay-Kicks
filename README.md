# Bay Kicks — CS351 Project 2

A full-stack sneaker storefront: a React single-page app talking to a Node + Express
REST API, with users, carts and orders stored in MongoDB Atlas.

The structure and the code style follow what the course taught: separate `client/`
and `server/` directories, Express routes → controllers, `body-parser` for request
bodies, one MongoClient opened in `startServer()`, and bcrypt password hashes.

Group 7 — Tien Vuong, Benjamin Samok, Patrick Simpauco (CS351-02-1, Grewe, Fall 2026).

## Run it locally

    npm install
    cp .env.example .env          # paste your Atlas connection string into MONGODB_URI
    npm run build                 # builds the React app into client/dist
    npm run server                # Express serves the API and the built React app on :3000

Then open http://localhost:3000.

`npm run dev` starts Vite's dev server for live reload on the React side; it proxies
`/api` to the Express server on 3000, so run both in two terminals.

The first start seeds the `products` collection from `server/data/products.json` if
the collection is empty. `npm run seed` does the same thing on its own.

## Layout

    client/                       the React app (Vite root)
      index.html
      vite.config.mjs             build config; proxies /api to :3000 in dev
      public/                     images, favicon, image credits
      src/
        App.jsx                   which view is showing; loads products + cart
        api.js                    every fetch the app makes, one helper per endpoint
        components/               NavBar, HomeView, ShopView, ProductList, ProductCard,
                                  ProductDetailView, CartView, CartItem, AccountView,
                                  CreateAccountView

    server/                       the Express API
      app.js                      body-parser, sessions, routes, static client build
      server.js                   startServer(): connect MongoDB, then listen
      db/databaseConnection.js    one MongoClient, reused for every request
      controllers/                accountController, productController,
                                  cartController, orderController
      routes/                     accountRoutes, productRoutes, cartRoutes, orderRoutes
      middleware/                 requireLogin
      data/products.json          the catalogue used to seed the products collection
      seedProducts.js             one-time seed into MongoDB

    .env.example                  the settings the server reads

## API

    GET  /api/products           the whole catalogue, from MongoDB
    GET  /api/products/:id       one product

    POST /api/accounts           {login,email,password,street,city,state,zip,phone}
                                 -> 201 {ok,userId,message} | 400 {error,fields} | 409
    POST /api/login              {login,password}  (login or email accepted)
                                 -> 200 {ok,user} | 401 {error}
    POST /api/logout             -> 200 {ok}
    GET  /api/account            the signed-in user's profile      (login required)
    PUT  /api/account            edit name, email, phone, address  (login required)

    GET  /api/cart               {cart, count, subtotal}
    POST /api/cart               {productId,qty,size,color} -> {cart, count, subtotal}
    PUT  /api/cart/:itemId       {qty,size,color}          -> {cart, count, subtotal}
    DELETE /api/cart/:itemId     ?size=&color=             -> {cart, count, subtotal}

    GET  /api/checkout           {user,cart,count,subtotal,taxRate,tax,total}  (login required)
    POST /api/orders             {shippingAddress,billingAddress,payment:{cardType,last4}}
                                 -> 201 {ok,orderId,order}      (login required)
    GET  /api/orders             this user's orders             (login required)
    GET  /api/orders/:id         one of this user's orders      (login required)

    GET  /api/health             server + database status

`:itemId` is the product id. When the same product sits in the cart in two sizes, the
request also sends `size` and `color` so it is clear which line is meant.

## Database

MongoDB Atlas (free M0 tier), database `baykicks`:

    products  {id, sku, name, brand, price, salePrice, sizes[], colors[], quantityInStock, ...}
    users     {login, email, passwordHash, firstName, lastName, phone, shippingAddress{}, createdAt}
    orders    {userId, orderDate, customer{}, shippingAddress{}, billingAddress{},
               payment{cardType,last4}, items[], subtotal, tax, shippingCost, total, status}

`orders.userId` is the MongoDB `_id` of the user document that placed the order, which
is the reference the rubric asks for. Passwords are bcrypt hashes, never plain text.
Card numbers and CVVs are never stored — only the card type and the last four digits.

## Money

Prices come from the products collection, never from the request body. Tax is 9.5%,
shown on the checkout page and stored on the order. Shipping is a flat 0.00 for this
project.

## Sessions

`express-session` holds the cart (`req.session.cart`) and the signed-in user
(`req.session.user`). The default MemoryStore empties on restart — fine for a class
project, and worth saying out loud in a demo.

## Product images

The 25 photos in `client/public/images/` come from Wikimedia Commons. Each one's
author, licence and source page is recorded in `client/public/images/CREDITS.json`.

## Notes

The React app was scaffolded with Vite (`npm create vite@latest`) in Project 1; Project
2 adds the Express server, the MongoDB collections and the session-backed cart and
checkout. AI assistance is disclosed on the project Wiki.
