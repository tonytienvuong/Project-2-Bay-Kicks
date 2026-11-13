# Bay Kicks — CS351 Project 2

A full-stack sneaker storefront: a React single-page app talking to a Node + Express
REST API, with users, carts and orders stored in MongoDB Atlas.

**Live:** https://bay-kicks-1039039875318.us-central1.run.app
**Documentation:** https://tonytienvuong.github.io/Project-2-Bay-Kicks/

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

## Deploy it (Google Cloud Run)

The whole app ships as **one Cloud Run service**: the Express server answers `/api/*`
and serves the built React files at the same URL. MongoDB Atlas stays external.

The build is not committed. `dist/` and `client/dist/` are in `.gitignore` (and in
`.dockerignore`), so the image builds the React app itself — that is what the first
stage of the `Dockerfile` is for. A deploy that runs but serves a blank page or 404s
on `/assets/*` is a missing build, not a routing bug.

1. Build the image and deploy from this folder:

       gcloud run deploy bay-kicks --source . --region us-central1 \
         --allow-unauthenticated \
         --env-vars-file /tmp/bay-kicks-env.yaml

   `/tmp/bay-kicks-env.yaml` is a temporary copy of the three settings Cloud Run needs,
   taken from `.env`:

       MONGODB_URI: "mongodb+srv://..."
       MONGODB_DB: "baykicks"
       SESSION_SECRET: "..."

   Delete that file after the deploy — it is a second plaintext copy of the password.

2. In Atlas → Network Access, a Cloud Run instance connects from a Google IP, so the
   allowlist needs an entry during the demo. Add `0.0.0.0/0` (Atlas offers 1 hour or
   6 hours) before testing the live URL, and remove it afterwards. Without it the site
   loads but every data call fails.

3. Check the live URL with the API, not just the page:

       curl -s -o /dev/null -w '%{http_code}\n' https://<service-url>/api/products   # 200
       curl -s https://<service-url>/api/health                                      # {"ok":true,...}

   `GET /api/products` returning 200 with 25 items proves Express, the static build and
   Atlas are all working in the container.

Local secrets never go into the image: `.env` is in `.gitignore` and `.dockerignore`,
and the Cloud Run service gets the same three values as environment variables.

## Layout

    client/                       the React app (Vite root)
      index.html
      vite.config.mjs             build config; proxies /api to :3000 in dev
      public/                     images, favicon, image credits
      src/
        App.jsx                   which view is showing; loads products + cart
        api.js                    every fetch the app makes, one helper per endpoint
        components/               NavBar, HomeView, ShopView, ProductList, ProductCard,
                                  ProductDetailView, CartView, CartItem, CheckoutView,
                                  AccountView (sign-in + dashboard),
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

## The customer flow

    /createAccount  form posts to POST /api/accounts → "Account created. Please log in."
    /account        sign in (POST /api/login), then the dashboard: your information,
                    Edit account (PUT /api/account), View orders (GET /api/orders), Log out
    /shop           products from GET /api/products; a product page adds to the cart
    /cart           the session cart, quantity +/− and remove
    /checkout       shipping + billing + payment, totals from GET /api/checkout;
                    Place order posts to POST /api/orders and shows the confirmation

The confirmation repeats the customer information, the addresses, the payment (card
type + last four only), every item with productId and quantity, and the total with tax.

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
