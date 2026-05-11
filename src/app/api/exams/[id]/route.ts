import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const examResult = await query<{
      id: string; subject: string; duration: number; link: string | null;
      camera_required: boolean; admin_id: string; created_at: string;
    }>(
      "SELECT id, subject, duration, link, camera_required, admin_id, created_at FROM exams WHERE id = $1",
      [id]
    );

    const exam = examResult.rows[0];

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    const questionsResult = await query<{
      id: string; question: string; option_a: string;
      option_b: string; option_c: string; option_d: string;
    }>(
      "SELECT id, question, option_a, option_b, option_c, option_d FROM questions WHERE exam_id = $1 ORDER BY sort_order ASC",
      [id]
    );

    const studentExam = {
      id: exam.id,
      subject: exam.subject,
      duration: exam.duration,
      link: exam.link,
      cameraRequired: exam.camera_required,
      questions: questionsResult.rows.map((q) => ({
        id: q.id,
        question: q.question,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAns: null,
        explanation: null,
      })),
    };

    return NextResponse.json(studentExam);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { link } = body;

    if (link === undefined || link === null) {
      return NextResponse.json(
        { error: "Link field is required" },
        { status: 400 }
      );
    }

    if (typeof link !== "string") {
      return NextResponse.json(
        { error: "Link must be a string" },
        { status: 400 }
      );
    }

    const existing = await query("SELECT id FROM exams WHERE id = $1", [id]);

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    const result = await query<{
      id: string; subject: string; duration: number; link: string | null;
      camera_required: boolean; admin_id: string; created_at: string;
    }>(
      "UPDATE exams SET link = $1 WHERE id = $2 RETURNING id, subject, duration, link, camera_required, admin_id, created_at",
      [link, id]
    );

    const exam = result.rows[0];

    return NextResponse.json({
      id: exam.id,
      subject: exam.subject,
      duration: exam.duration,
      link: exam.link,
      cameraRequired: exam.camera_required,
      adminId: exam.admin_id,
      createdAt: exam.created_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
