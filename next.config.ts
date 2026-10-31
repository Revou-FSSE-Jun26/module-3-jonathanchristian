import type { NextConfig } from "next";

// Absolute URL of the Flask API (server-only, never shipped to the browser).
// Read at BUILD time here, so on Vercel it must be set before the build and a
// change requires a redeploy.
const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");

if (!apiBaseUrl) {
  throw new Error(
    "API_BASE_URL is not set. Add it to .env (see .env.example) or to the Vercel project's environment variables."
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // The backend's routes use trailing slashes (`/orders/`, `/users/`). Next's
  // default would 308 `/api/orders/` -> `/api/orders`, and Flask would then
  // redirect back to `/orders/` on the backend's own origin — breaking the
  // same-origin proxy below. Keep paths exactly as requested.
  skipTrailingSlashRedirect: true,

  // Same-origin API proxy. The browser calls `/api/*` on THIS app's origin and
  // Next forwards it to the Flask API. Because the browser never talks to the
  // backend directly, the backend's auth + CSRF cookies are stored as
  // first-party cookies of this app: `document.cookie` can read the CSRF token,
  // and browsers that block third-party cookies (e.g. Safari) still send them.
  async rewrites() {
    return {
      beforeFiles: [
        // Trailing-slash variant first so `/api/orders/` -> `/orders/` exactly.
        {
          source: "/api/:path*/",
          destination: `${apiBaseUrl}/:path*/`,
        },
        {
          source: "/api/:path*",
          destination: `${apiBaseUrl}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
