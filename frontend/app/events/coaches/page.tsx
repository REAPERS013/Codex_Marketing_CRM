"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { HeroStats } from "@/components/hero-stats";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { getAccessToken } from "@/lib/api/client";
import {
  DEFAULT_COACHES_NEEDED,
  createHubEvent,
  declareAvailability,
  deleteHubEvent,
  fetchEventAvailabilities,
  fetchHubEvents,
  mapSuggestionToHubEvent,
  setAvailabilityStatus,
  updateHubEvent,
  withdrawAvailability,
} from "@/lib/api/events";
import { listUpcomingEvents } from "@/lib/api/social";
import {
  buildDemoEvent,
  useLocalAvailabilities,
  useLocalEvents,
} from "@/lib/data/event-coach-storage";
import { useHubData } from "@/lib/hub-provider";
import type {
  CoachAvailabilityStatus,
  EventCoachAvailability,
  EventCoachRole,
  HubEvent,
  HubEventDraft,
} from "@/lib/types";

const ROLES: EventCoachRole[] = ["Animation", "Accueil", "Photo/Vidéo", "Support"];

// Suggestions de types : le champ reste libre (datalist), rien n'est imposé.
const EVENT_TYPES = [
  "Speed dating",
  "Afterwork",
  "Atelier",
  "Soirée à thème",
  "Sortie",
  "Blind test",
];

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

// `datetime-local` travaille en heure locale sans fuseau : on convertit dans les
// deux sens plutôt que de tronquer l'ISO, sinon la saisie se décale d'un fuseau.
function toInputDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate(),
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

type EventForm = {
  title: string;
  eventType: string;
  dateTime: string;
  location: string;
  description: string;
  coachesNeeded: string;
  imageUrl: string;
  eventUrl: string;
};

const EMPTY_FORM: EventForm = {
  title: "",
  eventType: "",
  dateTime: "",
  location: "",
  description: "",
  coachesNeeded: String(DEFAULT_COACHES_NEEDED),
  imageUrl: "",
  eventUrl: "",
};

