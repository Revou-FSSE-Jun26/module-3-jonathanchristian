"use client";

import { useEffect, useId, useRef } from "react";
import { formatPrice } from "@/lib/format";

export type PriceRange = [number, number];

export interface PriceRangeSliderProps {
  /** Lowest selectable value (slider's left end). */
  min: number;
  /** Highest selectable value (slider's right end). */
  max: number;
  step: number;
  /** Current selection as `[low, high]`. */
  value: PriceRange;
  /** Fires continuously while a handle is dragged or nudged. */
  onChange: (value: PriceRange) => void;
  /** Fires once the user releases a handle (native `change` event). */
  onCommit: (value: PriceRange) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Styles for each native range input. Kept here as Tailwind classes (rather
 * than in globals.css) so they're always generated alongside the component.
 *
 * - The input itself is invisible and ignores pointer events, so the two
 *   stacked inputs don't block each other.
 * - Only the thumb accepts pointer events, so each handle stays draggable.
 * - Thumb styles are written once per engine: `-webkit-` (Chrome, Edge,
 *   Safari) and `-moz-` (Firefox).
 */
const INPUT_CLASSES = [
  // The input: transparent, full width, no native look, no pointer events.
  "pointer-events-none absolute inset-x-0 top-3 m-0 h-5 w-full appearance-none bg-transparent focus:outline-none",
  // Hide native tracks / progress fill.
  "[&::-webkit-slider-runnable-track]:h-5 [&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-moz-range-track]:h-5 [&::-moz-range-track]:bg-transparent",
  "[&::-moz-range-progress]:bg-transparent",
  // WebKit / Blink thumb.
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--color-brand)] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgb(15_23_42/0.2)]",
  "active:[&::-webkit-slider-thumb]:cursor-grabbing",
  "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(37_99_235/0.3)]",
  "disabled:[&::-webkit-slider-thumb]:cursor-not-allowed",
  // Firefox thumb.
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--color-brand)] [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_3px_rgb(15_23_42/0.2)]",
  "active:[&::-moz-range-thumb]:cursor-grabbing",
  "focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_4px_rgb(37_99_235/0.3)]",
  "disabled:[&::-moz-range-thumb]:cursor-not-allowed",
].join(" ");

/**
 * A dual-handle price range slider built from two stacked native
 * `<input type="range">` elements — no external library.
 *
 * Layout: the visual track sits on top; both handles travel in a row just
 * below it. The track is inset by half a handle width on each side so a
 * handle's centre lines up exactly with the corresponding end of the
 * selected segment (a native thumb's centre travels from `w/2` to
 * `width - w/2`, not from 0 to 100%).
 *
 * Native range inputs give us keyboard (arrows, PageUp/Down, Home/End), touch,
 * and screen-reader support for free.
 */
export default function PriceRangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  onCommit,
  disabled = false,
  className = "",
}: PriceRangeSliderProps) {
  const [low, high] = value;
  const labelId = useId();
  const lowRef = useRef<HTMLInputElement>(null);
  const highRef = useRef<HTMLInputElement>(null);

  const span = Math.max(max - min, 1);
  const lowPct = ((low - min) / span) * 100;
  const highPct = ((high - min) / span) * 100;

  // When both handles are pushed to the right end, the low handle must sit on
  // top or it would be trapped under the high one (and vice versa on the left).
  const lowOnTop = low > min + span / 2;

  // React's `onChange` mirrors the native `input` event (fires while dragging).
  // The native `change` event fires once on release — mouse, touch, or a key
  // press — which is exactly when we want to commit. Read values from the DOM
  // since the inputs are controlled and already clamped.
  useEffect(() => {
    const lowEl = lowRef.current;
    const highEl = highRef.current;
    if (!lowEl || !highEl) return;
    const commit = () => {
      onCommit([Number(lowEl.value), Number(highEl.value)]);
    };
    lowEl.addEventListener("change", commit);
    highEl.addEventListener("change", commit);
    return () => {
      lowEl.removeEventListener("change", commit);
      highEl.removeEventListener("change", commit);
    };
  }, [onCommit]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={labelId} className="font-medium text-slate-600">
          Price
        </span>
        <span className="font-semibold tabular-nums text-slate-900">
          {formatPrice(low)} – {formatPrice(high)}
        </span>
      </div>

      <div
        role="group"
        aria-labelledby={labelId}
        className={`relative h-8 ${disabled ? "opacity-50" : ""}`}
      >
        {/* Track (inset by half a handle so percentages match thumb centres) */}
        <div
          aria-hidden
          className="absolute inset-x-2.5 top-0 h-1.5 rounded-full bg-[var(--color-hairline)]"
        >
          {/* Selected segment between the handles */}
          <div
            className="absolute inset-y-0 rounded-full bg-[var(--color-brand)]"
            style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
          />
        </div>

        {/* Handles: travel in a row below the track */}
        <input
          ref={lowRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          disabled={disabled}
          aria-label="Minimum price"
          aria-valuetext={formatPrice(low)}
          onChange={(e) => {
            const next = Math.min(Number(e.target.value), high - step);
            onChange([Math.max(next, min), high]);
          }}
          className={`${INPUT_CLASSES} ${lowOnTop ? "z-20" : "z-10"}`}
        />
        <input
          ref={highRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          disabled={disabled}
          aria-label="Maximum price"
          aria-valuetext={formatPrice(high)}
          onChange={(e) => {
            const next = Math.max(Number(e.target.value), low + step);
            onChange([low, Math.min(next, max)]);
          }}
          className={`${INPUT_CLASSES} ${lowOnTop ? "z-10" : "z-20"}`}
        />
      </div>
    </div>
  );
}
