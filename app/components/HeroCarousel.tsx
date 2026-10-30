"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

/** How long each slide stays on screen before autoplay advances (ms). */
const SLIDE_DURATION_MS = 5000;

interface PromoCta {
  href: string;
  label: string;
  variant: "primary" | "secondary";
}

interface PromoSlide {
  /** Short name used in the accessible slide/dot labels. */
  label: string;
  badge: string;
  title: string;
  body: string;
  ctas: PromoCta[];
  /** Full Tailwind class strings (kept literal so Tailwind can detect them). */
  gradientClass: string;
  bodyClass: string;
  primaryCtaClass: string;
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    label: "Tech season 2026",
    badge: "New drop · Tech season 2026",
    title: "Precision gear for the way you work, play, and move.",
    body: "KINETIC brings together audio, computing, wearables, and smart living — with lightning-fast discovery and crystal-clear stock info.",
    ctas: [
      { href: "/products", label: "Shop all products", variant: "primary" },
      { href: "/categories", label: "Browse categories", variant: "secondary" },
    ],
    gradientClass: "bg-gradient-to-br from-[var(--color-brand)] to-indigo-700",
    bodyClass: "text-blue-100",
    primaryCtaClass: "text-[var(--color-brand)]",
  },
  {
    label: "Free express shipping",
    badge: "Every order · No minimum",
    title: "Free express shipping on everything we sell.",
    body: "Fast, tracked delivery on every KINETIC order — plus a 30-day trial with free returns if it's not the right fit.",
    ctas: [{ href: "/products", label: "Shop now", variant: "primary" }],
    gradientClass: "bg-gradient-to-br from-emerald-600 to-teal-800",
    bodyClass: "text-emerald-50",
    primaryCtaClass: "text-emerald-700",
  },
  {
    label: "Shop by category",
    badge: "Shop by category",
    title: "Audio, computing, wearables, and smart living.",
    body: "Jump straight to the gear you care about with curated categories across the whole KINETIC catalogue.",
    ctas: [
      { href: "/categories", label: "Browse categories", variant: "primary" },
    ],
    gradientClass: "bg-gradient-to-br from-slate-800 to-violet-900",
    bodyClass: "text-violet-100",
    primaryCtaClass: "text-violet-800",
  },
];

/* ---------- prefers-reduced-motion as an external store ---------- */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
// On the server we assume motion is allowed; the client corrects on hydration.
const getReducedMotionServer = () => false;

/* ---------------------------- Component --------------------------- */

