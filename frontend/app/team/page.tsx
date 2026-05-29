"use client";

import { SectionHeader } from "@/components/section-header";

type TeamMember = {
  name: string;
  role: string;
  initial: string;
  gradient: string;
  events: number | string;
  presence: string;
};

const MEMBERS: TeamMember[] = [
  { name: "Sébastien", role: "Fondateur · CEO",      initial: "S", gradient: "linear-gradient(135deg, #6366f1, #ec4899)", events: 14,  presence: "92%" },
  { name: "Wesley",    role: "Co-fondateur · COO",   initial: "W", gradient: "linear-gradient(135deg, #ec4899, #f43f5e)", events: 11,  presence: "88%" },
  { name: "Claire",    role: "Comptable",             initial: "C", gradient: "linear-gradient(135deg, #10b981, #06b6d4)", events: "—", presence: "100%" },
  { name: "Marie",     role: "Employée · Events",    initial: "M", gradient: "linear-gradient(135deg, #f59e0b, #ec4899)", events: 9,   presence: "96%" },
  { name: "Julien",    role: "Employé · Logistique", initial: "J", gradient: "linear-gradient(135deg, #06b6d4, #6366f1)", events: 12,  presence: "94%" },
];

export default function TeamPage() {
  return (
    <main className="page">
      <SectionHeader
        eyebrow="Hub · Pilotage"
        title="Équipe."
        description="Annuaire de l'équipe Crush.lu — rôles, présence et statistiques par membre."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {MEMBERS.map((m) => (
          <div
            key={m.name}
            style={{
              background: "var(--surface-solid, rgba(245,249,255,0.88))",
              border: "1px solid var(--line)",
              borderRadius: 18,
              padding: "1.2rem 1rem",
              textAlign: "center",
              transition: "border-color 180ms",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: m.gradient,
                color: "white",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 0.75rem",
                fontWeight: 700,
                fontSize: "1.4rem",
              }}
            >
              {m.initial}
            </div>
            <strong style={{ fontSize: "0.95rem" }}>{m.name}</strong>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "0.2rem" }}>
              {m.role}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                marginTop: "0.9rem",
              }}
            >
              <div
                style={{
                  background: "var(--glass, rgba(255,255,255,0.5))",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "0.5rem",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{m.events}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.08rem" }}>
                  Events
                </div>
              </div>
              <div
                style={{
                  background: "var(--glass, rgba(255,255,255,0.5))",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "0.5rem",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{m.presence}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.08rem" }}>
                  Présence
                </div>
              </div>
            </div>
          </div>
        ))}

        <div
          style={{
            background: "var(--surface-solid, rgba(245,249,255,0.88))",
            border: "1px dashed var(--line-strong, rgba(255,255,255,0.14))",
            borderRadius: 18,
            padding: "1.2rem 1rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 180,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--glass, rgba(255,255,255,0.3))",
              color: "var(--muted)",
              display: "grid",
              placeItems: "center",
              marginBottom: "0.6rem",
              fontSize: "1.5rem",
            }}
          >
            +
          </div>
          <strong style={{ fontSize: "0.9rem" }}>Inviter un membre</strong>
          <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
            Email · Crush.lu
          </div>
        </div>
      </div>
    </main>
  );
}
