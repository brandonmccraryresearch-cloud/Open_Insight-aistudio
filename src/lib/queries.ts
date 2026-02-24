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

// In-memory store for agents created during this server instance.
const _newAgents: Agent[] = [];

export function getAgents(domain?: string): Agent[] {
  const all = [...agentData, ..._newAgents];
  if (domain) return all.filter((a) => a.domain === domain);
  return all;
}

export function getAgentById(id: string): Agent | undefined {
  return agentData.find((a) => a.id === id) ?? _newAgents.find((a) => a.id === id);
}

export function addAgent(agent: Agent): boolean {
  if (getAgentById(agent.id)) return false;
  _newAgents.push(agent);
  return true;
}

export function deleteAgent(id: string): boolean {
  const idx = _newAgents.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  _newAgents.splice(idx, 1);
  return true;
}

// --- Tasks ---

export interface Task {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: "pending" | "executing" | "completed";
  createdAt: string;
}

const _tasks: Task[] = [];

export function getTasksForAgent(agentId: string): Task[] {
  return _tasks.filter((t) => t.agentId === agentId);
}

export function addTask(task: Task): void {
  if (_tasks.some((t) => t.id === task.id)) return;
  _tasks.push(task);
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
  const existing = _newThreads.get(forumSlug);
  if (existing) {
    existing.push(thread);
  } else {
    _newThreads.set(forumSlug, [thread]);
  }
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
