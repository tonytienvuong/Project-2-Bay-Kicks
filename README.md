# 👟 Bay Kicks — CS351 Project 2

Bay Kicks is a full-stack sneaker storefront built with **React, Node.js, Express, and MongoDB Atlas**.

Customers can browse sneakers, create accounts, manage shopping carts, and place orders.

**Live Website:** https://bay-kicks-1039039875318.us-central1.run.app  
**Documentation:** https://tonytienvuong.github.io/Project-2-Bay-Kicks/

**Group 7:** Tien Vuong, Benjamin Samok
**Course:** CS351 — Fall 2026

## Tech Stack

| Frontend | Backend | Database | Hosting |
|---|---|---|---|
| React + Vite | Node.js + Express | MongoDB Atlas | Google Cloud Run |

Additional tools include bcrypt for password hashing and express-session for login sessions and shopping carts.

## How It Works

```text
Customer
   ↓
React Frontend
   ↓ HTTP Requests
Express Routes
   ↓
Controllers
   ↓
MongoDB Atlas
   ↓
JSON Response → React
```

React handles the user interface. Express processes API requests, controllers handle application logic, and MongoDB stores products, users, and orders.

## Features

- **Products:** Browse 25 sneakers with sizes, colors, and prices.
- **Accounts:** Register, log in, edit profiles, and view order history.
- **Shopping Cart:** Add, update, or remove items using sessions.
- **Checkout:** Calculate totals, tax, and shipping.
- **Orders:** Save completed orders to MongoDB.
- **Security:** Hash passwords with bcrypt and protect account endpoints.

## Project Structure

```text
client/
  src/
    App.jsx          # Main React app
    api.js           # API requests
    components/      # Website views and UI

server/
  app.js             # Express setup
  server.js          # Starts server and database
  routes/            # API endpoints
  controllers/       # Application logic
  db/                # MongoDB connection
  middleware/        # Login protection
  data/              # Product seed data
```

## Run Locally

```bash
npm install
cp .env.example .env
npm run build
npm run server
```

Add your MongoDB connection string and session secret to `.env`.

Open **http://localhost:3000**.

For React development with live reload, run `npm run dev` in a separate terminal while Express is running.

## API Overview

| Category | Endpoints | Purpose |
|---|---|---|
| Products | `/api/products` | Retrieve sneakers |
| Accounts | `/api/accounts`, `/api/login`, `/api/account`, `/api/logout` | Manage users |
| Cart | `/api/cart` | Manage shopping cart |
| Checkout | `/api/checkout` | Get checkout information |
| Orders | `/api/orders` | Create and retrieve orders |
| Health | `/api/health` | Check server and database |

The API uses GET, POST, PUT, and DELETE methods.

## Database

MongoDB Atlas contains three collections:

- **products:** Sneaker details, prices, inventory, sizes, and colors.
- **users:** Customer information and bcrypt password hashes.
- **orders:** Purchases, totals, addresses, and payment summaries.

Each order contains a `userId` referencing the customer's MongoDB `_id`.

## Deployment

Bay Kicks runs as a single service on **Google Cloud Run**.

Express serves both the React production build and the `/api` endpoints, while MongoDB Atlas hosts the database separately.

The Dockerfile builds the React app during deployment. Environment variables provide the database connection and session configuration.

## Additional Notes

- Tax rate: **9.5%**
- Shipping: **Free**
- Cart and login sessions use Express MemoryStore and may reset when the server restarts.
- Payment processing is simulated; full card details are not stored.
- Product image credits are in `client/public/images/CREDITS.json`.
- AI assistance is disclosed in the project Wiki.
