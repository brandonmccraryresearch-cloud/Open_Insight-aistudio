// Static-data replacement for the SQLite/Drizzle queries layer.
// All data is sourced from src/data/*.ts; no database connection is needed.

import {
  agents as agentData,
  polarPairs as polarPairData,
  domainColors,
} from "@/data/agents";
import type { Agent } from "@/data/agents";
import { debates as debateData } from "@/data/debates";
import type { Debate } from "@/data/debates";
import { forums as forumData } from "@/data/forums";
import type { Forum, ForumThread } from "@/data/forums";
import { verifications as verificationData } from "@/data/verifications";
import type { VerificationEntry } from "@/data/verifications";

export { domainColors };

// --- Agents ---

export function getAgents(domain?: string): Agent[] {
  if (domain) return agentData.filter((a) => a.domain === domain);
  return agentData;
}

export function getAgentById(id: string): Agent | undefined {
  return agentData.find((a) => a.id === id);
}

// --- Polar Pairs ---

export function getPolarPairs() {
  return polarPairData.map((p) => ({
    domain: p.domain,
    agents: p.agents as [string, string],
    tension: p.tension,
  }));
}

// --- Debates ---

export function getDebates(status?: string) {
  const rows = status
    ? debateData.filter((d) => d.status === status)
    : debateData;
  return rows.map((d) => {
    const { messages, ...rest } = d;
    return {
      ...rest,
      messageCount: messages.length,
    };
  });
}

export function getDebateById(id: string): Debate | undefined {
  return debateData.find((d) => d.id === id);
}

// --- Forums ---

// In-memory store for threads created during this server instance.
// Next.js server-component re-renders will see these threads via
// getForums / getForumBySlug because both functions merge them in.
const _newThreads = new Map<string, ForumThread[]>();

export function addThread(forumSlug: string, thread: ForumThread): void {
  const existing = _newThreads.get(forumSlug) ?? [];
  _newThreads.set(forumSlug, [...existing, thread]);
}

export function getForums(): Forum[] {
  return forumData.map((f) => ({
    ...f,
    threads: [...f.threads, ...(_newThreads.get(f.slug) ?? [])],
  }));
}

export function getForumBySlug(slug: string): Forum | undefined {
  const f = forumData.find((f) => f.slug === slug);
  if (!f) return undefined;
  return {
    ...f,
    threads: [...f.threads, ...(_newThreads.get(slug) ?? [])],
  };
}

// --- Verifications ---

export function getVerifications(tier?: string, status?: string): VerificationEntry[] {
  let rows = verificationData as VerificationEntry[];
  if (tier) rows = rows.filter((v) => v.tier === tier);
  if (status) rows = rows.filter((v) => v.status === status);
  return rows;
}

// --- Stats ---

export function getStats() {
  const totalDebates = debateData.length;
  const liveDebates = debateData.filter((d) => d.status === "live").length;
  const totalRounds = debateData.reduce((sum, d) => sum + d.rounds, 0);
  const totalSpectators = debateData.reduce((sum, d) => sum + d.spectators, 0);
  const averageSpectators =
    totalDebates > 0 ? Math.round(totalSpectators / totalDebates) : 0;

  return {
    totalDebates,
    liveDebates,
    totalRounds,
    totalVerifications: verificationData.length,
    averageSpectators,
  };
}
