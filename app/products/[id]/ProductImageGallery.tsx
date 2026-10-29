"use client";

// Product image gallery for the detail page.
//
// Shows the active image large, with a control row below it — Prev button,
// clickable thumbnails, Next button — to switch between a product's images.
// The thumbnails act like "page" buttons (highlighted when active). The whole
// control only appears when there are 2+ images; a single image shows on its
// own, and no images falls back to the gradient-initials placeholder (same as
// ProductImage) so behaviour is unchanged for those products.

import { useState } from "react";
import type { Product } from "@/lib/types";
import ProductImage from "../../components/ProductImage";

/** Collect the product's usable (non-empty) image URLs, preserving order. */
function imageUrls(images: Product["images"]): string[] {
  if (!images) return [];
  const urls: string[] = [];
  for (const image of images) {
    if (image?.url && image.url.trim()) urls.push(image.url);
  }
  return urls;
}

/** A large image that falls back to a placeholder tile if the URL fails. */
function MainImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center bg-[var(--color-canvas-alt)] text-sm text-slate-400"
        role="img"
        aria-label={`${alt} (image unavailable)`}
      >
        Image unavailable
      </div>
    );
  }
  return (
    // Remote image URLs aren't known at build time and have no fixed host/size,
    // so a plain <img> with an onError fallback is the right tool here (same
    // rationale as ProductImage).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="aspect-square w-full object-cover"
    />
  );
}

/** A clickable thumbnail with a broken-URL fallback. */
function Thumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-[var(--color-canvas-alt)] text-[10px] text-slate-400">
        n/a
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

export default function ProductImageGallery({ product }: { product: Product }) {
  const urls = imageUrls(product.images);
  const [active, setActive] = useState(0);

  // No usable images → reuse the existing gradient-initials placeholder,
  // wrapped to match the framed look of the main image.
  if (urls.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--color-hairline)]">
        <ProductImage
          product={product}
          className="aspect-square w-full"
          textClassName="text-7xl"
        />
      </div>
    );
  }

  const index = Math.min(active, urls.length - 1);
  const showControls = urls.length > 1;
  const canPrev = index > 0;
  const canNext = index < urls.length - 1;

  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), urls.length - 1);
    setActive(clamped);
  };

  const arrowBtn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-3xl border border-[var(--color-hairline)]">
        <MainImage
          src={urls[index]}
          alt={`${product.name} — image ${index + 1} of ${urls.length}`}
        />
      </div>

      {showControls && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={!canPrev}
            aria-label="Previous image"
            className={arrowBtn}
          >
            <span aria-hidden>←</span>
            <span className="ml-1 hidden sm:inline">Prev</span>
          </button>

          {/* Thumbnail "page" buttons. Scrolls horizontally when there are
              many images. */}
          <ul className="flex flex-1 items-center gap-2 overflow-x-auto py-1">
            {urls.map((url, i) => (
              <li key={`${url}-${i}`}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === index
                      ? "border-[var(--color-brand)]"
                      : "border-[var(--color-hairline)] hover:border-[var(--color-brand)]/60"
                  }`}
                >
                  <Thumb src={url} alt={`${product.name} thumbnail ${i + 1}`} />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={!canNext}
            aria-label="Next image"
            className={arrowBtn}
          >
            <span className="mr-1 hidden sm:inline">Next</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
