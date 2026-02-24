import { NextRequest, NextResponse } from "next/server";
import { getVerifications } from "@/lib/queries";

export function GET(request: NextRequest) {
  const tier = request.nextUrl.searchParams.get("tier") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const verifications = getVerifications(tier, status);
  return NextResponse.json({ verifications });
}

export async function POST(request: NextRequest) {
  let body: { claim?: string; tier?: string; tool?: string; agentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { claim, tier, tool, agentId } = body;

  if (!claim || !tier || !tool || !agentId) {
    return NextResponse.json(
      { error: "claim, tier, tool, and agentId are required" },
      { status: 400 },
    );
  }

  // State is not persisted in the stateless port. Reuse an existing sample
  // verification id for this tier (if available) so that the streaming
  // endpoint, which only knows about the static data set, can operate on it.
  // NOTE: Every tier (Tier 1, Tier 2, Tier 3) has at least one sample entry
  // in src/data/verifications.ts. If a tier with no sample data is requested,
  // the fallback UUID will cause the stream endpoint to return 404.
  const existingForTier = getVerifications(tier, undefined);
  const existing = existingForTier[0];
  const id = existing?.id ?? `v-${crypto.randomUUID()}`;
  const status = existing?.status ?? "queued";
  return NextResponse.json(
    { verification: { id, claim, tier, status } },
    { status: 201 },
  );
}
