import { NextRequest, NextResponse } from "next/server";
import { getAgentById, getTasksForAgent, addTask } from "@/lib/queries";
import type { Task } from "@/lib/queries";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = getAgentById(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const tasks = getTasksForAgent(id);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = getAgentById(id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const task: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agentId: id,
    title: body.title,
    description: body.description || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  addTask(task);
  return NextResponse.json({ task }, { status: 201 });
}
