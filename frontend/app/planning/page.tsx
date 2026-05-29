"use client";

import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { HeroStats } from "@/components/hero-stats";

const DAYS = [
  { label: "Lun 26", today: false, shifts: [{ type: "off",   who: "Off",              info: "Repos équipe" }] },
  { label: "Mar 27", today: false, shifts: [{ type: "work",  who: "Marie",            info: "14h–18h · Prépa" }] },
  {
    label: "Mer 28", today: false,
    shifts: [
      { type: "work", who: "Julien", info: "10h–17h · Office" },
      { type: "free", who: "Claire", info: "10h–14h · Compta" },
    ],
  },
  {
    label: "Jeu 29 · Aujourd'hui", today: true,
    shifts: [
      { type: "work", who: "Marie",  info: "14h–22h · Briefing" },
      { type: "work", who: "Julien", info: "16h–22h · Logistique" },
    ],
  },
  {
    label: "Ven 30", today: false,
    shifts: [
      { type: "event", who: "🍷 Wine tasting",      info: "19h–23h · La Cave" },
      { type: "work",  who: "Sébastien · Wesley",   info: "19h–23h" },
    ],
  },
  { label: "Sam 31", today: false, shifts: [{ type: "off", who: "—",   info: "Aucun shift" }] },
  { label: "Dim 1",  today: false, shifts: [{ type: "off", who: "Off", info: "Repos équipe" }] },
];

const shiftStyle: Record<string, React.CSSProperties> = {
  work:  { background: "rgba(99,102,241,0.18)", borderColor: "rgba(99,102,241,0.4)" },
  free:  { background: "rgba(16,185,129,0.15)",  borderColor: "rgba(16,185,129,0.35)" },
  off:   { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "var(--muted)" },
  event: { background: "rgba(244,63,94,0.15)",   borderColor: "rgba(244,63,94,0.4)" },
};

const UPCOMING = [
  { day: "30", month: "Mai",  name: "Wine tasting",     sub: "La Cave · 19:00 · 3 membres",   time: "19:00–23:00", status: "Confirmé",  cls: "p-act" },
  { day: "02", month: "Juin", name: "Cooking workshop", sub: "Atelier · 18:30 · 2 membres",   time: "18:30–22:00", status: "En attente", cls: "p-pend" },
  { day: "07", month: "Juin", name: "Speed dating",     sub: "Le Loft · 20:00 · 4 membres",   time: "20:00–00:00", status: "Confirmé",  cls: "p-act" },
];

const DISPO = [
  { who: "Julien", text: "Disponible juin, sauf 15–22",           status: "À valider", cls: "p-pend" },
  { who: "Marie",  text: "Disponible — toutes les dates proposées", status: "Validé",    cls: "p-paid" },
  { who: "Lucas",  text: "Indisponible 1–14 juin (vacances)",      status: "À valider", cls: "p-pend" },
];

export default function PlanningPage() {
  const metrics = [
    { label: "Événements ce mois", value: "08" },
    { label: "Membres mobilisés",  value: "06" },
    { label: "Dispos en attente",  value: "03" },
  ];

  return (
    <main className="page">
      <SectionHeader
        eyebrow="Hub · Pilotage"
        title="Planning."
        description="Shifts hebdomadaires, congés et soumission de disponibilités de l'équipe."
      />

      <HeroStats metrics={metrics} />

      {/* Weekly calendar */}
      <Panel title="Semaine du 26 mai au 1er juin" description="Visualise les shifts et événements de la semaine.">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.5rem",
            marginTop: "0.4rem",
          }}
        >
          {DAYS.map((day) => (
            <div
              key={day.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "0.6rem 0.5rem",
                minHeight: 140,
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  color: day.today ? "#818cf8" : "var(--muted)",
                  marginBottom: "0.4rem",
                  paddingBottom: "0.3rem",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {day.label}
              </div>
              {day.shifts.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.4rem 0.55rem",
                    border: "1px solid",
                    borderRadius: 8,
                    fontSize: "0.74rem",
                    marginTop: "0.35rem",
                    ...shiftStyle[s.type],
                  }}
                >
                  <strong style={{ display: "block", fontSize: "0.78rem" }}>{s.who}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>{s.info}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <div className="two-up">
        {/* Upcoming events */}
        <Panel title="📅 Prochains événements" description="Shifts confirmés et en attente de validation.">
          <div className="shift-feed">
            {UPCOMING.map((ev) => (
              <div key={ev.name} className="shift-row">
                <div className="shift-date">
                  <div className="shift-date-num">{ev.day}</div>
                  <div className="shift-date-day">{ev.month}</div>
                </div>
                <div>
                  <div className="shift-name">{ev.name}</div>
                  <div className="shift-sub">{ev.sub}</div>
                </div>
                <div className="shift-time">{ev.time}</div>
                <span className={`pill ${ev.cls}`}>{ev.status}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Availability */}
        <Panel title="✋ Disponibilités en attente" description="À valider ou refuser avant la prochaine attribution.">
          <div className="priority-feed">
            {DISPO.map((d) => (
              <div
                key={d.who}
                className="priority-row"
                style={{ gridTemplateColumns: "80px 1fr auto" }}
              >
                <span className="priority-id">{d.who}</span>
                <span>{d.text}</span>
                <span className={`pill ${d.cls}`}>{d.status}</span>
              </div>
            ))}
          </div>
          <button type="button" className="button" style={{ marginTop: "1rem", width: "100%" }}>
            Soumettre mes disponibilités
          </button>
        </Panel>
      </div>
    </main>
  );
}
