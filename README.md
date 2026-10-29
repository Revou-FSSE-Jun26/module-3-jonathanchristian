# KINETIC

KINETIC is a modern, responsive e-commerce frontend for discovering, buying, and managing technology products — audio equipment, computer accessories, wearables, and smart lifestyle gadgets. It is built with [Next.js](https://nextjs.org) (App Router), React, TypeScript, and Tailwind CSS, and runs against a Flask REST API.

The app supports the full shopping journey: browsing and searching the catalogue, registering and signing in, adding items to a persistent cart, placing an order, paying through Midtrans, and viewing order history. It also includes a role-based admin dashboard for managing products, categories, and orders.

## Overview

KINETIC serves three kinds of visitors, each with a different experience:

- **Guests** can browse the home page, the full product listing with live search, category filtering, product detail pages, and the categories listing. On each product they see a "Login to buy" prompt instead of an add-to-cart control. They can register or sign in.
- **Customers** (logged in, role `customer`) can do everything guests can, plus add products to a cart, view and edit the cart, check out, pay, and view their own order history and order details — including cancelling a pending order.
- **Admins** (logged in, role `admin`) get a dashboard with full product and category CRUD and a read-only overview of all customer orders, where they can advance an order's status and delete cancelled orders.

Authentication is JWT-based using **HttpOnly cookies**. Login does not return tokens in the response body; instead the API sets the access and refresh tokens as HttpOnly cookies that JavaScript cannot read (protecting against XSS token theft) and the browser attaches automatically. Because the tokens are unreadable by the client, the user's role is fetched from `GET /users/` after login and kept in a small UI-only snapshot (name + role) in `localStorage` to drive role-aware UI and route protection. Cookie auth is paired with double-submit CSRF protection: the API also sets readable CSRF cookies, and the client echoes them in an `X-CSRF-TOKEN` header on every state-changing request.

## Features

### Browsing (all visitors)
- Home page with a hero banner and the first four featured products fetched from the API.
- Products listing with live search by name/description and category filtering that work together, backed by `GET /products`.
- Product detail pages (`/products/[id]`) showing name, price, stock, and description, with a dynamic page title per product.
- Categories listing that links into the filtered products view.
- Floating pill navigation with active-route highlighting that adapts to the signed-in role.
- Loading skeletons and error fallbacks on data-fetching routes.

### Authentication
- Registration (`/register`) collecting name, email, phone, password, and address, validated client-side, submitted to `POST /users/`. New accounts are always customers. On success the user is automatically logged in and redirected home.
- Login (`/login`) via `POST /auth/login`, which sets the JWT cookies; the role is then read from `GET /users/`. Admins are redirected to `/dashboard` and customers to `/` (or to a `?next=` destination preserved by the server-side guard), with an inline error and toast on invalid credentials.
- Logout calls `POST /auth/logout` so the server can clear the HttpOnly cookies (the client cannot delete them itself), then clears the local snapshot and returns to `/login`.
- The signed-in UI state (name + role) persists across refreshes via `localStorage` and stays synced across tabs; the header shows the signed-in user's name. The real session lives in the cookies.
- Already-authenticated users are redirected away from `/login` and `/register`. All auth redirects use `router.replace()` so the back button never returns a signed-in user to the login page.
- A transparent token refresh retries a request once via `POST /auth/refresh` on a `401` (the refresh cookie is sent automatically, with the refresh CSRF token echoed in the header) before failing.

### Cart, checkout, and orders (customers)
- Add-to-cart from product cards and the product detail page, with quantity steppers clamped to stock.
- Cart persisted to `localStorage`, surviving refreshes and synced across tabs; a slide-out drawer gives a quick view.
- `/cart` page with an items table, per-row quantity controls and remove buttons, a running total, an empty state, and a "Proceed to checkout" button that is disabled when the cart is empty.
- `/checkout` review page whose single **Pay** action creates the order (`POST /orders`), clears the cart, creates a Midtrans payment (`POST /payments`), and redirects to the Midtrans Snap payment page.
- `/orders` lists the customer's own orders with status badges; `/orders/[id]` shows line items, quantities, totals, and status.
- A pending order can be cancelled (`PUT /orders/[id]` → `cancelled`) or paid for (retrying `POST /payments`) from its detail page. After returning from Midtrans, the order detail page reflects the updated status with a success toast.

### Admin dashboard (admins)
- Product CRUD at `/dashboard`: create and edit via dedicated forms, delete with a visible error when the product has active orders (the API's `409` guard).
- Category CRUD at `/dashboard/categories`: create (with name validation) and edit, delete with a visible error when products are still attached.
- Read-only order overview at `/dashboard/orders` across all customers. Admins cannot edit order contents; they can advance an order's status along the allowed forward-only transitions (`PUT /orders/[id]`) and delete only cancelled orders (`DELETE /orders/[id]`).

### Cross-cutting
- Toast notifications (react-hot-toast) on success and error for every CRUD, cart, auth, and checkout action.
- Two-layer route protection: a server-side guard (`proxy.ts`, Next.js 16's renamed middleware) gives signed-out / wrong-role users a fast pre-render redirect on protected routes, and a client-side `ProtectedRoute` component enforces the same rules once auth hydrates. Both are UX layers; the backend remains the authority on every request. (The server guard reads a small, non-sensitive role-hint cookie, since the HttpOnly JWT cookies belong to the backend's origin and are not visible to the Next.js server.)

## Technologies Used

- **Next.js (App Router)** — routing, layouts, Server and Client Components, dynamic metadata.
- **React** — component model and hooks.
- **TypeScript** — end-to-end typing of components, domain models, and the API layer.
- **Tailwind CSS** — styling and the KINETIC design system.
- **react-hot-toast** — success/error notifications.
- **next/navigation** — `useRouter`, `usePathname`, `useSearchParams` for navigation, active links, and query-param-driven search; `router.replace()` for non-returnable auth redirects.
- **HttpOnly cookies + CSRF** — the JWT access/refresh tokens live in HttpOnly cookies set by the API; requests are sent with credentials and echo a CSRF token in `X-CSRF-TOKEN`. See [Authentication & cookies](#authentication--cookies).
- **localStorage** — a UI-only session snapshot (user name + role) and cart persistence. No tokens are stored here.
- **`NEXT_PUBLIC_API_BASE_URL`** — the Flask API base URL (HTTPS), read from the environment and never hardcoded.
- **Playwright** — end-to-end test suite covering the auth, browsing, and admin journeys (see [Testing](#testing)).

## Project Structure

```
.
├── app/                           # App Router routes, layouts, and UI
│   ├── layout.tsx                 # Root layout — AuthProvider + CartProvider + Header/Footer + Toaster
│   ├── page.tsx                   # Home page (featured products)
│   ├── globals.css                # Global styles and design tokens
│   ├── components/                # Reusable React components
│   │   ├── Header.tsx             # Role-aware navigation with active-route highlighting
│   │   ├── Footer.tsx             # Brand + copyright
│   │   ├── Card.tsx               # Generic surface wrapper
│   │   ├── ProductCard.tsx        # Product tile; role-aware buy control
│   │   ├── ProductGrid.tsx        # Responsive grid of ProductCards
│   │   ├── ProductImage.tsx       # Product image / placeholder
│   │   ├── QuantityStepper.tsx    # Increment / decrement control
│   │   ├── AddToCartButton.tsx    # Stepper + add-to-cart action (customers)
│   │   ├── SearchBar.tsx          # Controlled search input
│   │   ├── CartDrawer.tsx         # Slide-out cart summary
│   │   ├── OrderStatusBadge.tsx   # Coloured order-status pill
│   │   ├── ProtectedRoute.tsx     # Client-side auth/role route guard
│   │   └── forms/                 # Admin dashboard forms
│   │       ├── CreateProductForm.tsx
│   │       ├── EditProductForm.tsx
│   │       ├── CreateCategoryForm.tsx
│   │       └── EditCategoryForm.tsx
│   ├── products/                  # Products route + nested layout
│   │   ├── layout.tsx             # Nested layout for the products section
│   │   ├── page.tsx               # Products listing (Server Component data fetch)
│   │   ├── ProductsBrowser.tsx    # Client-side search / filter UI
│   │   ├── loading.tsx            # Loading skeleton
│   │   ├── error.tsx              # Error fallback
│   │   └── [id]/                  # Dynamic product detail route
│   ├── categories/                # Categories route (page, loading, error)
│   ├── login/                     # Login page + form
│   ├── register/                  # Registration page + form
│   ├── cart/                      # Cart page (protected, customer)
│   ├── checkout/                  # Checkout + Pay flow (protected, customer)
│   ├── orders/                    # Order history list + detail (protected, customer)
│   │   └── [id]/                  # Order detail, cancel, pay
│   └── dashboard/                 # Admin dashboard (protected, admin)
│       ├── layout.tsx             # Admin guard + dashboard sub-navigation
│       ├── page.tsx               # Product CRUD
│       ├── categories/            # Category CRUD
│       └── orders/                # Read-only order overview + status updates
├── lib/                           # Shared utilities
│   ├── api/                       # Flask API client, one module per resource
│   │   ├── client.ts              # Shared fetch: base URL, credentialed cookies, CSRF header, 401→refresh, error normalization
│   │   ├── auth.ts                # login, refresh, logout, register
│   │   ├── users.ts               # getCurrentUser (GET /users/ — source of the role)
│   │   ├── products.ts            # products (paginated) + CRUD
│   │   ├── categories.ts          # categories + CRUD
│   │   ├── orders.ts              # orders + status update + delete
│   │   ├── payments.ts            # Midtrans payments
│   │   └── index.ts               # Barrel re-export (import from "@/lib/api")
│   ├── auth-context.tsx           # Auth state: UI snapshot (name + role); localStorage-backed, cookies are the real session
│   ├── cart-context.tsx           # Cart state; localStorage-backed
│   ├── toast.ts                   # Shared toast helpers
│   ├── format.ts                  # Price, stock, date, and order-status formatting
│   └── types.ts                   # Shared domain types
├── tests/                         # Playwright end-to-end suite
│   ├── auth.spec.ts               # Registration / login / logout
│   ├── browsing.spec.ts           # Products → cart → checkout journey
│   ├── admin-products.spec.ts     # Admin product CRUD (+ 409 edge)
│   ├── admin-categories.spec.ts   # Admin category CRUD (+ 409 edge)
│   ├── admin-orders.spec.ts       # Admin order status updates
│   └── helpers/                   # Seeding client, session/auth, data, payments
├── public/                        # Static assets
├── proxy.ts                       # Server-side route guard (Next.js 16 middleware → proxy)
├── playwright.config.ts           # Playwright config (baseURL + webServer, HTTPS)
├── .env.example                   # Placeholder environment variables
└── next.config.ts                 # Next.js configuration
```

## Getting Started

### Prerequisites

- Node.js 18.18 or newer.
- A running KINETIC Flask API, **served over HTTPS**, for product, category, order, and payment data. HTTPS is required locally because auth uses `Secure` cookies (see [Authentication & cookies](#authentication--cookies)).

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and set the base URL of your Flask API:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://localhost:5000
```

Use the base URL of your API with no trailing slash. It **must be `https://`** — a `Secure` cookie is never sent over plain HTTP. Use `localhost` (not `127.0.0.1`) so the app and API share a hostname for the dev certificates. The API base URL is never hardcoded in the app — it is always read from `NEXT_PUBLIC_API_BASE_URL`. Environment files with real values are git-ignored.

### 3. Run the development server

```bash
npm run dev
```

`npm run dev` starts Next.js over HTTPS (`next dev --experimental-https`); the first run generates a local certificate you may be prompted to trust. Open [https://localhost:3000](https://localhost:3000) in your browser to view the app. Make sure the Flask API is running over HTTPS and reachable at the configured base URL.

### Other scripts

```bash
npm run dev:http   # Dev server over plain HTTP (auth won't work; non-auth work only)
npm run build      # Create an optimized production build
npm run start      # Serve the production build
npm run lint       # Run ESLint
```

## Authentication & cookies

Auth is JWT-based over **HttpOnly cookies**, and the frontend and backend run on
different origins (cross-site), so a few conditions must hold for the browser to
store and resend the cookies. This is the same model in local development and in
production.

The frontend already does its part: every request is sent with
`credentials: "include"`, and state-changing requests echo the readable CSRF
cookie back in an `X-CSRF-TOKEN` header. For it to work end-to-end, the
**backend** must, in both environments:

- **Serve over HTTPS.** Locally, both the app (`https://localhost:3000`, via
  `npm run dev`) and the Flask API (`https://localhost:5000`) must be HTTPS. A
  `Secure` cookie is never sent over plain `http://`.
- **Set the JWT/CSRF cookies with `SameSite=None; Secure`** — the same flags in
  local and production, since the request is cross-site either way.
- **Send CORS headers for credentialed requests:**
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Origin:` the app's **exact** origin, not `*`
    (`https://localhost:3000` locally; the deployed app URL in production)
  - `Access-Control-Allow-Headers: Content-Type, X-CSRF-TOKEN`
  - and answer the `OPTIONS` preflight (e.g. via Flask-CORS with
    `supports_credentials=True`).

In production (frontend and backend on separate hosts) no code change is needed:
set `NEXT_PUBLIC_API_BASE_URL` to the backend's HTTPS URL and point the backend's
CORS allowed origin at the deployed frontend URL.

## Testing

A Playwright end-to-end suite lives in `tests/` and runs against the **real Flask
backend**, driving the app through the browser. It covers four journeys:

- **Registration / login / logout** — happy paths, client-side validation, the
  duplicate-email `409`, role-based redirects (admin → `/dashboard`, customer →
  `/`), and a failed-login error.
- **Full browsing journey** — products list with live search, add to cart, cart
  review with quantity changes, and checkout (real `POST /orders/` → payment →
  redirect), plus the payment-failure fallback.
- **Admin product & category CRUD** — create, create-validation, edit, delete,
  and the `409` "can't delete" edge cases (a product with an order; a category
  with a product).
- **Admin order status updates** — advancing an order through the allowed
  forward-only transitions (status changes only; no create/edit/delete of
  orders here).

### How the backend is handled

Tests hit the real API for everything **except the Midtrans payment gateway**.
The browser is never allowed to navigate to the external Midtrans Snap page — a
Playwright route interception captures that redirect instead. The payment
boundary is controlled by `PW_PAYMENTS_MODE`:

- `stub` (default) — intercepts `POST /payments` and returns a canned
  `redirect_url`. Use this until a Midtrans return URL is configured.
- `real` — calls the backend's `POST /payments` for real; the outbound Midtrans
  navigation is still intercepted.

### Prerequisites

- The Flask API running over **HTTPS** and reachable at `NEXT_PUBLIC_API_BASE_URL`,
  with the cookie/CORS configuration from [Authentication & cookies](#authentication--cookies).
- A dedicated test database (tests create data with unique names and rely on the
  API's soft-deletion, so no cleanup step is required).
- A known **admin** account (registration only ever creates customers). The
  admin journeys read credentials from the environment.

Set the following in `.env` (documented in `.env.example`; `.env` is
git-ignored):

```
PW_ADMIN_EMAIL=admin@example.com
PW_ADMIN_PASSWORD=your-admin-password
PW_PAYMENTS_MODE=stub
```

The Playwright config auto-starts the Next.js dev server over HTTPS on port 3000
(`https://localhost:3000`) and ignores the self-signed certificate; you only
need to start the Flask API yourself.

### Running the tests

```bash
npm run test:e2e             # Run the full suite headless
npm run test:e2e:ui          # Run interactively in the Playwright UI
```

The first run needs the Playwright browsers installed:

```bash
npx playwright install
```

### Results

The suite was last run locally against the Flask API with **47 of 48 tests
passing**. The single failure was a Firefox-only flake: the exact same test
case passed on Chromium, so it reflects a browser/host quirk rather than a
defect in the app. A representative run is captured in
`screenshots/Screenshot - Playwright Tests.png`.

### Browser support

The suite is configured for Chromium, Firefox, and WebKit. It passes on
**Chromium**; on **Firefox** a single test may flake on some hosts (it passes
on Chromium). On some Windows hosts WebKit fails to launch with a
`STATUS_DLL_NOT_FOUND` / missing `icudt77.dll` error; this is a host-level
dependency issue, not a test problem. If you hit it, install the latest
**Microsoft Visual C++ Redistributable (x64)** and re-run
`npx playwright install webkit`, or run just the working browsers:

```bash
npx playwright test --project=chromium --project=firefox
```

## Screenshots

_Screenshots of each major view (home, product listing, product detail, category listing, register, login, cart, checkout, orders, and the admin dashboard) can be viewed in `/screenshots folder`._

---

Disclaimer: KINETIC is a portfolio project created for educational and demonstration purposes only. It is not an actual commercial store, and no items are available for real purchase. All trademarks, logos, and product imagery belong to their respective owners.