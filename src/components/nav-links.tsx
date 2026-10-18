"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Assistant" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/tickets", label: "Tickets" },
  { href: "/calculator", label: "Calculator" },
];

const linkClass =
  "rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 aria-[current=page]:bg-zinc-900 aria-[current=page]:text-white dark:text-zinc-400 dark:hover:bg-zinc-800 dark:aria-[current=page]:bg-zinc-100 dark:aria-[current=page]:text-zinc-900";

function Nav({ isCurrent }: { isCurrent: (href: string) => boolean }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 text-sm whitespace-nowrap">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={isCurrent(href) ? "page" : undefined} className={linkClass}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Shown while the current page address loads (pages with an id in the address). */
export function NavLinksPlain() {
  return <Nav isCurrent={() => false} />;
}

export default function NavLinks() {
  const pathname = usePathname();
  return <Nav isCurrent={(href) => (href === "/" ? pathname === "/" : pathname.startsWith(href))} />;
}
