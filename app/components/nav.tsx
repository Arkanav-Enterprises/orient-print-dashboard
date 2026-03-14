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
    <nav className="border-b border-[rgba(237,236,236,0.08)] px-6 py-3 flex items-center gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
            isActive(pathname, l.href)
              ? "bg-[rgba(237,236,236,0.08)] text-[#edecec] font-medium"
              : "text-[rgba(237,236,236,0.4)] hover:text-[rgba(237,236,236,0.7)]"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
