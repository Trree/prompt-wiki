"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Home, BookOpen, Zap, Bot, Settings, Globe, LogOut } from "lucide-react";

const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isPublicPath = pathname.startsWith("/public");
  const isAuthPath = pathname.startsWith("/auth");
  const navItems = isPublicPath
    ? [{ href: "/public", label: "Public Library", icon: Globe }]
    : NAV_ITEMS;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth");
    router.refresh();
  };

  if (!mounted || isAuthPath) {
    return null;
  }

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
      {!isPublicPath ? (
        <button className="nav-link nav-button" onClick={handleLogout} type="button">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      ) : null}
    </nav>
  );
}
