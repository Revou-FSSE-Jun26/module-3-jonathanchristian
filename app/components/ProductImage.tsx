import type { Product } from "@/lib/types";

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-slate-600 to-slate-800",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export interface ProductImageProps {
  product: Pick<Product, "name">;
  className?: string;
  textClassName?: string;
}

export default function ProductImage({
  product,
  className = "h-44 w-full",
  textClassName = "text-4xl",
}: ProductImageProps) {
  const gradient = GRADIENTS[hashString(product.name) % GRADIENTS.length];
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
      role="img"
      aria-label={`${product.name} image placeholder`}
    >
      <span className={`font-bold tracking-tight text-white/95 ${textClassName}`}>
        {initials(product.name)}
      </span>
    </div>
  );
}
