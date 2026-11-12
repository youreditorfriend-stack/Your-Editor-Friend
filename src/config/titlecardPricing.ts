// Title card offer — ONE place to change prices, copy and examples.
// The project file ₹ amount here is also read by /api/create-order, so the
// server never trusts a client amount.

export const WHATSAPP_NUMBER = "918248487429";

export type EditTierId = "photo";

export interface EditTier {
  id: EditTierId;
  name: string;
  price: number;           // ₹
  badge?: string;
  delivery: string;        // shown on the card + FAQ
  revisions: number;
  features: string[];
  message: string;         // prefilled WhatsApp text (line breaks kept)
}

/** Done-for-you edit — name on the site, pay by Razorpay, then photos on WhatsApp.
 *  Price KEEP IN SYNC with EDIT_PRICE in api/titlecard.ts. */
export const EDIT_TIERS: EditTier[] = [
  {
    id: "photo",
    name: "I edit it for you",
    price: 599,
    delivery: "24–48 hours",
    revisions: 1,
    features: ["Your name + your photo", "Pick a pose", "1080p MP4 on WhatsApp", "1 revision", "24–48 hour delivery"],
    message: "Hi! I want the SCENE title card edit — Name + Photo (₹599)\nName to show: ___\nSmall top line (optional): ___\nI'll send 1–3 clear photos here",
  },
];

/** Template only — bought on the site (Razorpay + instant download). */
export const PROJECT_FILE = {
  id: "file" as const,
  name: "AE project file",
  price: 149,              // ₹ — server charges price * 100 paise
  oldPrice: 499,           // shown struck-through with a "PRICE DROP" badge
  badge: "PRICE DROP",
  subtext: "Skip the 1.5-hour tutorial — ready-made After Effects file. You edit it yourself.",
  features: ["After Effects project (2022+)", "You add your own name & photo", "Instant download"],
};

export const SHOW_SOCIAL_PROOF = false;
export const SOCIAL_PROOF_COUNT = 0;   // "{n} people already got theirs"

export interface TitleCardExample { src: string; name: string; type: "video" | "image" }
// "Made for them" section — hidden while empty. Add real ones later, e.g.
// { src: "/titlecard/examples/arun.mp4", name: "ARUN", type: "video" }
export const EXAMPLES: TitleCardExample[] = [];

// No emoji in the messages: WhatsApp's link page turns them into "�".
export const waText = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
export const waLink = (tier: EditTier) => waText(tier.message);

/** Message opened on WhatsApp right after the ₹599 payment succeeds. */
export const paidMessage = (orderId: string, big: string, top: string) =>
  `Hi! I paid for the SCENE title card edit.\nOrder ID: ${orderId}\nName to show: ${big}\nSmall top line: ${top || "-"}\nSending my photos now.`;

/** What the buyer must send on WhatsApp after paying (shown as a checklist). */
export const SEND_ON_WHATSAPP = [
  "1–3 clear photos of you (face visible, waist-up, good light)",
  "Your order ID (filled in for you)",
  "Pose you like (optional — send a reference photo)",
];
