"use client";

import { Panel } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { useHubData } from "@/lib/hub-provider";

const INTEGRATIONS = [
  { done: true,  label: "API Crush.lu connectée",         detail: "Token valide · dernière synchro il y a 2 min" },
  { done: true,  label: "SSO Crush.lu activé",            detail: "Connexion unique via allauth" },
  { done: false, label: "WhatsApp Business",              detail: "Non configuré — cliquez pour connecter" },
  { done: false, label: "Notifications push",             detail: "Non activées" },
  { done: false, label: "Export comptable automatique",   detail: "Connexion logiciel comptable" },
];

export default function SettingsPage() {
  const { customer } = useHubData();

  return (
    <main className="page">
      <StatusBanner />
      <SectionHeader
        eyebrow="Compte"
        title="Paramètres."
        description="Gérez votre profil, préférences et intégrations."
      />

      <div className="two-up">
        <Panel title="Profil" description="Informations de votre compte Crush.lu.">
          <form className="app-form">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>
                Prénom
                <input type="text" defaultValue={customer.primaryContact.split(" ")[0] || "Sébastien"} />
              </label>
              <label>
                Nom
                <input type="text" defaultValue={customer.primaryContact.split(" ")[1] || "Martin"} />
              </label>
            </div>
            <label>
              Email professionnel
              <input type="email" defaultValue={customer.email || "sebastien@crush.lu"} />
            </label>
            <label>
              Organisation
              <input type="text" defaultValue={customer.organization || "Crush.lu"} />
            </label>
            <label>
              Téléphone
              <input type="text" defaultValue={customer.phone || ""} placeholder="+352 …" />
            </label>
            <button type="button" className="button">
              Enregistrer les modifications
            </button>
          </form>
        </Panel>

        <Panel title="Intégrations & connexions" description="État des connexions avec les services externes.">
          <div className="check-list">
            {INTEGRATIONS.map((item) => (
              <div key={item.label} className="check-item">
                <div className={`check-circle ${item.done ? "done" : "todo"}`}>
                  {item.done ? "✓" : "○"}
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.1rem" }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
