"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, BookOpen, Zap, Bot, Settings, Globe, LogOut, Lock } from "lucide-react";
import { OwnerTokenEntry } from "./OwnerTokenEntry";

const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks({
  hasOwnerAccess,
  ownerTokenConfigured,
}: {
  hasOwnerAccess: boolean;
  ownerTokenConfigured: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const authRequired = searchParams.get("auth") === "required";
  const nextPath = searchParams.get("next") || pathname;

  useEffect(() => {
    if (authRequired && !hasOwnerAccess) {
      setIsModalOpen(true);
    }
  }, [authRequired, hasOwnerAccess]);

  const isPublicPath = pathname.startsWith("/public");
  const navItems = hasOwnerAccess
    ? NAV_ITEMS
    : isPublicPath
      ? [{ href: "/", label: "Public Library", icon: Globe }]
      : [{ href: "/", label: "Home", icon: Home }];

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
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
        
        {hasOwnerAccess && ownerTokenConfigured ? (
          <button
            type="button"
            className="nav-link nav-button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        ) : ownerTokenConfigured ? (
          <button
            type="button"
            className="nav-link nav-button"
            onClick={() => setIsModalOpen(true)}
          >
            <Lock size={16} />
            <span>Unlock</span>
          </button>
        ) : null}
      </nav>

      <OwnerTokenEntry 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        authRequired={authRequired}
        nextPath={nextPath}
      />
    </>
  );
}
