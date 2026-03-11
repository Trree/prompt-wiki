"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Home, BookOpen, Zap, Bot, Settings, Globe } from "lucide-react";

const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();
  const isPublicPath = pathname.startsWith("/public");
  const navItems = isPublicPath
    ? [{ href: "/public", label: "Public Library", icon: Globe }]
    : NAV_ITEMS;

  return (
    <nav className="nav">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href as Route}
            className={`nav-link ${isActive ? "active" : ""}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
