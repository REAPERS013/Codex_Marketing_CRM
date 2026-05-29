"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBanner } from "@/components/status-banner";
import { useHubData } from "@/lib/hub-provider";

type RoleKey = "founder" | "cofounder" | "accountant" | "employee";

const ROLE_META: Record<RoleKey, { greeting: string; badge: string; showRevenue: boolean }> = {
  founder:    { greeting: "Bonsoir, Sébastien.",  badge: "🌟 Fondateur · Accès complet",    showRevenue: true  },
  cofounder:  { greeting: "Bonsoir, Wesley.",     badge: "✨ Co-fondateur · Accès complet", showRevenue: true  },
  accountant: { greeting: "Bonjour, Claire.",     badge: "📊 Comptable · Finances",         showRevenue: true  },
  employee:   { greeting: "Bonsoir, Julien.",     badge: "👤 Employé · Mon espace",         showRevenue: false },
};

const UPCOMING_EVENTS = [
  { day: "30", month: "Mai",  name: "Wine tasting",     sub: "La Cave · 19:00 · 3 membres",   guests: "24 invités" },
  { day: "02", month: "Juin", name: "Cooking workshop", sub: "Atelier · 18:30 · 2 membres",   guests: "18 invités" },
  { day: "07", month: "Juin", name: "Speed dating",     sub: "Le Loft · 20:00 · 4 membres",   guests: "32 invités" },
];

const ACTIVITY = [
  { dot: "",      text: "<strong>Julien</strong> s'est positionné sur Wine tasting (30/05)", time: "12m" },
  { dot: "green", text: "Facture payée — <strong>ACME · €1 240</strong>",                   time: "1h"  },
  { dot: "amber", text: "<strong>Marie</strong> a soumis sa disponibilité juin",             time: "3h"  },
  { dot: "rose",  text: "Salaires Mai validés par le comptable",                             time: "hier" },
];

