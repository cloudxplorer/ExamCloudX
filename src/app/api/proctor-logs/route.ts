import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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

    const logs = await query<{
      id: string; exam_id: string; student_name: string;
      event_type: string; event_detail: string | null; created_at: string;
    }>(
      "SELECT id, exam_id, student_name, event_type, event_detail, created_at FROM proctor_logs WHERE exam_id = $1 ORDER BY created_at DESC LIMIT 100",
      [examId]
    );

    return NextResponse.json(
      logs.rows.map((l) => ({
        id: l.id,
        examId: l.exam_id,
        studentName: l.student_name,
        eventType: l.event_type,
        eventDetail: l.event_detail,
        createdAt: l.created_at,
      }))
    );
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
    const { examId, studentName, eventType, eventDetail } = body;

    if (!examId || !studentName || !eventType) {
      return NextResponse.json(
        { error: "examId, studentName, and eventType are required" },
        { status: 400 }
      );
    }

    if (typeof examId !== "string" || typeof studentName !== "string" || typeof eventType !== "string") {
      return NextResponse.json(
        { error: "Invalid input types" },
        { status: 400 }
      );
    }

    if (studentName.trim().length === 0 || eventType.trim().length === 0) {
      return NextResponse.json(
        { error: "Student name and event type cannot be empty" },
        { status: 400 }
      );
    }

    const examResult = await query("SELECT id FROM exams WHERE id = $1", [examId]);
    if (examResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    const result = await query<{
      id: string; exam_id: string; student_name: string;
      event_type: string; event_detail: string | null; created_at: string;
    }>(
      `INSERT INTO proctor_logs (exam_id, student_name, event_type, event_detail)
       VALUES ($1, $2, $3, $4)
       RETURNING id, exam_id, student_name, event_type, event_detail, created_at`,
      [examId, studentName.trim(), eventType.trim(), eventDetail ? String(eventDetail) : null]
    );

    const log = result.rows[0];

    return NextResponse.json(
      {
        log: {
          id: log.id,
          examId: log.exam_id,
          studentName: log.student_name,
          eventType: log.event_type,
          eventDetail: log.event_detail,
          createdAt: log.created_at,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
