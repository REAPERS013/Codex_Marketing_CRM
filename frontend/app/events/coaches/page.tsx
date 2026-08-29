"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeroStats } from "@/components/hero-stats";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { getAccessToken } from "@/lib/api/client";
import {
  DEFAULT_COACHES_NEEDED,
  declareAvailability,
  fetchEventAvailabilities,
  fetchHubEvents,
  mapSuggestionToHubEvent,
  setAvailabilityStatus,
  withdrawAvailability,
} from "@/lib/api/events";
import { listUpcomingEvents } from "@/lib/api/social";
import {
  buildDemoEvent,
  useLocalAvailabilities,
} from "@/lib/data/event-coach-storage";
import { useHubData } from "@/lib/hub-provider";
import type {
  CoachAvailabilityStatus,
  EventCoachAvailability,
  EventCoachRole,
  HubEvent,
} from "@/lib/types";

const ROLES: EventCoachRole[] = ["Animation", "Accueil", "Photo/Vidéo", "Support"];

const dateFmt = new Intl.DateTimeFormat("fr-LU", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const formatDate = (iso: string) => {
  if (!iso) return "Date à confirmer";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "Date à confirmer" : dateFmt.format(parsed);
};

type Notice = { kind: "success" | "error"; text: string };

// "live"  → les routes /hub/events* répondent, tout passe par l'API.
// "local" → repli : événements lus via /hub/social/upcoming-events (déjà en
//           production) + un événement de démo, disponibilités stockées dans
//           le navigateur en attendant que Django expose le staffing.
type Source = "live" | "local";

function statusLabel(status: CoachAvailabilityStatus): string {
  if (status === "assigned") return "Assigné";
  if (status === "declined") return "Écarté";
  return "Disponible";
}

export default function EventCoachesPage() {
  const { customer } = useHubData();
  const local = useLocalAvailabilities();

  const [view, setView] = useState<"coach" | "admin">("coach");
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [remoteAvailabilities, setRemoteAvailabilities] = useState<
    EventCoachAvailability[]
  >([]);
  const [source, setSource] = useState<Source>("local");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const [coachName, setCoachName] = useState("");
  const [roleByEvent, setRoleByEvent] = useState<Record<string, EventCoachRole>>({});
  const [noteByEvent, setNoteByEvent] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  const availabilities = source === "live" ? remoteAvailabilities : local.availabilities;

  const load = useCallback(async () => {
    setLoading(true);

    async function fallback() {
      let fromSocial: HubEvent[] = [];
      try {
        const res = await listUpcomingEvents();
        fromSocial = (res.items || []).map(mapSuggestionToHubEvent);
      } catch {
        // Pas de session ou API injoignable : seul l'événement de démo reste.
      }
      setEvents([...fromSocial, buildDemoEvent()]);
      setSource("local");
    }

    if (!getAccessToken()) {
      await fallback();
      setLoading(false);
      return;
    }

    try {
      const [hubEvents, avails] = await Promise.all([
        fetchHubEvents(),
        fetchEventAvailabilities(),
      ]);
      setEvents(hubEvents);
      setRemoteAvailabilities(avails);
      setSource("live");
    } catch {
      await fallback();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCoachName((current) => current || customer.primaryContact || "");
  }, [customer.primaryContact]);

  const isMine = useCallback(
    (item: EventCoachAvailability) => {
      const email = customer.email.trim().toLowerCase();
      if (email && item.coachEmail && item.coachEmail.trim().toLowerCase() === email) {
        return true;
      }
      const name = coachName.trim().toLowerCase();
      return Boolean(name) && item.coachName.trim().toLowerCase() === name;
    },
    [customer.email, coachName],
  );

  const byEvent = useMemo(() => {
    const map = new Map<string, EventCoachAvailability[]>();
    for (const item of availabilities) {
      const list = map.get(item.eventId) ?? [];
      list.push(item);
      map.set(item.eventId, list);
    }
    return map;
  }, [availabilities]);

  const sortedEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...events]
      .filter((event) => {
        if (term) {
          const haystack =
            `${event.title} ${event.eventType} ${event.location}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        if (onlyIncomplete) {
          const assigned = (byEvent.get(event.id) ?? []).filter(
            (item) => item.status === "assigned",
          ).length;
          if (assigned >= (event.coachesNeeded || DEFAULT_COACHES_NEEDED)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [events, search, onlyIncomplete, byEvent]);

  const metrics = useMemo(() => {
    let openSlots = 0;
    let fullEvents = 0;
    for (const event of events) {
      const needed = event.coachesNeeded || DEFAULT_COACHES_NEEDED;
      const assigned = (byEvent.get(event.id) ?? []).filter(
        (item) => item.status === "assigned",
      ).length;
      openSlots += Math.max(0, needed - assigned);
      if (assigned >= needed) fullEvents += 1;
    }
    const available = availabilities.filter((item) => item.status === "available").length;

    return [
      { label: "Événements reliés", value: String(events.length).padStart(2, "0") },
      { label: "Coachs en attente", value: String(available).padStart(2, "0") },
      { label: "Postes à pourvoir", value: String(openSlots).padStart(2, "0") },
      { label: "Événements complets", value: String(fullEvents).padStart(2, "0") },
    ];
  }, [events, byEvent, availabilities]);

  async function handleDeclare(event: HubEvent) {
    const name = coachName.trim();
    if (!name) {
      setNotice({
        kind: "error",
        text: "Indiquez votre nom de coach avant de vous déclarer disponible.",
      });
      return;
    }

    const role = roleByEvent[event.id] ?? "Animation";
    const note = noteByEvent[event.id]?.trim() || undefined;

    setBusyEventId(event.id);
    setNotice(null);
    try {
      if (source === "live" && !event.isDemo) {
        const item = await declareAvailability(event.id, { role, note });
        setRemoteAvailabilities((prev) => [
          ...prev.filter((existing) => existing.id !== item.id),
          item,
        ]);
      } else {
        local.declare({
          eventId: event.id,
          coachName: name,
          coachEmail: customer.email || null,
          role,
          note,
        });
      }
      setNotice({
        kind: "success",
        text: `Disponibilité enregistrée sur « ${event.title} » en ${role}.`,
      });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Impossible d'enregistrer la disponibilité.",
      });
    } finally {
      setBusyEventId(null);
    }
  }

  async function handleWithdraw(event: HubEvent, mine: EventCoachAvailability) {
    setBusyEventId(event.id);
    setNotice(null);
    try {
      if (source === "live" && !event.isDemo) {
        await withdrawAvailability(event.id);
        setRemoteAvailabilities((prev) => prev.filter((item) => item.id !== mine.id));
      } else {
        local.withdraw(event.id, mine.coachName);
      }
      setNotice({
        kind: "success",
        text: `Disponibilité retirée de « ${event.title} ».`,
      });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Impossible de retirer la disponibilité.",
      });
    } finally {
      setBusyEventId(null);
    }
  }

  async function handleStatus(
    event: HubEvent,
    item: EventCoachAvailability,
    status: CoachAvailabilityStatus,
  ) {
    setBusyEventId(event.id);
    setNotice(null);
    try {
      if (source === "live" && !event.isDemo) {
        const updated = await setAvailabilityStatus(event.id, item.id, status);
        setRemoteAvailabilities((prev) =>
          prev.map((existing) => (existing.id === updated.id ? updated : existing)),
        );
      } else {
        local.setStatus(item.id, status);
      }
      setNotice({
        kind: "success",
        text:
          status === "assigned"
            ? `${item.coachName} est ajouté à « ${event.title} ».`
            : status === "declined"
            ? `${item.coachName} est écarté de « ${event.title} ».`
            : `${item.coachName} repasse en simple disponibilité.`,
      });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Impossible de mettre à jour l'affectation.",
      });
    } finally {
      setBusyEventId(null);
    }
  }

  return (
    <main className="page">
      <StatusBanner />
      <SectionHeader
        eyebrow="🎟️ Événements & Billetterie"
        title="Événements & disponibilités coachs"
        description="Les événements publiés sur crush.lu remontent ici. Chaque coach s'y déclare disponible, l'admin confirme l'affectation et le coach est ajouté à l'événement."
      />

      <HeroStats metrics={metrics} />

      {source === "local" ? (
        <div className="status-banner warning">
          Mode local — les routes <code>/hub/events*</code> ne répondent pas encore.
          Les événements affichés proviennent du flux crush.lu déjà branché, complétés
          par un événement de démonstration, et les disponibilités sont enregistrées
          dans ce navigateur uniquement.
        </div>
      ) : null}

      {notice ? (
        <div
          className={`status-banner ${notice.kind === "error" ? "warning" : "success"}`}
        >
          {notice.kind === "error" ? "⚠️ " : "✅ "}
          {notice.text}
        </div>
      ) : null}

      <div className="staffing-toolbar">
        <div className="view-switch" role="tablist" aria-label="Vue">
          <button
            type="button"
            role="tab"
            aria-selected={view === "coach"}
            className={view === "coach" ? "active" : ""}
            onClick={() => setView("coach")}
          >
            🙋 Vue coach
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "admin"}
            className={view === "admin" ? "active" : ""}
            onClick={() => setView("admin")}
          >
            🧭 Vue admin
          </button>
        </div>

        <input
          type="search"
          className="search-input"
          placeholder="Rechercher un événement, un type, un lieu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="staffing-filter">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          <span>Seulement les événements incomplets</span>
        </label>
      </div>

      {view === "coach" ? (
        <Panel
          title="Mon identité coach"
          description="Le nom utilisé pour vous inscrire sur les événements. Il est pré-rempli avec votre profil Crush.lu quand la session est active."
        >
          <div className="coach-identity">
            <label className="devlog-field">
              <span>Nom du coach</span>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                placeholder="Prénom Nom"
              />
            </label>
            <div className="coach-identity-meta">
              <strong>{customer.email || "Aucun email de session"}</strong>
              <span>
                {customer.organization
                  ? customer.organization
                  : "Connectez-vous via Crush.lu pour lier vos disponibilités à votre compte."}
              </span>
            </div>
          </div>
        </Panel>
      ) : null}

      {loading ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          Chargement des événements reliés au hub...
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          Aucun événement ne correspond à ce filtre.
        </div>
      ) : view === "coach" ? (
        <div className="event-grid">
          {sortedEvents.map((event) => {
            const needed = event.coachesNeeded || DEFAULT_COACHES_NEEDED;
            const list = byEvent.get(event.id) ?? [];
            const assigned = list.filter((item) => item.status === "assigned");
            const waiting = list.filter((item) => item.status === "available");
            const mine = list.find((item) => isMine(item) && item.status !== "declined");
            const busy = busyEventId === event.id;

            return (
              <article key={event.id} className="event-card">
                <div className="event-card-media">
                  {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      width={640}
                      height={160}
                      unoptimized
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="event-card-media-fallback">🎟️</span>
                  )}
                  {event.isDemo ? <span className="demo-badge">Démo</span> : null}
                </div>

                <div className="event-card-body">
                  <div className="event-card-head">
                    <h3>{event.title}</h3>
                    <span className="pill">{event.eventType || "Événement"}</span>
                  </div>

                  <div className="event-meta">
                    <span>🗓️ {formatDate(event.dateTime)}</span>
                    <span>📍 {event.location || "Lieu à confirmer"}</span>
                  </div>

                  <div className="staffing-bar" aria-hidden="true">
                    <div
                      className="staffing-bar-fill"
                      style={{
                        width: `${Math.min(100, (assigned.length / Math.max(1, needed)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="staffing-legend">
                    <strong>
                      Coachs confirmés : {assigned.length}/{needed}
                    </strong>
                    <span>
                      {waiting.length} en attente de validation
                    </span>
                  </div>

                  {assigned.length > 0 ? (
                    <div className="coach-chips">
                      {assigned.map((item) => (
                        <span key={item.id} className="coach-chip assigned">
                          ✅ {item.coachName} · {item.role}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {mine ? (
                    <div className="event-card-actions">
                      <span
                        className={`avail-pill ${mine.status === "assigned" ? "assigned" : "available"}`}
                      >
                        {mine.status === "assigned"
                          ? `✅ Vous êtes sur l'événement (${mine.role})`
                          : `⏳ Disponibilité envoyée (${mine.role})`}
                      </span>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void handleWithdraw(event, mine)}
                      >
                        {busy ? "..." : "Retirer ma disponibilité"}
                      </button>
                    </div>
                  ) : (
                    <div className="event-card-form">
                      <label className="devlog-field">
                        <span>Rôle souhaité</span>
                        <select
                          value={roleByEvent[event.id] ?? "Animation"}
                          onChange={(e) =>
                            setRoleByEvent((prev) => ({
                              ...prev,
                              [event.id]: e.target.value as EventCoachRole,
                            }))
                          }
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="devlog-field">
                        <span>Note (optionnel)</span>
                        <input
                          type="text"
                          placeholder="Ex : disponible à partir de 19h"
                          value={noteByEvent[event.id] ?? ""}
                          onChange={(e) =>
                            setNoteByEvent((prev) => ({
                              ...prev,
                              [event.id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="button"
                        disabled={busy}
                        onClick={() => void handleDeclare(event)}
                      >
                        {busy ? "Envoi..." : "🙋 Je suis disponible"}
                      </button>
                    </div>
                  )}

                  {event.eventUrl ? (
                    <a
                      className="event-card-link"
                      href={event.eventUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir la fiche sur crush.lu ↗
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="staffing-list">
          {sortedEvents.map((event) => {
            const needed = event.coachesNeeded || DEFAULT_COACHES_NEEDED;
            const list = byEvent.get(event.id) ?? [];
            const assigned = list.filter((item) => item.status === "assigned");
            const busy = busyEventId === event.id;

            return (
              <Panel
                key={event.id}
                title={`${event.title}${event.isDemo ? " · Démo" : ""}`}
                description={`${formatDate(event.dateTime)} · ${
                  event.location || "Lieu à confirmer"
                } · ${assigned.length}/${needed} coach(s) confirmé(s)`}
              >
                {list.length === 0 ? (
                  <div style={{ padding: "1.2rem", textAlign: "center", color: "var(--muted)" }}>
                    Aucun coach ne s'est encore déclaré disponible sur cet événement.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Coach</th>
                          <th>Rôle</th>
                          <th>Note</th>
                          <th>Déclaré le</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.coachName}</strong>
                              {item.coachEmail ? (
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                  {item.coachEmail}
                                </div>
                              ) : null}
                            </td>
                            <td>{item.role}</td>
                            <td style={{ color: "var(--muted)" }}>{item.note || "—"}</td>
                            <td>{formatDate(item.declaredAt)}</td>
                            <td>
                              <span className={`avail-pill ${item.status}`}>
                                {statusLabel(item.status)}
                              </span>
                            </td>
                            <td>
                              <div className="admin-actions">
                                {item.status === "assigned" ? (
                                  <button
                                    type="button"
                                    className="button secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      void handleStatus(event, item, "available")
                                    }
                                  >
                                    Retirer de l&apos;événement
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="button"
                                    disabled={busy || assigned.length >= needed}
                                    title={
                                      assigned.length >= needed
                                        ? "Tous les postes sont déjà pourvus"
                                        : undefined
                                    }
                                    onClick={() =>
                                      void handleStatus(event, item, "assigned")
                                    }
                                  >
                                    Assigner
                                  </button>
                                )}
                                {item.status !== "declined" ? (
                                  <button
                                    type="button"
                                    className="button secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      void handleStatus(event, item, "declined")
                                    }
                                  >
                                    Écarter
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="button secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      void handleStatus(event, item, "available")
                                    }
                                  >
                                    Réactiver
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </main>
  );
}
