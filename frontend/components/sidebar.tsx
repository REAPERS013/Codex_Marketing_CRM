"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: "📊" },
      { href: "/planning", label: "Planning", icon: "🗓️" },
      { href: "/team", label: "Équipe", icon: "👥" },
      { href: "/requests", label: "Demandes", icon: "📋" },
    ],
  },
  {
    title: "Opérations",
    items: [
      { href: "/locations", label: "Lieux", icon: "📍" },
      { href: "/resources", label: "Ressources", icon: "📁" },
      { href: "/calculator", label: "Calculator", icon: "🎟️" },
    ],
  },
  {
    title: "Finances",
    items: [
      { href: "/accounting", label: "Comptabilité", icon: "💰" },
      { href: "/accounting?tab=payroll", label: "Salaires", icon: "💼" },
    ],
  },
  {
    title: "Compte",
    items: [
      { href: "/settings", label: "Paramètres", icon: "⚙️" },
      { href: "/legacy",   label: "Version d'origine", icon: "🕰" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div className="brand-mark">◆</div>
          <div className="brand-copy">
            <h1>Crush Hub</h1>
            <p>Espace équipe</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="nav-section">{section.title}</div>
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href.includes("?")
                    ? pathname === item.href.split("?")[0]
                    : false);
                const isLegacy = item.href === "/legacy";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link${active ? " active" : ""}`}
                    style={isLegacy ? { opacity: 0.55, fontSize: "0.85rem" } : undefined}
                  >
                    <span style={{ fontSize: isLegacy ? "0.95rem" : "1.05rem" }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="sidebar-foot">
        <strong>🔒 Session sécurisée</strong>
        <p>Identifiez-vous via Crush.lu pour synchroniser vos données.</p>
      </div>
    </aside>
  );
}
