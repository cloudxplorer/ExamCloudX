import { NextRequest, NextResponse } from "next/server";
import { query, getClient } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json(
        { error: "adminId query parameter is required" },
        { status: 400 }
      );
    }

    const examsResult = await query<{
      id: string; subject: string; duration: number; link: string | null;
      camera_required: boolean; admin_id: string; created_at: string;
    }>(
      "SELECT id, subject, duration, link, camera_required, admin_id, created_at FROM exams WHERE admin_id = $1 ORDER BY created_at DESC",
      [adminId]
    );

    const exams: Record<string, unknown>[] = [];
    for (const exam of examsResult.rows) {
      const questionsResult = await query<{
        id: string; exam_id: string; question: string; option_a: string;
        option_b: string; option_c: string; option_d: string; correct_ans: string;
        explanation: string | null; sort_order: number;
      }>(
        "SELECT id, exam_id, question, option_a, option_b, option_c, option_d, correct_ans, explanation, sort_order FROM questions WHERE exam_id = $1 ORDER BY sort_order ASC",
        [exam.id]
      );

      const resultsResult = await query<{
        id: string; exam_id: string; student_name: string; marks: number;
        total_marks: number; percentage: number; feedback: string;
        answers: unknown; cheater: boolean; created_at: string;
      }>(
        "SELECT id, exam_id, student_name, marks, total_marks, percentage, feedback, answers, cheater, created_at FROM results WHERE exam_id = $1 ORDER BY created_at DESC",
        [exam.id]
      );

      exams.push({
        id: exam.id,
        subject: exam.subject,
        duration: exam.duration,
        link: exam.link,
        cameraRequired: exam.camera_required,
        adminId: exam.admin_id,
        createdAt: exam.created_at,
        questions: questionsResult.rows.map((q) => ({
          id: q.id,
          examId: q.exam_id,
          question: q.question,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          correctAns: q.correct_ans,
          explanation: q.explanation,
          sortOrder: q.sort_order,
        })),
        results: resultsResult.rows.map((r) => ({
          id: r.id,
          examId: r.exam_id,
          studentName: r.student_name,
          marks: r.marks,
          totalMarks: r.total_marks,
          percentage: r.percentage,
          feedback: r.feedback,
          answers: r.answers,
          cheater: r.cheater,
          createdAt: r.created_at,
        })),
      });
    }

    return NextResponse.json(exams);
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
    const { subject, duration, cameraRequired, adminId, questions } = body;

    if (!subject || !duration || !adminId) {
      return NextResponse.json(
        { error: "Subject, duration, and adminId are required" },
        { status: 400 }
      );
    }

    if (typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json(
        { error: "Subject must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof duration !== "number" || duration <= 0) {
      return NextResponse.json(
        { error: "Duration must be a positive number" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctAns) {
        return NextResponse.json(
          { error: `Question ${i + 1} is missing required fields` },
          { status: 400 }
        );
      }

      if (!["A", "B", "C", "D"].includes(q.correctAns)) {
        return NextResponse.json(
          { error: `Question ${i + 1} has invalid correctAns` },
          { status: 400 }
        );
      }
    }

    const adminResult = await query("SELECT id FROM admins WHERE id = $1", [adminId]);
    if (adminResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const examResult = await client.query<{
        id: string; subject: string; duration: number; link: string | null;
        camera_required: boolean; admin_id: string; created_at: string;
      }>(
        "INSERT INTO exams (subject, duration, camera_required, admin_id) VALUES ($1, $2, $3, $4) RETURNING id, subject, duration, link, camera_required, admin_id, created_at",
        [subject.trim(), duration, cameraRequired === true, adminId]
      );

      const exam = examResult.rows[0];

      const questionValues: string[] = [];
      const questionParams: unknown[] = [];
      let paramIdx = 1;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i] as Record<string, unknown>;
        questionValues.push(
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7})`
        );
        questionParams.push(
          exam.id,
          String(q.question),
          String(q.optionA),
          String(q.optionB),
          String(q.optionC),
          String(q.optionD),
          String(q.correctAns).toUpperCase(),
          q.explanation ? String(q.explanation) : null
        );
        paramIdx += 8;

        questionValues[questionValues.length - 1] =
          `($${paramIdx - 8}, $${paramIdx - 7}, $${paramIdx - 6}, $${paramIdx - 5}, $${paramIdx - 4}, $${paramIdx - 3}, $${paramIdx - 2}, $${paramIdx - 1})`;
      }

      const insertQuestionsQuery = `
        INSERT INTO questions (exam_id, question, option_a, option_b, option_c, option_d, correct_ans, explanation)
        VALUES ${questionValues.join(", ")}
        RETURNING id, exam_id, question, option_a, option_b, option_c, option_d, correct_ans, explanation, sort_order
      `;

      const questionsResult = await client.query(insertQuestionsQuery, questionParams);

      await client.query("COMMIT");

      return NextResponse.json(
        {
          id: exam.id,
          subject: exam.subject,
          duration: exam.duration,
          link: exam.link,
          cameraRequired: exam.camera_required,
          adminId: exam.admin_id,
          createdAt: exam.created_at,
          questions: questionsResult.rows.map((q) => ({
            id: q.id,
            examId: q.exam_id,
            question: q.question,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            correctAns: q.correct_ans,
            explanation: q.explanation,
            sortOrder: q.sort_order,
          })),
        },
        { status: 201 }
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Exam id query parameter is required" },
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

    await query("DELETE FROM exams WHERE id = $1", [id]);

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
