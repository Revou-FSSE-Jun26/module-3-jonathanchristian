"use client";

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
}

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label = "quantity",
}: QuantityStepperProps) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && (max === undefined || value < max);

  const decrement = () => {
    if (canDecrement) onChange(Math.max(min, value - 1));
  };
  const increment = () => {
    if (canIncrement) onChange(max === undefined ? value + 1 : Math.min(max, value + 1));
  };

  return (
    <div
      className="inline-flex items-center rounded-full border border-[var(--color-hairline)] bg-white"
      role="group"
      aria-label={`Adjust ${label}`}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={!canDecrement}
        aria-label={`Decrease ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span
        className="min-w-8 text-center text-sm font-semibold tabular-nums text-slate-900"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={!canIncrement}
        aria-label={`Increase ${label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-medium text-slate-600 transition-colors hover:bg-[var(--color-canvas-alt)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
