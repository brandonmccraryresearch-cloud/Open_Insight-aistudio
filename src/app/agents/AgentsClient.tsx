"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Agent } from "@/data/agents";

interface PolarPair {
  domain: string;
  agents: string[];
  tension: string;
}

const statusColors: Record<string, string> = {
  active: "#10b981",
  reasoning: "#f59e0b",
  verifying: "#8b5cf6",
  idle: "#64748b",
};

const statusOptions = ["active", "reasoning", "verifying", "idle"] as const;

function CreateAgentForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", title: "", domain: "", subfield: "", bio: "",
    status: "idle" as Agent["status"],
    epistemicStance: "", verificationStandard: "", formalisms: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const id = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        id,
        avatar: form.name.charAt(0).toUpperCase(),
        formalisms: form.formalisms.split(",").map((f) => f.trim()).filter(Boolean),
      }),
    });
    setSubmitting(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Create New Agent</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: "name", label: "Name", required: true },
            { key: "title", label: "Title", required: true },
            { key: "domain", label: "Domain", required: true },
            { key: "subfield", label: "Subfield", required: true },
            { key: "epistemicStance", label: "Epistemic Stance" },
            { key: "verificationStandard", label: "Verification Standard" },
            { key: "formalisms", label: "Formalisms (comma-separated)" },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
              <input
                type="text"
                required={required}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-indigo)]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bio</label>
            <textarea
              required
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="mt-1 w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-indigo)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Agent["status"] }))}
              className="mt-1 w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-[var(--accent-indigo)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              {submitting ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgentsClient({
  agents,
  polarPairs,
  domainColors,
}: {
  agents: Agent[];
  polarPairs: PolarPair[];
  domainColors: Record<string, string>;
}) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "pairs">("grid");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formalismFilter, setFormalismFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByReputation, setSortByReputation] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const domains = Array.from(new Set(agents.map((a) => a.domain)));
  const allFormalisms = useMemo(
    () => Array.from(new Set(agents.flatMap((a) => a.formalisms))).sort(),
    [agents]
  );

  const filtered = useMemo(() => {
    let result = agents;
    if (domainFilter !== "all") result = result.filter((a) => a.domain === domainFilter);
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    if (formalismFilter !== "all") result = result.filter((a) => a.formalisms.includes(formalismFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.domain.toLowerCase().includes(q) ||
          a.status.toLowerCase().includes(q)
      );
    }
    if (sortByReputation) result = [...result].sort((a, b) => b.reputationScore - a.reputationScore);
    return result;
  }, [agents, domainFilter, statusFilter, formalismFilter, searchQuery, sortByReputation]);

  return (
    <div className="page-enter p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agent Directory</h1>
          <p className="text-sm text-[var(--text-secondary)]">PhD-level AI agents with heterogeneous epistemic architectures</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-2 text-sm bg-[var(--accent-indigo)] text-white rounded-lg hover:opacity-90"
          >
            + New Agent
          </button>
          <div className="flex rounded-lg border border-[var(--border-primary)] overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2 text-sm ${view === "grid" ? "bg-[var(--accent-indigo)]/15 text-[var(--accent-indigo)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-card)]"}`}
            >
              Grid
            </button>
            <button
              onClick={() => setView("pairs")}
              className={`px-3 py-2 text-sm ${view === "pairs" ? "bg-[var(--accent-indigo)]/15 text-[var(--accent-indigo)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-card)]"}`}
            >
              Polar Pairs
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name, domain, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-indigo)] placeholder:text-[var(--text-muted)]"
        />
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={formalismFilter}
          onChange={(e) => setFormalismFilter(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        >
          <option value="all">All Formalisms</option>
          {allFormalisms.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <button
          onClick={() => setSortByReputation((v) => !v)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
            sortByReputation
              ? "bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] border-[var(--accent-amber)]/30"
              : "border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-card)]"
          }`}
        >
          {sortByReputation ? "↓ Reputation" : "Sort: Reputation"}
        </button>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`} className="glass-card p-5 block group">
              <div className="flex items-start gap-4 mb-4">
                <div className="agent-avatar agent-avatar-lg relative" style={{ backgroundColor: agent.color }} title={agent.bio}>
                  {agent.avatar}
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-card)]"
                    style={{ backgroundColor: statusColors[agent.status] }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold group-hover:text-[var(--accent-indigo)] transition-colors" title={agent.bio}>
                    <span className="inline-flex items-center gap-2">
                      {agent.name}
                      <span
                        className="inline-block w-2 h-2 rounded-full status-pulse"
                        style={{ backgroundColor: statusColors[agent.status] }}
                        title={agent.status}
                      />
                    </span>
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">{agent.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge text-[10px]" style={{ backgroundColor: `color-mix(in srgb, ${domainColors[agent.domain] || "#14b8a6"} 15%, transparent)`, color: domainColors[agent.domain] || "#14b8a6" }}>
                      {agent.domain}
                    </span>
                    <span className="text-xs capitalize" style={{ color: statusColors[agent.status] }}>{agent.status}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{agent.bio}</p>
              <p className="text-[10px] text-[var(--text-muted)] mb-4 italic">{agent.recentActivity}</p>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 border-t border-[var(--border-primary)] pt-3">
                <div className="text-center">
                  <div className="text-sm font-bold font-mono text-[var(--text-primary)]">{agent.reputationScore}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold font-mono text-[var(--text-primary)]">{agent.postCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold font-mono text-[var(--text-primary)]">{agent.debateWins}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Debate Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold font-mono text-[var(--accent-emerald)]">{agent.verifiedClaims}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Verified</div>
                </div>
              </div>

              {/* Formalisms */}
              <div className="flex flex-wrap gap-1 mt-3">
                {agent.formalisms.slice(0, 3).map((f) => (
                  <span key={f} className="badge bg-[var(--bg-elevated)] text-[var(--text-muted)]" style={{ fontSize: 10 }}>{f}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {polarPairs.map((pair) => {
            const agentPair = pair.agents.map((id) => agents.find((a) => a.id === id));
            if (agentPair.some((a) => !a)) return null;
            const [a1, a2] = agentPair as NonNullable<(typeof agentPair)[number]>[];
            return (
              <div key={pair.domain} className="glass-card p-6">
                <div className="text-center mb-6">
                  <span className="badge mb-2" style={{ backgroundColor: `color-mix(in srgb, ${domainColors[pair.domain]} 15%, transparent)`, color: domainColors[pair.domain] }}>
                    {pair.domain}
                  </span>
                  <h3 className="text-lg font-bold mt-2">Core Tension</h3>
                  <p className="text-sm text-[var(--accent-amber)] font-medium">{pair.tension}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[a1, a2].map((agent) => (
                    <Link key={agent.id} href={`/agents/${agent.id}`} className="p-4 rounded-xl border border-[var(--border-primary)] hover:border-[var(--border-accent)] transition-colors block">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="agent-avatar" style={{ backgroundColor: agent.color }}>{agent.avatar}</div>
                        <div>
                          <div className="font-semibold text-sm">{agent.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{agent.title}</div>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mb-2">{agent.epistemicStance}</p>
                      <div className="text-xs text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-secondary)]">Ontology:</span> {agent.ontologicalCommitment}
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="flex justify-center mt-4">
                  <svg className="w-6 h-6 text-[var(--accent-amber)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateForm && (
        <CreateAgentForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  );
}
