// Unit guard for live mode: a per-visitor cap and a global daily cap, checked before any paid call.
// State is in memory, so it is per server instance and resets on cold start. That is a best-effort
// guard for a demo; the YouCam account balance is the hard limit. LIVE_MODE=off disables live calls.

const day = () => new Date().toISOString().slice(0, 10);
let today = day();
let globalSpent = 0;
const perVisitor = new Map<string, number>();

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
export const caps = () => ({
  session: num(process.env.YOUCAM_SESSION_UNIT_CAP, 30), // one complete look on a new photo is 28 (tone 20 + 2 outfits + jewellery + lip)
  daily: num(process.env.YOUCAM_DAILY_UNIT_CAP, 80),
});

function roll() {
  if (day() !== today) {
    today = day();
    globalSpent = 0;
    perVisitor.clear();
  }
}

export type GuardResult = { ok: true } | { ok: false; reason: 'off' | 'visitor' | 'daily'; message: string };

export function canSpend(visitor: string, units: number): GuardResult {
  roll();
  if (process.env.LIVE_MODE === 'off') return { ok: false, reason: 'off', message: 'Live try-on is paused right now. The sample shoppers replay real results anytime.' };
  const { session, daily } = caps();
  if ((perVisitor.get(visitor) ?? 0) + units > session)
    return { ok: false, reason: 'visitor', message: `Demo limit reached: each visitor gets one complete look a day (${session} YouCam units). The sample shoppers are always open.` };
  if (globalSpent + units > daily)
    return { ok: false, reason: 'daily', message: "Today's live demo budget is used up. It resets at midnight UTC; the sample shoppers are always open." };
  return { ok: true };
}

export function recordSpend(visitor: string, units: number) {
  roll();
  globalSpent += units;
  perVisitor.set(visitor, (perVisitor.get(visitor) ?? 0) + units);
}

/** Visitor key: the client IP as seen by the platform (x-forwarded-for on Vercel). */
export function visitorKey(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

export function _resetForTests() {
  globalSpent = 0;
  perVisitor.clear();
}
