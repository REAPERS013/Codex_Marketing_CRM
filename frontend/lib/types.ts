export type Metric = {
  label: string;
  value: string;
};

export type RequestItem = {
  id: string;
  subject: string;
  category: "Project" | "Technical" | "Billing" | "General";
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Review" | "Waiting for Client" | "Closed";
  summary: string;
};

export type ResourceItem = {
  id: string;
  title: string;
  type: "Guide" | "Report" | "Asset" | "Invoice";
  summary: string;
  updatedAt: string;
};

export type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
};

export type NewsCategory =
  | "Update"
  | "Feature"
  | "Meeting"
  | "Announcement";

export type NewsItem = {
  id: string;
  date: string;
  category: NewsCategory;
  title: string;
  description: string;
};

export type AnnouncementItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  pdf?: {
    name: string;
    dataUrl: string;
    size: number;
  };
};

export type CustomerSnapshot = {
  organization: string;
  primaryContact: string;
  email: string;
  phone: string;
};

export type CrushEventType =
  | "Cooking workshop"
  | "Wine tasting"
  | "Speed dating"
  | "Outdoor activity"
  | "Quiz night";

export type PartnershipStage =
  | "Prospect"
  | "Negotiating"
  | "Active"
  | "Paused"
  | "Archived";

export type LocationContact = {
  name: string;
  role: string;
  email: string;
  phone: string;
};

export type LocationItem = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;

  maxCapacity: number;
  seatedCapacity?: number;
  hasOutdoorSpace: boolean;
  hasKitchen: boolean;
  hasPrivateRoom: boolean;
  hasSoundSystem: boolean;

  compatibleEventTypes: CrushEventType[];

  partnershipStage: PartnershipStage;
  primaryContact: LocationContact;
  accountManager: string;
  commercialTerms?: string;
  partnerSince?: string;

  lastContactDate: string;
  nextAction?: string;
  nextActionDate?: string;
  notes: string;
  tags: string[];
};

export type PaymentStatus = "Paid" | "Pending" | "Overdue" | "Scheduled";

export type PaymentMethod = "Card" | "Transfer" | "Cash" | "Payconiq";

export type PaymentInItem = {
  id: string;
  date: string;
  amount: number;
  source: string;
  clientName?: string;
  status: PaymentStatus;
  reference?: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
};

export type PaymentOutCategory =
  | "Lieu"
  | "Marketing"
  | "Tech"
  | "Fournitures"
  | "Autre";

export type DepositStatus = "deposit" | "balance" | "full";

export type PaymentOutItem = {
  id: string;
  date: string;
  amount: number;
  locationId?: string;
  payee: string;
  description: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  category: PaymentOutCategory;
  depositStatus?: DepositStatus;
  receiptUrl?: string;
};

export type PayrollItem = {
  id: string;
  date: string;
  amount: number;
  grossSalary: number;
  employerCharges: number;
  employeeName: string;
  category: "Salary" | "Expense" | "Bonus";
  description: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
};

export type RefundItem = {
  id: string;
  date: string;
  amount: number;
  participantName: string;
  eventName: string;
  reason: string;
  status: PaymentStatus;
};

export type EventProfitability = {
  id: string;
  eventName: string;
  eventDate: string;
  ticketRevenue: number;
  venueCost: number;
  suppliesCost: number;
  otherCosts: number;
  refunds: number;
};

export type WhatsAppTemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  text?: string;
  example?: { body_text?: string[][]; header_text?: string[] };
};

export type WhatsAppTemplate = {
  name: string;
  language: string;
  category: string;
  status: string;
  components: WhatsAppTemplateComponent[];
};

export type WhatsAppMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsAppStatusEvent = {
  status: WhatsAppMessageStatus;
  timestamp: string;
  error_code?: number;
  error_message?: string;
};

export type WhatsAppMessage = {
  id: string;
  wa_message_id: string | null;
  recipient: string;
  template_name: string;
  language: string;
  parameters: Record<string, string>;
  status: WhatsAppMessageStatus;
  status_history: WhatsAppStatusEvent[];
  created_at: string;
};

// Social media planning — a draft → review → schedule workflow that feeds an
// off-the-shelf scheduler (Buffer) via the Django backend. Modeled on the
// WhatsAppMessage shape: a status field plus an append-only status_history.
export type SocialPillar =
  | "event_recap"
  | "dating_tip"
  | "milestone"
  | "community"
  | "promo";

export type SocialLanguage = "fr" | "en" | "de";

export type SocialPlatform = "instagram" | "facebook" | "linkedin";

export type SocialPostStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

