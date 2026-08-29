import { apiDelete, apiGet, apiPatch, apiPost, getAccessToken } from "@/lib/api/client";
import {
  EventAvailabilitiesResponse,
  EventAvailabilityResponse,
  EventCancellationDetailResponse,
  EventCancellationsResponse,
  HubEventResponse,
  HubEventsResponse,
} from "@/lib/api/contracts";
import {
  CoachAvailabilityStatus,
  EventCancellationRegistration,
  EventCancellationSummary,
  EventCoachAvailability,
  EventCoachRole,
  HubEvent,
  HubEventDraft,
  SocialEventSuggestion,
} from "@/lib/types";

export async function fetchCancelledEvents(): Promise<EventCancellationSummary[]> {
  if (!getAccessToken()) return [];
  const res = await apiGet<EventCancellationsResponse>("/hub/events/cancelled");
  return res.items || [];
}

export async function fetchEventCancellationDetail(
  eventId: string | number,
): Promise<{
  event: EventCancellationSummary;
  registrations: EventCancellationRegistration[];
} | null> {
  if (!getAccessToken()) return null;
  const res = await apiGet<EventCancellationDetailResponse>(
    `/hub/events/${eventId}/cancellation`,
  );
  return {
    event: res.event,
    registrations: res.items || [],
  };
}

// ---------------------------------------------------------------------------
// Staffing des événements (coachs disponibles / assignés)
//
// Contrat attendu côté Django — routes à exposer sur l'API host, sans préfixe
// /api/ (cf. CLAUDE.md « API host convention ») :
//
//   GET    /hub/events
//          → { items: HubEvent[] }  — événements à venir : ceux publiés sur
//            crush.lu (origin "crush") et ceux créés depuis le hub ("hub").
//   POST   /hub/events                body HubEventDraft
//          → { item: HubEvent }  — création d'un événement interne au hub.
//   PATCH  /hub/events/:eventId       body Partial<HubEventDraft>
//          → { item: HubEvent }  — édition d'un événement créé dans le hub.
//   DELETE /hub/events/:eventId
//          → 204  — suppression d'un événement créé dans le hub, avec ses
//            disponibilités. Les événements crush.lu ne sont pas supprimables ici.
//   GET    /hub/events/availabilities
//          → { items: EventCoachAvailability[] }  — toutes déclarations, tous events.
//   POST   /hub/events/:eventId/availability   body { role, note? }
//          → { item: EventCoachAvailability }  — le coach connecté se déclare dispo.
//   DELETE /hub/events/:eventId/availability
//          → 204  — le coach connecté retire sa disponibilité.
//   PATCH  /hub/events/:eventId/availability/:availabilityId  body { status }
//          → { item: EventCoachAvailability }  — l'admin assigne / désassigne.
//          `status: "assigned"` est ce qui ajoute réellement le coach à l'événement.
//
// Tant que ces routes n'existent pas, /events/coaches bascule en mode local :
// les événements viennent de /hub/social/upcoming-events (déjà en production)
// et les disponibilités sont stockées dans le navigateur. Aucune donnée n'est
// inventée côté « live ».
// ---------------------------------------------------------------------------

export async function fetchHubEvents(): Promise<HubEvent[]> {
  if (!getAccessToken()) return [];
  const res = await apiGet<HubEventsResponse>("/hub/events");
  return res.items || [];
}

export async function createHubEvent(draft: HubEventDraft): Promise<HubEvent> {
  const res = await apiPost<HubEventResponse>("/hub/events", draft);
  return res.item;
}

export async function updateHubEvent(
  eventId: string,
  draft: Partial<HubEventDraft>,
): Promise<HubEvent> {
  const res = await apiPatch<HubEventResponse>(`/hub/events/${eventId}`, draft);
  return res.item;
}

export async function deleteHubEvent(eventId: string): Promise<void> {
  await apiDelete<void>(`/hub/events/${eventId}`);
}

export async function fetchEventAvailabilities(): Promise<EventCoachAvailability[]> {
  if (!getAccessToken()) return [];
  const res = await apiGet<EventAvailabilitiesResponse>("/hub/events/availabilities");
  return res.items || [];
}

export async function declareAvailability(
  eventId: string,
  payload: { role: EventCoachRole; note?: string },
): Promise<EventCoachAvailability> {
  const res = await apiPost<EventAvailabilityResponse>(
    `/hub/events/${eventId}/availability`,
    payload,
  );
  return res.item;
}

export async function withdrawAvailability(eventId: string): Promise<void> {
  await apiDelete<void>(`/hub/events/${eventId}/availability`);
}

export async function setAvailabilityStatus(
  eventId: string,
  availabilityId: string,
  status: CoachAvailabilityStatus,
): Promise<EventCoachAvailability> {
  const res = await apiPatch<EventAvailabilityResponse>(
    `/hub/events/${eventId}/availability/${availabilityId}`,
    { status },
  );
  return res.item;
}

// Repli de lecture : /hub/social/upcoming-events sert déjà les événements
// crush.lu au planificateur social. On réutilise cette source pour afficher
// les vrais événements reliés au hub avant que /hub/events n'existe.
export function mapSuggestionToHubEvent(
  suggestion: SocialEventSuggestion,
): HubEvent {
  return {
    id: suggestion.id,
    title: suggestion.title,
    eventType: suggestion.event_type,
    dateTime: suggestion.date,
    location: suggestion.location,
    imageUrl: suggestion.image_url || null,
    eventUrl: suggestion.event_url || null,
    coachesNeeded: DEFAULT_COACHES_NEEDED,
    origin: "crush",
  };
}

// Valeur d'affichage tant que Django ne renvoie pas de besoin par événement.
export const DEFAULT_COACHES_NEEDED = 2;
