// POST {profile, ranking, occasion} -> stylist agent picks (Claude over colorMatch; template fallback).
import { runStylist } from '@/lib/stylist';

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.profile || !Array.isArray(body.ranking)) return Response.json({ error: 'profile and ranking required' }, { status: 400 });
  return Response.json(await runStylist({ profile: body.profile, ranking: body.ranking.slice(0, 5), occasion: body.occasion }));
}
