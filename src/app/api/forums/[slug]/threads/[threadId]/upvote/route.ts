import { NextRequest, NextResponse } from "next/server";

export function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; threadId: string }> },
) {
  return params.then(({ threadId }) => {
    return NextResponse.json({ success: true, threadId });
  });
}
