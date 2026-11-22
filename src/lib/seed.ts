import type { Store } from "./store/types";
import type { Client, Outcome, WorkEvent } from "./types";
import { newId, newSecret } from "./ids";
import { EVENT_TYPES } from "./catalog";

/** Deterministic PRNG so the demo looks the same on every machine. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const NAMES = ["יעל כהן", "אבי לוי", "נועה מזרחי", "דניאל פרץ", "מיכל ביטון", "רון אברהם", "שירה פרידמן", "עומר דהן", "תמר שפירא", "איתי גולן", "Sarah Miller", "David Klein"];
const STREETS = ["רוטשילד 45, תל אביב", "הרצל 12, רמת גן", "ויצמן 8, כפר סבא", "בן יהודה 110, תל אביב", "סוקולוב 30, הרצליה", "אחוזה 77, רעננה", "ז׳בוטינסקי 3, גבעתיים", "דיזנגוף 200, תל אביב"];
const ROOMS = ["3 חדרים", "4 חדרים", "5 חדרים", "פנטהאוז", "דירת גן 4 חד׳"];
const QUESTIONS = [
  "האם הדירה ברוטשילד עדיין זמינה?",
  "מה המחיר של הדירה בהרצליה?",
  "יש חניה וממ״ד?",
  "אפשר לראות את הנכס ביום חמישי?",
  "מחפש 4 חדרים ברמת גן עד 3.2 מיליון",
  "Is the Dizengoff apartment pet friendly?",
];

export async function seedDemo(store: Store) {
  const client: Client = {
    id: newId(),
    slug: "demo-realestate",
    name: "נדל״ן לדוגמה",
    industry: "real-estate",
    lang: "he",
    timezone: "Asia/Jerusalem",
    hourlyRate: 120,
    currency: "ILS",
    accessKey: "demo",
    ingestToken: newSecret("ingest"),
    createdAt: new Date(Date.now() - 45 * 864e5).toISOString(),
  };
  await store.createClient(client);

  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const phone = () => `05${Math.floor(r() * 9)}-${String(Math.floor(r() * 9_000_000) + 1_000_000)}`;
  const events: WorkEvent[] = [];
  const now = Date.now();

  const add = (type: string, at: number, extra: Partial<WorkEvent> = {}, outcome: Outcome = "success") => {
    const info = EVENT_TYPES[type];
    events.push({
      id: newId(),
      clientId: client.id,
      automation: info.automation,
      type,
      title: info.label.he,
      outcome,
      minutesSaved: info.minutes,
      occurredAt: new Date(Math.min(at, now - 60_000)).toISOString(),
      createdAt: new Date().toISOString(),
      ...extra,
    });
  };

  for (let d = 59; d >= 0; d--) {
    const dayStart = now - d * 864e5 - (now % 864e5) - 2 * 36e5; // ~midnight Israel time
    const busy = 0.6 + r() * 0.8;
    // Hours weighted toward working day, with a real tail after hours / at night.
    const at = () => {
      const h = r() < 0.22 ? (r() < 0.5 ? 19 + r() * 5 : r() * 8) : 8 + r() * 11;
      return dayStart + h * 36e5;
    };

    for (let i = 0; i < Math.round(2 * busy + r() * 2); i++) {
      const addr = pick(STREETS);
      add("crm.listing_created", at(), {
        title: `נכס חדש נוסף ל-CRM: ${pick(ROOMS)}, ${addr}`,
        detail: `מחיר ${(1.8 + r() * 4).toFixed(2)} מ׳ ₪ · נוצרה רשומה ב-Airtable עם תמונות ופרטי בעלים`,
        link: "https://airtable.com/",
      });
    }
    for (let i = 0; i < Math.round(3 * busy); i++) {
      add("crm.record_updated", at(), { title: `עודכן סטטוס נכס: ${pick(STREETS)}`, detail: "סטטוס: במשא ומתן" });
    }
    for (let i = 0; i < Math.round(14 * busy + r() * 6); i++) {
      const name = pick(NAMES);
      add("whatsapp.message_answered", at(), {
        contactName: name,
        contactPhone: phone(),
        detail: `“${pick(QUESTIONS)}” — נענה תוך ${Math.ceil(r() * 20)} שניות`,
      });
    }
    for (let i = 0; i < Math.round(3 * busy); i++) {
      const name = pick(NAMES);
      add("whatsapp.lead_qualified", at(), {
        contactName: name,
        contactPhone: phone(),
        detail: `תקציב ${(1.5 + r() * 3).toFixed(1)} מ׳ ₪ · ${pick(ROOMS)} · מוכן לסיור`,
      });
    }
    if (r() < 0.75) {
      const name = pick(NAMES);
      add("whatsapp.viewing_booked", at(), {
        contactName: name,
        contactPhone: phone(),
        detail: `סיור ב${pick(STREETS)} נקבע ליום ${pick(["ראשון", "שני", "שלישי", "רביעי", "חמישי"])} ב-${10 + Math.floor(r() * 8)}:00`,
      });
    }
    if (r() < 0.35) {
      add("whatsapp.handoff", at(), { contactName: pick(NAMES), detail: "הלקוח ביקש לדבר עם סוכן על משא ומתן במחיר" }, "needs_human");
    }
    for (let i = 0; i < Math.round(4 * busy + r() * 3); i++) {
      const name = pick(NAMES);
      add("call.missed_text_sent", at(), {
        contactName: r() < 0.4 ? undefined : name,
        contactPhone: phone(),
        detail: "נשלח SMS: “היי, ראינו שהתקשרת ולא הספקנו לענות. איך אפשר לעזור?”",
      });
    }
    for (let i = 0; i < Math.round(1.5 * busy); i++) {
      add("call.callback_booked", at(), { contactName: pick(NAMES), contactPhone: phone(), detail: "הלקוח השיב להודעה ונקבעה שיחה חוזרת" });
    }
    if (r() < 0.08) {
      add("call.missed_text_sent", at(), { contactPhone: phone(), detail: "ספק ה-SMS החזיר שגיאה — נשלח שוב אוטומטית" }, "failed");
    }
  }
  await store.insertEvents(events);
}
