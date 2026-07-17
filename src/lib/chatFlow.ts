// Predefined, AI-free conversation flow for the assistant.
//
// The chat walks these steps in order, asking ONE question at a time and
// collecting the answer under `key`. To change the conversation, edit only
// this file — AiChat.tsx is a generic runner and never needs to change.
//
// Step types:
//   'options' — render quick-reply buttons from `options`
//   'text'    — free-text answer via the input box

export interface FlowStep {
  id: string;
  key: string;
  question: string;
  type: 'options' | 'text';
  options?: string[];
}

export const WELCOME = `👋 Hi! I'm Janish's AI Assistant.

I'm here to help you with video editing, courses, mentoring, project planning, quotations, portfolio reviews and technical guidance.

How can I help you today?`;

// One question per state, in order.
export const CHAT_FLOW: FlowStep[] = [
  {
    id: 'service',
    key: 'Service',
    question: 'Which service are you looking for?',
    type: 'options',
    options: [
      'Reel / Shorts Editing',
      'YouTube Video Editing',
      'Thumbnail Design',
      'Course Production',
      'Full-time Retainer',
      'Something else',
    ],
  },
  {
    id: 'videos',
    key: 'Number of videos',
    question: 'How many videos do you need?',
    type: 'options',
    options: ['Just 1', '2–5', '6–10', '10+', 'Not sure yet'],
  },
  {
    id: 'deadline',
    key: 'Deadline',
    question: "What's your deadline?",
    type: 'options',
    options: ['Within 3 days', 'This week', 'This month', 'Flexible'],
  },
  {
    id: 'budget',
    key: 'Budget',
    question: "What's your budget?",
    type: 'options',
    options: ['Under ₹5,000', '₹5,000–₹10,000', '₹10,000–₹20,000', '₹20,000+', 'Not sure yet'],
  },
  {
    id: 'quotation',
    key: 'Wants quotation',
    question: 'Would you like a quotation for this?',
    type: 'options',
    options: ['Yes, please', 'No, just exploring'],
  },
];

// Message shown after the last step, summarising the collected answers.
export const buildSummary = (answers: Record<string, string>): string => {
  const lines = CHAT_FLOW
    .map((s) => (answers[s.key] ? `• ${s.key}: ${answers[s.key]}` : null))
    .filter(Boolean)
    .join('\n');
  return `Perfect — here's what I've got:\n\n${lines}\n\nTap “Send on WhatsApp” below and Janish will get back to you personally. 🙌`;
};

// Prefilled WhatsApp handoff text built from the collected answers.
export const buildWhatsAppText = (answers: Record<string, string>): string => {
  const lines = CHAT_FLOW
    .map((s) => (answers[s.key] ? `*${s.key}:* ${answers[s.key]}` : null))
    .filter(Boolean)
    .join('\n');
  return `Hi Janish! 👋 I used the AI assistant on your site.\n\n${lines}\n\nLooking forward to working with you! 🎬`;
};
