"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: "pending" | "executing" | "completed";
  createdAt: string;
}

const taskStatusColors: Record<string, string> = {
  pending: "#f59e0b",
  executing: "#6366f1",
  completed: "#10b981",
};

/* ── Reasoning Section ─────────────────────────────────────────── */

function ReasoningSection({ agentId }: { agentId: string }) {
  const [prompt, setPrompt] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const startReasoning = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsStreaming(true);
    setStreamedText("");
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agents/${agentId}/reason`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setError("Failed to start reasoning");
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }
      const decoder = new TextDecoder();

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.replace(/^data: /, "");
          if (trimmed === "[DONE]") break;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.error) { setError(parsed.error); break; }
            if (parsed.text) setStreamedText((prev) => prev + parsed.text);
          } catch {
            // skip unparseable chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Reasoning stream failed");
      }
    } finally {
      setIsStreaming(false);
    }
  }, [agentId, prompt]);

  const stopReasoning = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold mb-4">Reasoning</h2>
      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Enter a prompt to see this agent's step-by-step reasoning..."
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-indigo)] placeholder:text-[var(--text-muted)] resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={startReasoning}
            disabled={isStreaming || !prompt.trim()}
            className="px-4 py-2 text-sm bg-[var(--accent-indigo)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isStreaming ? "Reasoning..." : "Start Reasoning"}
          </button>
          {isStreaming && (
            <button
              onClick={stopReasoning}
              className="px-4 py-2 text-sm border border-[var(--border-primary)] text-[var(--text-muted)] rounded-lg hover:bg-[var(--bg-card)]"
            >
              Stop
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {streamedText && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] max-h-96 overflow-y-auto">
            <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-mono">{streamedText}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Task Queue Section ────────────────────────────────────────── */

function TaskQueueSection({ agentId }: { agentId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/agents/${agentId}/tasks`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
    setLoaded(true);
  }, [agentId]);

  if (!loaded) loadTasks();

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/agents/${agentId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDescription }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => [...prev, data.task]);
      setNewTitle("");
      setNewDescription("");
    }
    setAdding(false);
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold mb-4">Task Queue</h2>

      {tasks.length > 0 ? (
        <div className="space-y-2 mb-4">
          {tasks.map((task) => (
            <div key={task.id} className="p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--text-primary)]">{task.title}</span>
                <span
                  className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: taskStatusColors[task.status], backgroundColor: `${taskStatusColors[task.status]}15` }}
                >
                  {task.status}
                </span>
              </div>
              {task.description && (
                <p className="text-xs text-[var(--text-muted)]">{task.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : loaded ? (
        <p className="text-sm text-[var(--text-muted)] mb-4">No tasks in queue.</p>
      ) : null}

      <form onSubmit={addTask} className="space-y-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-indigo)] placeholder:text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)..."
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-indigo)] placeholder:text-[var(--text-muted)]"
        />
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          className="px-4 py-2 text-sm bg-[var(--accent-indigo)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Task"}
        </button>
      </form>
    </div>
  );
}

/* ── Delete Agent Section ──────────────────────────────────────── */

function DeleteAgentButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/agents");
    } else {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Delete Agent
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Delete Agent?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              This action cannot be undone. Are you sure you want to delete this agent?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Export ─────────────────────────────────────────────────────── */

export { ReasoningSection, TaskQueueSection, DeleteAgentButton };
