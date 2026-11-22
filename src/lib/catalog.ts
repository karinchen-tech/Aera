import type { Lang } from "./types";

/**
 * The kinds of work AERA automations report. Anything not listed here is still
 * accepted and shown; it just uses the generic defaults.
 */
export interface AutomationInfo {
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  icon: string;
  color: string; // CSS variable name holding the series color
}

export const AUTOMATIONS: Record<string, AutomationInfo> = {
  crm: {
    name: { en: "CRM Sync", he: "עדכון CRM" },
    description: {
      en: "Every new listing and lead is written to your CRM automatically.",
      he: "כל נכס וליד חדש נרשם אוטומטית ב-CRM.",
    },
    icon: "🗂️",
    color: "--series-1",
  },
  whatsapp: {
    name: { en: "WhatsApp AI Agent", he: "סוכן AI בוואטסאפ" },
    description: {
      en: "Answers client messages 24/7, qualifies leads and books viewings.",
      he: "עונה ללקוחות 24/7, מסנן לידים וקובע פגישות.",
    },
    icon: "💬",
    color: "--series-2",
  },
  "missed-call": {
    name: { en: "Missed-Call Text Back", he: "החזרת שיחות שלא נענו" },
    description: {
      en: "Every call you couldn't answer gets an instant text so the lead isn't lost.",
      he: "כל שיחה שלא נענתה מקבלת הודעה מיידית כדי שהליד לא ילך לאיבוד.",
    },
    icon: "📞",
    color: "--series-3",
  },
};

export const GENERIC_AUTOMATION: AutomationInfo = {
  name: { en: "Automation", he: "אוטומציה" },
  description: { en: "", he: "" },
  icon: "⚙️",
  color: "--series-4",
};

export interface EventTypeInfo {
  automation: string;
  label: Record<Lang, string>;
  /** Default minutes of manual work this action replaces. */
  minutes: number;
  /** Counts toward "Leads captured". */
  lead?: boolean;
}

export const EVENT_TYPES: Record<string, EventTypeInfo> = {
  "crm.listing_created": {
    automation: "crm",
    label: { en: "New listing added to CRM", he: "נכס חדש נוסף ל-CRM" },
    minutes: 10,
  },
  "crm.record_updated": {
    automation: "crm",
    label: { en: "CRM record updated", he: "רשומה עודכנה ב-CRM" },
    minutes: 4,
  },
  "crm.lead_created": {
    automation: "crm",
    label: { en: "New lead saved to CRM", he: "ליד חדש נשמר ב-CRM" },
    minutes: 5,
    lead: true,
  },
  "whatsapp.message_answered": {
    automation: "whatsapp",
    label: { en: "Client question answered", he: "שאלת לקוח נענתה" },
    minutes: 3,
  },
  "whatsapp.lead_qualified": {
    automation: "whatsapp",
    label: { en: "Lead qualified", he: "ליד סונן ואומת" },
    minutes: 10,
    lead: true,
  },
  "whatsapp.viewing_booked": {
    automation: "whatsapp",
    label: { en: "Viewing booked", he: "נקבעה פגישה / סיור בנכס" },
    minutes: 15,
    lead: true,
  },
  "whatsapp.handoff": {
    automation: "whatsapp",
    label: { en: "Handed to a human agent", he: "הועבר לנציג אנושי" },
    minutes: 2,
  },
  "call.missed_text_sent": {
    automation: "missed-call",
    label: { en: "Missed call → text sent", he: "שיחה שלא נענתה ← נשלחה הודעה" },
    minutes: 5,
    lead: true,
  },
  "call.callback_booked": {
    automation: "missed-call",
    label: { en: "Callback booked", he: "נקבעה שיחה חוזרת" },
    minutes: 10,
    lead: true,
  },
  "task.completed": {
    automation: "general",
    label: { en: "Task completed", he: "משימה בוצעה" },
    minutes: 5,
  },
};

const PREFIX_TO_AUTOMATION: Record<string, string> = {
  crm: "crm",
  whatsapp: "whatsapp",
  call: "missed-call",
};

export function automationFor(type: string): string {
  return EVENT_TYPES[type]?.automation ?? PREFIX_TO_AUTOMATION[type.split(".")[0]] ?? "general";
}

export function automationInfo(key: string): AutomationInfo {
  return AUTOMATIONS[key] ?? GENERIC_AUTOMATION;
}

export function typeLabel(type: string, lang: Lang): string {
  return EVENT_TYPES[type]?.label[lang] ?? type;
}
