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
      { href: "/team", label: "Équipe & Coachs", icon: "👥" },
      { href: "/requests", label: "Demandes", icon: "📋" },
    ],
  },
  {
    title: "Événements & Billetterie",
    items: [
      { href: "/events/coaches", label: "Événements & Coachs", icon: "🙋" },
      { href: "/events/cancellations", label: "Annulations & Crédits", icon: "🎟️" },
    ],
  },
  {
    title: "Opérations & CRM",
    items: [
      { href: "/locations", label: "Lieux & Salles", icon: "📍" },
      { href: "/resources", label: "Ressources", icon: "📁" },
      { href: "/whatsapp", label: "WhatsApp Support", icon: "💬" },
      { href: "/partnership-admin", label: "Partenariats", icon: "🤝" },
      { href: "/calculator", label: "Calculateur Marges", icon: "🧮" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/marketing/social", label: "Planification Réseaux", icon: "📣" },
      { href: "/marketing/publications", label: "Publications & Blog", icon: "📢" },
    ],
  },
  {
    title: "FinOps & Comptabilité",
    items: [
      { href: "/accounting", label: "Comptabilité Générale", icon: "💰" },
      { href: "/accounting?tab=payroll", label: "Salaires & Dépenses", icon: "💼" },
    ],
  },
  {
    title: "Compte & Système",
    items: [
      { href: "/settings", label: "Paramètres", icon: "⚙️" },
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
            <p>Cockpit Opérationnel</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navSections.map((section) => (
            <div key={section.title} className="nav-section-group">
              <div className="nav-section">{section.title}</div>
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href.includes("?")
                    ? pathname === item.href.split("?")[0]
                    : false);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link${active ? " active" : ""}`}
                  >
                    <span style={{ fontSize: "1.05rem" }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div>
        <Link href="/legacy" className="nav-link" style={{ marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.05rem" }}>↩</span>
          <span>Version d'origine</span>
        </Link>
        <div className="sidebar-foot">
          <strong>🔒 Session sécurisée</strong>
          <p>Identifiez-vous via Crush.lu pour synchroniser vos données.</p>
        </div>
      </div>
    </aside>
  );
}