export type SocialPromotionStatus = SocialPostStatus | "not_started";

export type SocialStatusEvent = {
  status: SocialPostStatus;
  timestamp: string;
  actor?: string;
  note?: string;
};

export type BufferProfile = {
  id: string;
  service: SocialPlatform;
  service_username: string;
  avatar_url?: string;
  formatted_username: string;
  is_queue_paused?: boolean;
};

export type SocialPost = {
  id: string;
  created_by: string;
  source_event_id?: string | null;
  source_event_title?: string | null;
  pillar: SocialPillar;
  language: SocialLanguage;
  platforms: SocialPlatform[];
  buffer_profile_ids?: string[];
  buffer_profile_platforms?: Record<string, SocialPlatform>;
  dispatched_platforms?: SocialPlatform[];
  hook: string;
  content: string;
  media_url: string | null;
  status: SocialPostStatus;
  scheduled_for: string | null;
  buffer_id: string | null;
  article_id?: string | null;
  status_history: SocialStatusEvent[];
  created_at: string;
  updated_at: string;
};

export type SocialEventSuggestion = {
  id: string;
  title: string;
  event_type: string;
  date: string;
  location: string;
  image_url: string;
  event_url: string;
  available_languages: SocialLanguage[];
  promotion_post_id: string | null;
  promotion_status: SocialPromotionStatus;
  is_promoted: boolean;
};

export type WhatsAppInboundMessage = {
  id: string;
  wa_message_id: string;
  from_number: string;
  contact_name: string;
  message_type: string;
  text: string;
  received_at: string;
  is_read: boolean;
};

export type TeamMember = {
  name: string;
  role: string;
  initial: string;
  gradient: string;
  events: number | string;
  presence: string;
};

export type EventCancellationSummary = {
  id: string;
  title: string;
  eventType: string;
  dateTime: string;
  isCancelled: boolean;
  organiserCancellationStartedAt?: string | null;
  affectedRegistrations: number;
  issuedCreditsCount: number;
  issuedCreditsTotalCents: number;
  openCashRefundTotalCents: number;
};

// Staffing des événements — un événement publié sur crush.lu est relié au hub,
// et les coachs s'y déclarent disponibles. Un admin transforme ensuite une
// disponibilité en affectation ("assigned"), ce qui ajoute le coach à l'événement.
export type EventCoachRole =
  | "Animation"
  | "Accueil"
  | "Photo/Vidéo"
  | "Support";

export type CoachAvailabilityStatus = "available" | "assigned" | "declined";

export type EventCoachAvailability = {
  id: string;
  eventId: string;
  coachName: string;
  coachEmail?: string | null;
  role: EventCoachRole;
  status: CoachAvailabilityStatus;
  note?: string;
  declaredAt: string;
  assignedAt?: string | null;
};

/**
 * Provenance d'un événement :
 * - "crush" → publié sur crush.lu, le hub ne fait que l'afficher (lecture seule).
 * - "hub"   → créé depuis cette page, donc modifiable et supprimable ici.
 */
export type HubEventOrigin = "crush" | "hub";

export type HubEvent = {
  id: string;
  title: string;
  eventType: string;
  /** ISO datetime de début de l'événement. */
  dateTime: string;
  location: string;
  /** Contexte libre affiché aux coachs (déroulé, matériel, consignes). */
  description?: string | null;
  imageUrl?: string | null;
  /** Lien public vers la fiche de l'événement sur crush.lu. */
  eventUrl?: string | null;
  /** Nombre de coachs attendus sur l'événement. */
  coachesNeeded: number;
  /** Défaut "crush" quand le backend ne précise rien. */
  origin?: HubEventOrigin;
  /** Vrai pour l'événement de démonstration servi sans backend. */
  isDemo?: boolean;
};

/** Champs saisis dans le formulaire de création / édition d'un événement hub. */
export type HubEventDraft = {
  title: string;
  eventType: string;
  dateTime: string;
  location: string;
  description?: string | null;
  imageUrl?: string | null;
  eventUrl?: string | null;
  coachesNeeded: number;
};

export type LinkedCrushCredit = {
  id: string;
  status: string;
  amountCents: number;
  cashRefundEligible: boolean;
  note?: string;
};

export type EventCancellationRegistration = {
  id: string;
  userEmail: string | null;
  status: string;
  cancelledAt: string | null;
  paymentConfirmed: boolean;
  credit: LinkedCrushCredit | null;
  openCashRefund: boolean;
  cancellationOrigin?: "member" | "organiser";
  paymentStatus?: "refunded" | "paid" | "none";
  refundAmountCents?: number | null;
};

