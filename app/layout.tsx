import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "./components/Header";
import Footer from "./components/Footer";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RevoShop — Modern Tech Store",
    template: "%s | RevoShop",
  },
  description:
    "Discover audio gear, computing accessories, wearables, and smart lifestyle gadgets at RevoShop.",
};

/** Static placeholder shown while the interactive Header streams in. */
function HeaderFallback() {
  return (
    <div className="sticky top-0 z-40 px-4 pt-4">
      <div className="mx-auto h-14 max-w-6xl rounded-2xl border border-[var(--color-hairline)] bg-white/80 shadow-xl backdrop-blur-md" />
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-[var(--color-canvas)]">
        <CartProvider>
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