export default function DashboardPage() {
  const { requests } = useHubData();
  const [role, setRole] = useState<RoleKey>("founder");

  useEffect(() => {
    const stored = window.localStorage.getItem("crush_dev_role");
    if (stored && stored in ROLE_META) setRole(stored as RoleKey);
  }, []);

  const meta = ROLE_META[role];
  const activeRequests = requests.length > 0 ? requests.length : 12;
  const highPriority = requests.filter((r) => r.priority === "High");

  return (
    <main className="page">
      <StatusBanner />

      <div className="bento-grid">
        {/* Welcome */}
        <div className="bento-card bento-4" style={{ background: "var(--surface-solid, #f0f7ff)" }}>
          <div className="bento-card-label">Bienvenue</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{meta.greeting}</div>
          <div style={{ color: "var(--muted)", fontSize: "0.84rem", marginTop: "0.18rem" }}>
            Dernière connexion il y a 2h.
          </div>
          <span className="role-badge">{meta.badge}</span>
        </div>

        {/* Requests */}
        <div className="bento-card bento-4">
          <div className="bento-card-label">Demandes en cours</div>
          <div className="bento-big-num">{activeRequests}</div>
          <div className="bento-trend">▲ +3 cette semaine</div>
          <svg className="bento-sparkline" viewBox="0 0 200 42" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sg-req" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,38 L25,30 L50,34 L75,20 L100,26 L125,16 L150,22 L175,10 L200,14 L200,42 L0,42 Z" fill="url(#sg-req)" />
            <path d="M0,38 L25,30 L50,34 L75,20 L100,26 L125,16 L150,22 L175,10 L200,14" stroke="#818cf8" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Revenue (role-gated) */}
        {meta.showRevenue ? (
          <div className="bento-card bento-4">
            <div className="bento-card-label">Chiffre d&apos;affaires ce mois</div>
            <div className="bento-big-num">€12 480</div>
            <div className="bento-trend">▲ +18% vs mois dernier</div>
            <svg className="bento-sparkline" viewBox="0 0 200 42" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sg-rev" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,32 L25,28 L50,35 L75,24 L100,20 L125,22 L150,11 L175,15 L200,5 L200,42 L0,42 Z" fill="url(#sg-rev)" />
              <path d="M0,32 L25,28 L50,35 L75,24 L100,20 L125,22 L150,11 L175,15 L200,5" stroke="#10b981" strokeWidth="2" fill="none" />
            </svg>
          </div>
        ) : (
          <div className="bento-card bento-4">
            <div className="bento-card-label">Prochains shifts</div>
            <div className="bento-big-num">3</div>
            <div className="bento-trend">cette semaine</div>
          </div>
        )}

        {/* Quick access */}
        <div className="bento-card bento-12">
          <div className="bento-card-head">
            <h3 className="bento-card-title">Accès rapide</h3>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Modules · adaptés à votre poste</span>
          </div>
          <div className="quick-grid">
            {[
              { key: "dashboard",  ico: "📊", label: "Tableau de bord", href: "/dashboard" },
              { key: "planning",   ico: "🗓️", label: "Planning",         href: "/planning"  },
              { key: "team",       ico: "👥", label: "Équipe",            href: "/team"      },
              { key: "requests",   ico: "📋", label: "Demandes",          href: "/requests"  },
              { key: "locations",  ico: "📍", label: "Lieux",             href: "/locations" },
              { key: "accounting", ico: "💰", label: "Comptabilité",      href: "/accounting" },
              { key: "payroll",    ico: "💼", label: "Salaires",          href: "/accounting" },
              { key: "calculator", ico: "🎟️", label: "Calculator",        href: "/calculator" },
              { key: "settings",   ico: "⚙️", label: "Paramètres",        href: "/settings"  },
            ].map((tile) => (
              <Link key={tile.key} href={tile.href} className="quick-tile">
                <span className="quick-tile-ico">{tile.ico}</span>
                <span className="quick-tile-lbl">{tile.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bento-card bento-6">
          <div className="bento-card-head">
            <h3 className="bento-card-title">📅 Prochains événements</h3>
            <a href="/planning" className="bento-card-link">Planning complet →</a>
          </div>
          <div className="event-feed">
            {UPCOMING_EVENTS.map((ev) => (
              <div key={ev.name} className="event-row">
                <div className="event-date">
                  <div className="event-date-day">{ev.day}</div>
                  <div className="event-date-mon">{ev.month}</div>
                </div>
                <div>
                  <div className="event-name">{ev.name}</div>
                  <div className="event-sub">{ev.sub}</div>
                </div>
                <div className="event-guests">{ev.guests}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bento-card bento-6">
          <div className="bento-card-head">
            <h3 className="bento-card-title">⚡ Activité récente</h3>
            <a href="/requests" className="bento-card-link">Tout voir →</a>
          </div>
          <div className="activity-feed">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="activity-row">
                <span className={`activity-dot${a.dot ? ` ${a.dot}` : ""}`} />
                <span dangerouslySetInnerHTML={{ __html: a.text }} />
                <span className="activity-time">il y a {a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority items */}
        <div className="bento-card bento-12">
          <div className="bento-card-head">
            <h3 className="bento-card-title">🎯 À traiter en priorité</h3>
            <a href="/requests" className="bento-card-link">Tout voir →</a>
          </div>
          <div className="priority-feed">
            {highPriority.length > 0 ? highPriority.slice(0, 3).map((item) => (
              <div key={item.id} className="priority-row">
                <span className="priority-id">{item.id}</span>
                <span>{item.subject}</span>
                <span className="pill high">Urgent</span>
                <span className="priority-age">—</span>
              </div>
            )) : (
              <>
                <div className="priority-row">
                  <span className="priority-id">#REQ-042</span>
                  <span>Valider le catering pour l&apos;événement du 30/05</span>
                  <span className="pill high">Urgent</span>
                  <span className="priority-age">2 jours</span>
                </div>
                <div className="priority-row">
                  <span className="priority-id">#REQ-039</span>
                  <span>Confirmer la venue pour Speed Dating du 07/06</span>
                  <span className="pill high">Urgent</span>
                  <span className="priority-age">5 jours</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
