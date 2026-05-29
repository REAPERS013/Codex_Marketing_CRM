"use client";

import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { useHubData } from "@/lib/hub-provider";

export default function ResourcesPage() {
  const { resources } = useHubData();

  return (
    <main className="page">
      <StatusBanner />
      <SectionHeader
        eyebrow="Hub · Opérations"
        title="Ressources."
        description="Guides, documents de formation et matériel de projet partagés par l'équipe."
      />

      <div className="resource-grid">
        {resources.map((resource) => (
          <Panel key={resource.id} title={resource.title} description={resource.summary}>
            <div className="resource-meta">
              <span className="resource-type">{resource.type}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{resource.updatedAt}</span>
            </div>
            <button type="button" className="button secondary" style={{ marginTop: "0.6rem" }}>
              📄 Ouvrir
            </button>
          </Panel>
        ))}
      </div>
    </main>
  );
}