export default function HeroCarousel() {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer,
  );

  // One stable Autoplay instance. Its built-in hover/focus/pointer-up handlers
  // are disabled because they can restart playback after the user pressed
  // Pause — instead, play/stop is driven from React state below. Leaving
  // `stopOnInteraction` on means a drag stops the timer, and we restart it on
  // pointer-up ourselves (only if nothing else wants it paused).
  const [autoplay] = useState(() =>
    Autoplay({
      delay: SLIDE_DURATION_MS,
      playOnInit: false,
      stopOnInteraction: true,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  // `null` = user hasn't chosen; fall back to the reduced-motion preference.
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);

  const isPaused = userPaused ?? prefersReducedMotion;
  const shouldPlay = !isPaused && !isHovered && !hasKeyboardFocus;

  // Mirrors used inside Embla event callbacks (which outlive a single render).
  const shouldPlayRef = useRef(shouldPlay);
  const userInitiatedRef = useRef(false);

  useEffect(() => {
    shouldPlayRef.current = shouldPlay;
    if (!emblaApi) return;
    if (shouldPlay) autoplay.play();
    else autoplay.stop();
  }, [emblaApi, autoplay, shouldPlay]);

  // Track the selected slide, and announce changes the *user* caused.
  // Autoplay changes are deliberately not announced (too noisy every 5s).
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setSelectedIndex(index);
      if (userInitiatedRef.current) {
        setAnnouncement(
          `Slide ${index + 1} of ${PROMO_SLIDES.length}: ${PROMO_SLIDES[index].label}`,
        );
      }
    };
    // Embla emits `select` before `pointerUp` when a swipe changes slides,
    // so the flag is still set while `onSelect` runs.
    const onPointerDown = () => {
      userInitiatedRef.current = true;
    };
    const onPointerUp = () => {
      userInitiatedRef.current = false;
      // The plugin stopped itself on pointer-down; resume if allowed.
      if (shouldPlayRef.current) autoplay.play();
    };

    emblaApi
      .on("select", onSelect)
      .on("reInit", onSelect)
      .on("pointerDown", onPointerDown)
      .on("pointerUp", onPointerUp);

    return () => {
      emblaApi
        .off("select", onSelect)
        .off("reInit", onSelect)
        .off("pointerDown", onPointerDown)
        .off("pointerUp", onPointerUp);
    };
  }, [emblaApi, autoplay]);

  const goToSlide = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      userInitiatedRef.current = true;
      emblaApi.scrollTo(index, prefersReducedMotion);
      userInitiatedRef.current = false;
      // Give the newly chosen slide a full 5 seconds (no-op if not playing).
      autoplay.reset();
    },
    [emblaApi, autoplay, prefersReducedMotion],
  );

  // Hover pause only for real mouse pointers — touch "hover" would stick.
  const handlePointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") setIsHovered(true);
  };
  const handlePointerLeave = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse") setIsHovered(false);
  };

  // Pause while keyboard focus is inside. Mouse clicks don't count, otherwise
  // clicking a dot would leave autoplay paused until the user clicks elsewhere.
  const handleFocus = (e: FocusEvent<HTMLElement>) => {
    if (e.target.matches(":focus-visible")) setHasKeyboardFocus(true);
  };
  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setHasKeyboardFocus(false);
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative overflow-hidden rounded-3xl text-white"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Embla viewport → container → slides */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y touch-pinch-zoom">
          {PROMO_SLIDES.map((slide, index) => {
            const isActive = index === selectedIndex;
            // Only the first slide carries the page's single <h1>.
            const Heading = index === 0 ? "h1" : "h2";

            return (
              <div
                key={slide.label}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${PROMO_SLIDES.length}: ${slide.label}`}
                // Off-screen slides can't be tabbed into or read out.
                inert={!isActive}
                className={`min-w-0 shrink-0 grow-0 basis-full px-6 py-14 sm:px-12 sm:py-20 ${slide.gradientClass}`}
              >
                <span className="inline-block rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold text-slate-900">
                  {slide.badge}
                </span>
                <Heading className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                  {slide.title}
                </Heading>
                <p className={`mt-4 max-w-xl text-base sm:text-lg ${slide.bodyClass}`}>
                  {slide.body}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {slide.ctas.map((cta) =>
                    cta.variant === "primary" ? (
                      <Link
                        key={cta.href + cta.label}
                        href={cta.href}
                        className={`rounded-full bg-white px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${slide.primaryCtaClass}`}
                      >
                        {cta.label}
                      </Link>
                    ) : (
                      <Link
                        key={cta.href + cta.label}
                        href={cta.href}
                        className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        {cta.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls: pause/play + dots, overlaid in the bottom padding area */}
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1 sm:bottom-5">
        <button
          type="button"
          onClick={() => setUserPaused(!isPaused)}
          aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {isPaused ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="M4 2h3v12H4zM9 2h3v12H9z" />
            </svg>
          )}
        </button>

        <div role="group" aria-label="Choose slide" className="flex items-center">
          {PROMO_SLIDES.map((slide, index) => {
            const isActive = index === selectedIndex;
            return (
              <button
                key={slide.label}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}: ${slide.label}`}
                aria-current={isActive ? "true" : undefined}
                className="group flex h-8 min-w-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span
                  aria-hidden
                  className={`block h-2.5 rounded-full transition-all ${
                    isActive
                      ? "w-6 bg-white"
                      : "w-2.5 bg-white/50 group-hover:bg-white/80"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Screen-reader announcement for user-initiated slide changes only */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
