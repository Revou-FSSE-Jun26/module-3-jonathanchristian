import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/orders", label: "Orders" },
] as const;

const SOCIAL_LINKS = [
  {
    href: "https://github.com",
    label: "GitHub",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com",
    label: "LinkedIn",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
      </svg>
    ),
  },
] as const;

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-hairline)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-8 sm:flex-row sm:items-start">
        {/* Left area: brand, nav, copyright */}
        <div className="flex flex-col items-start gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="KINETIC logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg"
            />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              KINETIC
            </span>
          </Link>

          <nav className="flex gap-6 text-sm text-slate-500">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[var(--color-brand)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-sm text-slate-400">&copy; KINETIC 2026</p>
        </div>

        {/* Right area: social links */}
        <div className="flex items-center gap-3 sm:self-start">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-hairline)] text-slate-500 transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
