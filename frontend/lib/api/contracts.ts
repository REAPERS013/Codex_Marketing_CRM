import {
  CustomerSnapshot,
  EventCancellationRegistration,
  EventCancellationSummary,
  EventCoachAvailability,
  HubEvent,
  LocationItem,
  PaymentInItem,
  PaymentOutItem,
  PayrollItem,
  RefundItem,
  RequestItem,
  ResourceItem,
  SocialEventSuggestion,
  SocialPost,
  TeamMember,
  WhatsAppInboundMessage,
  WhatsAppMessage,
  WhatsAppTemplate,
} from "@/lib/types";

export type MeResponse = {
  customer: CustomerSnapshot;
};

export type RequestsResponse = {
  items: RequestItem[];
};

export type ResourcesResponse = {
  items: ResourceItem[];
};

export type TimelineResponse = {
  items: {
    id: string;
    date: string;
    title: string;
    description: string;
  }[];
};

export type LocationsResponse = {
  items: LocationItem[];
};

export type PaymentsInResponse = {
  items: PaymentInItem[];
};

export type PaymentsOutResponse = {
  items: PaymentOutItem[];
};

export type PayrollResponse = {
  items: PayrollItem[];
};

export type RefundsResponse = {
  items: RefundItem[];
};

export type TeamMembersResponse = {
  items: TeamMember[];
};

export type EventCancellationsResponse = {
  items: EventCancellationSummary[];
};

export type EventCancellationDetailResponse = {
  event: EventCancellationSummary;
  items: EventCancellationRegistration[];
};

// Staffing des événements. Ces routes restent à implémenter côté Django : tant
// qu'elles répondent 404, la page /events/coaches bascule en mode local
// (cf. lib/data/event-coach-storage.ts) sans jamais inventer de données live.
export type HubEventsResponse = {
  items: HubEvent[];
};

export type EventAvailabilitiesResponse = {
  items: EventCoachAvailability[];
};

export type EventAvailabilityResponse = {
  item: EventCoachAvailability;
};

export type WhatsAppTemplatesResponse = { items: WhatsAppTemplate[] };
export type WhatsAppMessagesResponse = { items: WhatsAppMessage[] };
export type WhatsAppSendResponse = { message: WhatsAppMessage };

export type SocialPostsResponse = { items: SocialPost[] };
export type SocialPostResponse = { post: SocialPost };
export type SocialUpcomingEventsResponse = { items: SocialEventSuggestion[] };
export type SocialEventDraftsResponse = {
  posts: SocialPost[];
  created_count: number;
  reused_count: number;
  copy_source: "event";
};
// POST /hub/social/generate returns one draft per requested language.
export type SocialGenerateResponse = { posts: SocialPost[]; warnings?: string[] };
export type BufferProfilesResponse = { items: import("@/lib/types").BufferProfile[] };
export type ExpandArticleResponse = { article_id: string; title: string; content: string };

export type WhatsAppInboxResponse = {
  items: WhatsAppInboundMessage[];
  unread_count: number;
};

