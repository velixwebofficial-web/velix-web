// lib/tools.js
// Registry of typed, deterministic backend functions Claude can call
// mid-conversation (§11). Claude decides WHEN to call these based on
// conversation state (guardrail enforced in conversationState.js); the
// functions themselves are plain deterministic code with no room to
// improvise — this is the single biggest lever against both hallucination
// and "sounded helpful but nothing actually happened."
//
// MVP note: create_lead and generate_quote are the two that matter most.
// save_project_summary and escalate_to_human are included too since
// they're cheap and close real gaps (dashboard summaries, human handoff).
// schedule_meeting / check_availability are deferred — see roadmap notes
// at the bottom of this file.

const { computeQuote } = require('./pricingEngine');
const store = require('./store');

const TOOL_SCHEMAS = {
  create_lead: {
    name: 'create_lead',
    description: 'Save this visitor as a lead for the VELIX team to follow up with. Call this once you have at least a name and one way to reach them (phone or email).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        company: { type: 'string' },
        projectDetails: { type: 'string', description: 'Brief summary of what the visitor wants built.' },
        budget: { type: 'string' },
        timeline: { type: 'string' }
      },
      required: ['name']
    }
  },
  generate_quote: {
    name: 'generate_quote',
    description: "Compute an indicative starting price from the pricing engine after understanding the visitor's project type. The returned amount is not a guaranteed final project price; final pricing depends on scope, features and complexity.",
    input_schema: {
      type: 'object',
      properties: {
        packageId: { type: 'string', enum: ['landing', 'business_basic', 'business_pro', 'signature', 'store_basic', 'store_pro', 'web_system'] },
        addonIds: { type: 'array', items: { type: 'string' } }
      },
      required: ['packageId']
    }
  },
  book_consultation: {
    name: 'book_consultation',
    description: 'Book the free 30-minute consultation. Only call once you have the day, the hour, the call method, the visitor\'s name and phone number. Dates are in Amman time.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD (Amman date)' },
        hour: { type: 'integer', description: 'Start hour, 10–16 (24h, Amman time)' },
        method: { type: 'string', enum: ['zoom', 'video', 'phone', 'whatsapp'], description: 'zoom if the visitor asks for Zoom; video = Google Meet' },
        name: { type: 'string' },
        phone: { type: 'string' },
        need: { type: 'string', description: 'What they want to build, in a few words' }
      },
      required: ['date', 'hour', 'method', 'name', 'phone']
    }
  },
  save_project_summary: {
    name: 'save_project_summary',
    description: 'Save a short structured summary of what has been learned about this visitor\'s project so far, for the admin dashboard. Call this once real scope details emerge in Discovery.',
    input_schema: {
      type: 'object',
      properties: {
        projectType: { type: 'string' },
        summary: { type: 'string' }
      },
      required: ['summary']
    }
  },
  escalate_to_human: {
    name: 'escalate_to_human',
    description: 'Flag this conversation for direct founder/team follow-up — use when the visitor explicitly asks for a human, seems frustrated, asks for a discount, or asks something outside the knowledge base.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' }
      },
      required: ['reason']
    }
  }
};

async function executeTool(name, input, context) {
  switch (name) {
    case 'book_consultation': {
      const v = validateBooking(input);
      if (!v.ok) return { success: false, error: v.error, suggestion: v.suggestion || null };
      const methods = { zoom: 'Zoom / زوم', video: 'Video call (Google Meet) / مكالمة فيديو', phone: 'Phone call / مكالمة هاتفية', whatsapp: 'WhatsApp call / مكالمة واتساب' };
      const when = `${input.date} ${String(input.hour).padStart(2, '0')}:00 (Amman)`;
      const msg = [
        'VELIX — consultation booking / حجز استشارة',
        `Name / الاسم: ${input.name}`,
        `Phone / الهاتف: ${input.phone}`,
        `When / الموعد: ${v.weekday} ${when}`,
        `Method / الطريقة: ${methods[input.method]}`,
        input.need ? `Project / المشروع: ${input.need}` : ''
      ].filter(Boolean).join('\n');
      await store.saveLead({ name: input.name, phone: input.phone, projectDetails: `📅 استشارة مجانية — ${v.weekday} ${when} · ${methods[input.method]}${input.need ? '\n' + input.need : ''}`, timeline: `${v.weekday} ${when} · ${input.method}`, source: 'AI Booking', sessionId: context.sessionId });
      await store.logEvent({ type: 'booking_requested', sessionId: context.sessionId, payload: { when, method: input.method } });
      return { success: true, booking: { date: input.date, weekday: v.weekday, hour: input.hour, method: input.method, name: input.name }, whatsappUrl: 'https://wa.me/962799691748?text=' + encodeURIComponent(msg) };
    }
    case 'create_lead': {
      if (!input.phone && !input.email) return { success: false, error: 'Need a phone number or an email to save the lead.' };
      // Idempotency per §11's implementation recommendation: keyed by
      // sessionId so a retried/double tool-call in the same session
      // updates rather than duplicates.
      const lead = Object.assign({
        id: `lead_${context.sessionId}_${Date.now().toString(36)}`,
        sessionId: context.sessionId,
        source: 'AI Chat',
        status: 'New',
        createdAt: new Date().toISOString()
      }, input);
      await store.saveLead(lead);
      await store.logEvent({ type: 'lead_created', sessionId: context.sessionId, payload: { name: input.name } });
      return { success: true, lead };
    }
    case 'generate_quote': {
      const result = computeQuote(input);
      if (!result.ok) return { success: false, error: result.error };
      await store.logEvent({ type: 'quote_generated', sessionId: context.sessionId, payload: result.breakdown });
      return { success: true, quote: result.breakdown };
    }
    case 'save_project_summary': {
      await store.logEvent({ type: 'project_summary', sessionId: context.sessionId, payload: input });
      return { success: true };
    }
    case 'escalate_to_human': {
      await store.logEvent({ type: 'escalation', sessionId: context.sessionId, payload: input });
      return {
        success: true,
        contact: { phone: '+962 79 969 1748', email: 'hello@velixweb.xyz' }
      };
    }
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function validateBooking(input) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input.date || ''));
  if (!m) return { ok: false, error: 'Date must be YYYY-MM-DD.' };
  const hour = Number(input.hour);
  if (!Number.isInteger(hour) || hour < 10 || hour > 16) return { ok: false, error: 'Start time must be on the hour between 10:00 and 16:00 Amman time.' };
  if (!input.phone || String(input.phone).replace(/\D/g, '').length < 7) return { ok: false, error: 'A valid phone number is needed.' };
  const at = Date.UTC(+m[1], +m[2] - 1, +m[3], hour - 3, 0, 0); // Amman = UTC+3
  const ammanDay = new Date(at + 3 * 3600e3).getUTCDay();
  if (ammanDay === 5) return { ok: false, error: 'We do not book on Fridays.', suggestion: 'Saturday or Thursday' };
  const now = Date.now();
  if (at - now < 2 * 3600e3) return { ok: false, error: 'The slot must be at least 2 hours from now.' };
  if (at - now > 14 * 86400e3) return { ok: false, error: 'Bookings are open up to 14 days ahead.' };
  return { ok: true, weekday: WEEKDAYS[ammanDay] };
}

module.exports = { TOOL_SCHEMAS, executeTool, validateBooking };

// Roadmap (not built — see §60): schedule_meeting (needs a calendar
// integration), check_availability (needs a project-queue data source).
// Both are real future tools once there's an actual calendar/queue system
// to back them with; stubbing them now would let Claude "confirm" a
// meeting time that isn't real, which is exactly the failure mode §11
// exists to prevent.
