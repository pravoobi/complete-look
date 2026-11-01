// Stylist agent: Claude with tools over our deterministic colorMatch. Claude chooses and explains;
// it never scores colours itself. Limits are enforced in code: at most 2 picks, both from the
// colorMatch top 3. If Claude is unavailable, the top 2 with template wording are returned.
import { OCCASIONS, outfitById } from './catalog';
import type { Depth } from './colorMatch';
import type { RankedOutfit, Stylist } from './look';

type Input = { profile: { depth: Depth; ita: number; skinHex: string; lipHex: string }; ranking: RankedOutfit[]; occasion?: string };

const MODEL = () => process.env.STYLIST_MODEL ?? process.env.AGENT_MODEL ?? 'claude-sonnet-5-5';

const SYSTEM = `You are the stylist in Complete Look, a try-on app for Indian ethnic wear.
Pick the 2 outfits to try on for this shopper and explain each in one sentence (max 25 words), then a one-sentence summary (max 30 words).
Rules:
- Call get_tone_profile and search_catalog first. Choose only from the top 3 of search_catalog, which is ranked by a deterministic colour-contrast model built on YouCam's measured skin colour.
- Base every explanation on the reasons search_catalog returns (how clearly the colour stands out against the skin tone, or blends in). Do not invent colour theory.
- Talk only about colours and how they stand out. Never say "warm", "cool" or "undertone". Never comment on skin, skin conditions, body or attractiveness.
- Mention the occasion naturally when it helps.
- Finish by calling finalize_look.`;

const TOOLS = [
  { name: 'get_tone_profile', description: "The shopper's measured colours from YouCam AI Facial Color Tones Analyzer: skin depth band, ITA angle, skin and lip hex.", input_schema: { type: 'object', properties: {} } },
  {
    name: 'search_catalog',
    description: 'Catalog outfits for the occasion, ranked best first by the colour-contrast model, with machine-readable reasons, price in INR and category.',
    input_schema: { type: 'object', properties: { max_price_inr: { type: 'number' } } },
  },
  {
    name: 'finalize_look',
    description: 'Submit the final 2 outfits to try on, best first, each with a one-sentence reason, plus a one-sentence summary.',
    input_schema: {
      type: 'object',
      properties: {
        picks: { type: 'array', items: { type: 'object', properties: { outfit_id: { type: 'string' }, why: { type: 'string' } }, required: ['outfit_id', 'why'] }, maxItems: 2, minItems: 1 },
        summary: { type: 'string' },
      },
      required: ['picks', 'summary'],
    },
  },
];

const BANNED = /\b(warm|cool|undertone|fair|flawless|beautiful|pretty|blemish|skin condition)/i;

export function fallback(input: Input, reason: string): Stylist {
  return {
    model: 'template',
    summary: 'Ranked by how clearly each colour stands out against your measured skin tone.',
    picks: input.ranking.slice(0, 2).map((r) => ({ outfitId: r.outfitId, why: r.text })),
    toolCalls: [],
    fallback: true,
    ...(reason ? { error: reason } : {}),
  } as Stylist;
}

export async function runStylist(input: Input): Promise<Stylist> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback(input, 'no ANTHROPIC_API_KEY');
  const top3 = input.ranking.slice(0, 3).map((r) => r.outfitId);
  const occasion = OCCASIONS.find((o) => o.id === input.occasion)?.label ?? 'any occasion';
  const toolCalls: Stylist['toolCalls'] = [];
  const messages: { role: 'user' | 'assistant'; content: unknown }[] = [{ role: 'user', content: `Occasion: ${occasion}. Choose the 2 outfits to try on.` }];

  try {
    for (let turn = 0; turn < 6; turn++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL(), max_tokens: 800, system: SYSTEM, tools: TOOLS, messages }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      const msg = await res.json();
      messages.push({ role: 'assistant', content: msg.content });
      const uses = (msg.content as { type: string; id: string; name: string; input: any }[]).filter((c) => c.type === 'tool_use');
      if (!uses.length) break;
      const results = [];
      for (const u of uses) {
        const t0 = Date.now();
        let out: unknown;
        if (u.name === 'get_tone_profile') out = { ...input.profile, note: 'Depth is the measured signal; undertone is not measured.' };
        else if (u.name === 'search_catalog')
          out = input.ranking
            .map((r, i) => ({ rank: i + 1, ...r, ...pick(outfitById(r.outfitId)) }))
            .filter((r) => !u.input?.max_price_inr || (r.price_inr ?? 0) <= u.input.max_price_inr);
        else if (u.name === 'finalize_look') {
          const picks = (u.input.picks ?? []).filter((p: any) => top3.includes(p.outfit_id)).slice(0, 2);
          const clean = picks.every((p: any) => !BANNED.test(p.why)) && !BANNED.test(u.input.summary ?? '');
          toolCalls.push({ name: u.name, input: u.input, ms: Date.now() - t0 });
          if (picks.length && clean)
            return { model: MODEL(), summary: u.input.summary, picks: picks.map((p: any) => ({ outfitId: p.outfit_id, why: p.why })), toolCalls };
          out = { error: 'Picks must come from the top 3 and use colour-contrast language only. Try again.' };
        }
        if (u.name !== 'finalize_look') toolCalls.push({ name: u.name, input: u.input, ms: Date.now() - t0 });
        results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) });
      }
      messages.push({ role: 'user', content: results });
    }
    return { ...fallback(input, 'agent did not finalize'), toolCalls };
  } catch (e) {
    console.error('[stylist]', e);
    return { ...fallback(input, String(e)), toolCalls };
  }
}

const pick = (o: ReturnType<typeof outfitById>) => (o ? { name: o.name, category: o.category, colour: o.colorName, price_inr: o.priceInr } : {});
