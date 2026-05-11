import { NextRequest, NextResponse } from "next/server";

const liveFrames: Map<string, { frame: string; timestamp: number }> = new Map();

const FRAME_TTL = 30000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json(
        { error: "examId query parameter is required" },
        { status: 400 }
      );
    }

    const entry = liveFrames.get(examId);

    if (!entry || Date.now() - entry.timestamp > FRAME_TTL) {
      liveFrames.delete(examId);
      return NextResponse.json({ frame: null });
    }

    return NextResponse.json({ frame: entry.frame });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId, frame } = body;

    if (!examId || !frame) {
      return NextResponse.json(
        { error: "examId and frame are required" },
        { status: 400 }
      );
    }

    if (typeof examId !== "string" || typeof frame !== "string") {
      return NextResponse.json(
        { error: "Invalid input types" },
        { status: 400 }
      );
    }

    liveFrames.set(examId, { frame, timestamp: Date.now() });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
