import { NextRequest, NextResponse } from "next/server";
import { addThread } from "@/lib/queries";
import type { ForumThread } from "@/data/forums";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let body: {
    title?: string;
    authorId?: string;
    author?: string;
    tags?: string[];
    excerpt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title, authorId, author, tags, excerpt } = body;

  if (!title || !authorId || !author) {
    return NextResponse.json(
      { error: "title, authorId, and author are required" },
      { status: 400 },
    );
  }

  const thread: ForumThread = {
    id: `thread-${crypto.randomUUID()}`,
    title,
    author,
    authorId,
    timestamp: new Date().toISOString(),
    replyCount: 0,
    verificationStatus: "unverified",
    tags: tags ?? [],
    excerpt: excerpt ?? "",
    upvotes: 0,
    views: 0,
  };

  // Store in the in-memory map so getForumBySlug reflects the new thread
  // immediately after the client calls router.refresh().
  addThread(slug, thread);

  return NextResponse.json({ thread }, { status: 201 });
}
