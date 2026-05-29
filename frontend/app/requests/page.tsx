"use client";

import { FormEvent, useState } from "react";
import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { useHubData } from "@/lib/hub-provider";

export default function RequestsPage() {
  const { requests } = useHubData();
  const [draftSaved, setDraftSaved] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDraftSaved(true);
  }

  return (
    <main className="page">
      <StatusBanner />
      <SectionHeader
        eyebrow="Hub · Pilotage"
        title="Demandes."
        description="Gérez les demandes clients et soumettez de nouvelles requêtes directement depuis le portail."
      />

      <div className="request-layout">
        <Panel title="Nouvelle demande" description="Soumettez une requête — elle sera transmise à l'équipe Crush.lu.">
          <form className="app-form" onSubmit={handleSubmit}>
            <label>
              Sujet
              <input type="text" placeholder="Ex : Réservation venue pour juin…" />
            </label>
            <label>
              Catégorie
              <select defaultValue="event">
                <option value="event">Événement</option>
                <option value="venue">Venue</option>
                <option value="finance">Finance</option>
                <option value="hr">Ressources humaines</option>
                <option value="general">Général</option>
              </select>
            </label>
            <label>
              Priorité
              <select defaultValue="medium">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </label>
            <label>
              Message
              <textarea rows={5} placeholder="Décrivez votre demande, le contexte et l'échéance." />
            </label>
            <button type="submit" className="button">
              Soumettre la demande →
            </button>
            {draftSaved ? (
              <p className="form-note">
                Demande enregistrée. Elle sera envoyée via{" "}
                <code>POST /hub/requests</code> une fois l&apos;API connectée.
              </p>
            ) : null}
          </form>
        </Panel>

        <Panel title="Demandes récentes" description="Historique de vos demandes en cours et résolues.">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sujet</th>
                  <th>Catégorie</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td><strong>{request.subject}</strong></td>
                    <td style={{ color: "var(--muted)" }}>{request.category}</td>
                    <td><span className={`pill ${request.priority.toLowerCase()}`}>{request.priority}</span></td>
                    <td><span className={`pill ${request.status.toLowerCase().replace(/\s+/g, "-")}`}>{request.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  );
}
