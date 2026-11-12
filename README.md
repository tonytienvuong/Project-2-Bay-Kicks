# Bay Kicks — CS351 Project 2

A storefront for a fictional sneaker shop, built with React, Vite and Bootstrap 5,
with a Node + Express server and a MongoDB Atlas database behind it. Accounts,
the shopping cart and orders are stored on the server.

## Run it locally

    npm install
    cp .env.example .env        # then paste your Atlas connection string into it
    npm run build               # builds the React app into dist/
    npm run server              # Express serves the API and dist/ on :3000

Then open http://localhost:3000.

`npm run dev` still works if you want Vite's live reload on the React side, but the
`/api` calls need Express running too — run both in two terminals.

## How the pieces fit

    server/server.js            Express app: body parsing, sessions, routes, static dist/
    server/db.js                one MongoDB connection; creates users + orders collections
    server/routes/accounts.js   POST /api/createAccount, POST /api/login, /api/logout, /api/me
    server/routes/cart.js       cart stored in req.session.cart (add/update/remove)
    server/routes/checkout.js   order preview with tax, POST /api/checkout writes to orders

    src/App.jsx                 holds the current view; first view comes from the URL
    src/data/products.json      25 products, one category (sneakers)
    src/components/
      NavBar.jsx                Home / Shop / Account / Cart + live cart count
      HomeView.jsx              entrance page
      ShopView.jsx              product grid with pagination, 10 per page
      ProductList.jsx           one ProductCard per product with .map()
      ProductCard.jsx           one product in the grid
      ProductDetailView.jsx     product page: options, quantity, Add to Cart
      CartView.jsx              cart lines, quantity up/down, remove
      AccountView.jsx           sign-in form, posts to /api/login
      CreateAccountView.jsx     sign-up form, posts to /api/createAccount

## API

    POST /api/createAccount  {login,email,password,street,city,state,zip,phone}
                             -> 201 {ok,userId} | 400 {error,fields} | 409 {error,fields}
    POST /api/login          {login,password}   -> 200 {ok,user} | 401 {error}
    POST /api/logout                            -> 200 {ok}
    GET  /api/me                                -> {user, cartLines}
    POST /api/cart/add       {productId,qty,size,color}  -> {cart,count,subtotal}
    GET  /api/cart                                      -> {cart,count,subtotal}
    POST /api/cart/update    {productId,qty,size,color}  -> {cart,count,subtotal}
    POST /api/cart/remove    {productId,size,color}      -> {cart,count,subtotal}
    POST /api/cart/clear                                -> {cart,count,subtotal}
    GET  /api/checkout                          -> {user, cart, subtotal, taxRate, tax, total}
    POST /api/checkout                          -> 201 {orderId, order}
    GET  /api/health                            -> server + database status

## Database

MongoDB Atlas (free M0 tier), database `baykicks`, two collections:

    users    {login, email, passwordHash, address{}, phone, createdAt}
    orders   {userId, items[], shipping{}, billing{}, subtotal, tax, total, createdAt}

Passwords are stored as `salt:hash` from `scrypt`, never in plain text.

## Product images

The 25 product photos in `public/images/` come from Wikimedia Commons. Each one's
author, licence and source page is recorded in `public/images/CREDITS.json`.

## Notes

Vite + React scaffold generated with `npm create vite@latest`. Project 1 of this
course built the storefront pages; Project 2 adds the server, database and
sessions. AI assistance is disclosed on the project Wiki.
