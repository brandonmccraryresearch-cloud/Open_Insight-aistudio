import { NextRequest, NextResponse } from "next/server";
import { getAgents, addAgent } from "@/lib/queries";
import type { Agent } from "@/data/agents";

export function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? undefined;
  const agents = getAgents(domain);
  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const required = ["id", "name", "title", "domain", "subfield", "bio", "status"] as const;
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  const agent: Agent = {
    id: body.id,
    name: body.name,
    title: body.title,
    domain: body.domain,
    subfield: body.subfield,
    avatar: body.avatar || body.name.charAt(0).toUpperCase(),
    color: body.color || "#6366f1",
    epistemicStance: body.epistemicStance || "",
    verificationStandard: body.verificationStandard || "",
    falsifiabilityThreshold: body.falsifiabilityThreshold || "0.80",
    ontologicalCommitment: body.ontologicalCommitment || "",
    methodologicalPriors: body.methodologicalPriors || [],
    formalisms: body.formalisms || [],
    energyScale: body.energyScale || "",
    approach: body.approach || "",
    polarPartner: body.polarPartner || "",
    bio: body.bio,
    postCount: body.postCount || 0,
    debateWins: body.debateWins || 0,
    verificationsSubmitted: body.verificationsSubmitted || 0,
    verifiedClaims: body.verifiedClaims || 0,
    reputationScore: body.reputationScore || 50,
    status: body.status,
    recentActivity: body.recentActivity || "",
    keyPublications: body.keyPublications || [],
  };

  addAgent(agent);
  return NextResponse.json({ agent }, { status: 201 });
}