function formFromEvent(event: HubEvent): EventForm {
  return {
    title: event.title,
    eventType: event.eventType || "",
    dateTime: toInputDateTime(event.dateTime),
    location: event.location || "",
    description: event.description || "",
    coachesNeeded: String(event.coachesNeeded || DEFAULT_COACHES_NEEDED),
    imageUrl: event.imageUrl || "",
    eventUrl: event.eventUrl || "",
  };
}

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
  const localEvents = useLocalEvents();

  const [view, setView] = useState<"coach" | "admin">("coach");
  const [remoteEvents, setRemoteEvents] = useState<HubEvent[]>([]);
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

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  const availabilities = source === "live" ? remoteAvailabilities : local.availabilities;

  // En "live" le backend sert déjà les deux provenances. En "local" on assemble
  // le flux crush.lu, l'événement de démo et ce qui a été créé dans ce navigateur.
  const events = useMemo(
    () => (source === "live" ? remoteEvents : [...remoteEvents, ...localEvents.events]),
    [source, remoteEvents, localEvents.events],
  );

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
      setRemoteEvents([...fromSocial, buildDemoEvent()]);
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
      setRemoteEvents(hubEvents);
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

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setNotice(null);
  }

  function openEditForm(event: HubEvent) {
    setEditingId(event.id);
    setForm(formFromEvent(event));
    setFormOpen(true);
    setNotice(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmitEvent(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    const title = form.title.trim();
    if (!title) {
      setNotice({ kind: "error", text: "Le titre de l'événement est obligatoire." });
      return;
    }

    const parsedDate = new Date(form.dateTime);
    if (!form.dateTime || Number.isNaN(parsedDate.getTime())) {
      setNotice({ kind: "error", text: "Indiquez une date et une heure valides." });
      return;
    }

    const needed = Number.parseInt(form.coachesNeeded, 10);
    const draft: HubEventDraft = {
      title,
      eventType: form.eventType.trim() || "Événement",
      dateTime: parsedDate.toISOString(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      eventUrl: form.eventUrl.trim() || null,
      coachesNeeded:
        Number.isFinite(needed) && needed > 0 ? needed : DEFAULT_COACHES_NEEDED,
    };

    setSavingEvent(true);
    setNotice(null);
    try {
      if (source === "live") {
        if (editingId) {
          const updated = await updateHubEvent(editingId, draft);
          setRemoteEvents((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
        } else {
          const created = await createHubEvent(draft);
          setRemoteEvents((prev) => [...prev, created]);
        }
      } else if (editingId) {
        localEvents.update(editingId, draft);
      } else {
        localEvents.create(draft);
      }

      setNotice({
        kind: "success",
        text: editingId
          ? `« ${title} » a été mis à jour.`
          : `« ${title} » est créé — les coachs peuvent s'y inscrire.`,
      });
      closeForm();
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Impossible d'enregistrer l'événement.",
      });
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(event: HubEvent) {
    const confirmed = window.confirm(
      `Supprimer « ${event.title} » ? Les disponibilités déclarées dessus seront perdues.`,
    );
    if (!confirmed) return;

    setBusyEventId(event.id);
    setNotice(null);
    try {
      if (source === "live") {
        await deleteHubEvent(event.id);
        setRemoteEvents((prev) => prev.filter((item) => item.id !== event.id));
        setRemoteAvailabilities((prev) =>
          prev.filter((item) => item.eventId !== event.id),
        );
      } else {
        localEvents.remove(event.id);
        local.dropEvent(event.id);
      }
      if (editingId === event.id) closeForm();
      setNotice({ kind: "success", text: `« ${event.title} » a été supprimé.` });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Impossible de supprimer l'événement.",
      });
    } finally {
      setBusyEventId(null);
    }
  }

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
        description="Créez vos événements ici, à côté de ceux publiés sur crush.lu. Chaque coach se déclare disponible sur ceux qui l'intéressent, l'admin confirme l'affectation et le coach est ajouté à l'événement."
      />

      <HeroStats metrics={metrics} />

      {source === "local" ? (
        <div className="status-banner warning">
          Mode local — les routes <code>/hub/events*</code> ne répondent pas encore.
          Les événements affichés proviennent du flux crush.lu déjà branché, complétés
          par un événement de démonstration. Les événements que vous créez ici et les
          disponibilités déclarées sont enregistrés dans ce navigateur uniquement :
          vos coachs ne les verront pas tant que le backend n&apos;expose pas ces routes.
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

        <button
          type="button"
          className="button"
          onClick={() => (formOpen && !editingId ? closeForm() : openCreateForm())}
        >
          {formOpen && !editingId ? "Fermer" : "➕ Créer un événement"}
        </button>
      </div>

      {formOpen ? (
        <Panel
          title={editingId ? "Modifier l'événement" : "Nouvel événement"}
          description="Les coachs verront cette fiche dans la liste ci-dessous et pourront s'y inscrire."
        >
          <form className="event-form" onSubmit={(e) => void handleSubmitEvent(e)}>
            <label className="devlog-field">
              <span>Titre *</span>
              <input
                type="text"
                required
                placeholder="Ex : Speed dating 30-40 ans"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </label>

            <label className="devlog-field">
              <span>Type d&apos;événement</span>
              <input
                type="text"
                list="event-type-options"
                placeholder="Speed dating"
                value={form.eventType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, eventType: e.target.value }))
                }
              />
              <datalist id="event-type-options">
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </label>

            <label className="devlog-field">
              <span>Date et heure *</span>
              <input
                type="datetime-local"
                required
                value={form.dateTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dateTime: e.target.value }))
                }
              />
            </label>

            <label className="devlog-field">
              <span>Lieu</span>
              <input
                type="text"
                placeholder="Ex : Brasserie du Kirchberg, Luxembourg"
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </label>

            <label className="devlog-field">
              <span>Coachs nécessaires</span>
              <input
                type="number"
                min={1}
                max={20}
                value={form.coachesNeeded}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, coachesNeeded: e.target.value }))
                }
              />
            </label>

            <label className="devlog-field">
              <span>Lien de la fiche (optionnel)</span>
              <input
                type="url"
                placeholder="https://crush.lu/events/..."
                value={form.eventUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, eventUrl: e.target.value }))
                }
              />
            </label>

            <label className="devlog-field">
              <span>Image de couverture (optionnel)</span>
              <input
                type="url"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
              />
            </label>

            <label className="devlog-field event-form-wide">
              <span>Brief pour les coachs (optionnel)</span>
              <textarea
                rows={3}
                placeholder="Déroulé, matériel à prévoir, heure d'arrivée..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </label>

            <div className="event-form-actions">
              <button type="submit" className="button" disabled={savingEvent}>
                {savingEvent
                  ? "Enregistrement..."
                  : editingId
                  ? "Enregistrer les modifications"
                  : "Créer l'événement"}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={closeForm}
                disabled={savingEvent}
              >
                Annuler
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

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
          {events.length === 0
            ? "Aucun événement pour l'instant — créez le premier avec « ➕ Créer un événement »."
            : "Aucun événement ne correspond à ce filtre."}
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
                  <div className="event-card-badges">
                    {event.origin === "hub" ? (
                      <span className="origin-badge hub">Créé au hub</span>
                    ) : null}
                    {event.isDemo ? (
                      <span className="origin-badge demo">Démo</span>
                    ) : null}
                  </div>
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

                  {event.description ? (
                    <p className="event-card-description">{event.description}</p>
                  ) : null}

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

                  {event.origin === "hub" ? (
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() => openEditForm(event)}
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void handleDeleteEvent(event)}
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
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
                title={`${event.title}${event.isDemo ? " · Démo" : ""}${
                  event.origin === "hub" ? " · Créé au hub" : ""
                }`}
                description={`${formatDate(event.dateTime)} · ${
                  event.location || "Lieu à confirmer"
                } · ${assigned.length}/${needed} coach(s) confirmé(s)`}
              >
                {event.origin === "hub" ? (
                  <div className="admin-actions event-owner-actions">
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() => openEditForm(event)}
                    >
                      ✏️ Modifier l&apos;événement
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() => void handleDeleteEvent(event)}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                ) : null}

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
