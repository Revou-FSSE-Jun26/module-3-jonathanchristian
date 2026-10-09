# RevoShop

RevoShop is a modern, responsive e-commerce frontend for discovering and browsing technology products — audio equipment, computer accessories, wearables, and smart lifestyle gadgets. It is built with [Next.js](https://nextjs.org) (App Router), TypeScript, and Tailwind CSS, and fetches live product and category data from a Flask API.

The app covers product discovery, reusable product cards, live search and category filtering, product detail pages with dynamic metadata, and a frontend-only cart. Authentication, backend data mutations, and checkout are intentionally out of scope at this stage.

## Features

- Home page with a hero banner and featured products fetched from the API.
- Products page with live search and category filtering that work together.
- Product detail pages (`/products/[id]`) with a dynamic page title per product.
- Categories page that links into the filtered products view.
- Floating pill navigation with active-route highlighting.
- Frontend-only cart with quantity controls, item count, and total, using immutable state updates.
- Server Component data fetching with `loading.tsx` skeletons and `error.tsx` fallbacks on data-fetching routes.

## Project Structure

```
.
├── app/                      # App Router routes, layouts, and UI
│   ├── layout.tsx            # Root layout — wraps every page with Header + Footer
│   ├── page.tsx              # Home page (featured products)
│   ├── globals.css           # Global styles and design tokens
│   ├── components/           # Reusable React components
│   │   ├── Header.tsx        # Navigation with active-route highlighting
│   │   ├── Footer.tsx        # Brand + copyright
│   │   ├── Card.tsx          # Generic surface wrapper
│   │   ├── ProductCard.tsx   # Product tile (typed props, stock-aware button)
│   │   ├── ProductGrid.tsx   # Responsive grid of ProductCards
│   │   ├── ProductImage.tsx  # Product image / placeholder
│   │   ├── QuantityStepper.tsx # Increment / decrement control
│   │   ├── SearchBar.tsx     # Controlled search input
│   │   ├── AddProductForm.tsx  # Validated, local-only product form
│   │   └── CartDrawer.tsx    # Slide-out cart summary
│   ├── products/             # Products route + nested layout
│   │   ├── layout.tsx        # Nested layout for the products section
│   │   ├── page.tsx          # Products listing (Server Component data fetch)
│   │   ├── ProductsBrowser.tsx # Client-side search / filter UI
│   │   ├── loading.tsx       # Loading skeleton
│   │   ├── error.tsx         # Error fallback
│   │   └── [id]/             # Dynamic product detail route
│   ├── categories/           # Categories route (page, loading, error)
│   └── orders/               # Orders placeholder page (see note below)
├── lib/                      # Shared utilities
│   ├── api.ts                # Flask API client (reads NEXT_PUBLIC_API_BASE_URL)
│   ├── cart-context.tsx      # Frontend-only cart state (React context)
│   ├── format.ts             # Price and stock formatting helpers
│   └── types.ts              # Shared domain types
├── public/                   # Static assets
├── .env.example              # Placeholder environment variables
└── next.config.ts            # Next.js configuration
```

## About the Orders Page

The `/orders` route is a placeholder and does not display real orders fetched from the API. All `/orders` endpoints require a user JWT token that is obtained through login (`POST /login`), and login/authentication is not implemented yet.

As noted in the Checkpoint 2 brief, "real POST/PUT/DELETE calls to the Flask API, authentication, and the cart/checkout flow are the focus of Checkpoint 3." The Orders page therefore shows a friendly message explaining that order history requires signing in, and will be wired up to live data once authentication is implemented in a later checkpoint.

## Getting Started

### Prerequisites

- Node.js 18.18 or newer
- A running RevoShop Flask API to fetch product and category data from

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
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Use the base URL of your API with no trailing slash. The API base URL is never hardcoded in the app — it is always read from `NEXT_PUBLIC_API_BASE_URL`. Environment files with real values are git-ignored.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

### Other scripts

```bash
npm run build   # Create an optimized production build
npm run start   # Serve the production build
npm run lint    # Run ESLint
```
