"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboards" },
  { href: "/template", label: "Client Template" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/dashboard/");
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-neutral-800 px-6 py-3 flex items-center gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
            isActive(pathname, l.href)
              ? "bg-neutral-800 text-white font-medium"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
