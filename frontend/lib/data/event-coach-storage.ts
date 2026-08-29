"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_COACHES_NEEDED } from "@/lib/api/events";
import type {
  CoachAvailabilityStatus,
  EventCoachAvailability,
  EventCoachRole,
  HubEvent,
} from "@/lib/types";

// Repli navigateur utilisé tant que les routes /hub/events* ne sont pas
// exposées par Django. Rien n'est inventé côté « live » : la page signale
// explicitement qu'elle tourne en mode local et ces déclarations ne quittent
// jamais le navigateur. Une fois le backend branché, ce module devient inutile
// et peut être supprimé avec l'état `source === "local"` de la page.

const AVAILABILITY_KEY = "hub_event_coach_availability";

export const DEMO_EVENT_ID = "demo-event";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, value: T[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota atteint : on garde l'état en mémoire sans persistance.
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Événement de test : donne une carte à manipuler quand aucun événement
// crush.lu n'est joignable (session absente, API hors ligne, dev local).
// Il est marqué `isDemo` et affiché avec un badge « Démo » dans l'interface.
export function buildDemoEvent(): HubEvent {
  const start = new Date();
  start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7));
  start.setHours(19, 30, 0, 0);

  return {
    id: DEMO_EVENT_ID,
    title: "Speed Dating — Édition test",
    eventType: "Speed dating",
    dateTime: start.toISOString(),
    location: "Brasserie du Kirchberg, Luxembourg",
    imageUrl: null,
    eventUrl: "https://crush.lu/events/",
    coachesNeeded: DEFAULT_COACHES_NEEDED,
    isDemo: true,
  };
}

export function useLocalAvailabilities() {
  const [availabilities, setAvailabilities] = useState<EventCoachAvailability[]>([]);

  useEffect(() => {
    setAvailabilities(readJson<EventCoachAvailability>(AVAILABILITY_KEY));
  }, []);

  const persist = useCallback(
    (
      updater: (prev: EventCoachAvailability[]) => EventCoachAvailability[],
    ) => {
      setAvailabilities((prev) => {
        const next = updater(prev);
        writeJson(AVAILABILITY_KEY, next);
        return next;
      });
    },
    [],
  );

  const declare = useCallback(
    (input: {
      eventId: string;
      coachName: string;
      coachEmail?: string | null;
      role: EventCoachRole;
      note?: string;
    }) => {
      persist((prev) => {
        const existing = prev.find(
          (item) =>
            item.eventId === input.eventId && item.coachName === input.coachName,
        );
        if (existing) {
          return prev.map((item) =>
            item.id === existing.id
              ? { ...item, role: input.role, note: input.note }
              : item,
          );
        }
        return [
          ...prev,
          {
            id: makeId("avail"),
            eventId: input.eventId,
            coachName: input.coachName,
            coachEmail: input.coachEmail ?? null,
            role: input.role,
            status: "available" as CoachAvailabilityStatus,
            note: input.note,
            declaredAt: new Date().toISOString(),
            assignedAt: null,
          },
        ];
      });
    },
    [persist],
  );

  const withdraw = useCallback(
    (eventId: string, coachName: string) => {
      persist((prev) =>
        prev.filter(
          (item) => !(item.eventId === eventId && item.coachName === coachName),
        ),
      );
    },
    [persist],
  );

  const setStatus = useCallback(
    (availabilityId: string, status: CoachAvailabilityStatus) => {
      persist((prev) =>
        prev.map((item) =>
          item.id === availabilityId
            ? {
                ...item,
                status,
                assignedAt:
                  status === "assigned" ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
    },
    [persist],
  );

  return { availabilities, declare, withdraw, setStatus };
}
