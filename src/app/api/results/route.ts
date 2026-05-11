import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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

    const results = await query<{
      id: string; exam_id: string; student_name: string; marks: number;
      total_marks: number; percentage: number; feedback: string;
      answers: unknown; cheater: boolean; created_at: string; subject: string;
    }>(
      `SELECT r.id, r.exam_id, r.student_name, r.marks, r.total_marks, r.percentage, r.feedback, r.answers, r.cheater, r.created_at, e.subject
       FROM results r
       JOIN exams e ON r.exam_id = e.id
       WHERE e.admin_id = $1
       ORDER BY r.created_at DESC`,
      [adminId]
    );

    return NextResponse.json(
      results.rows.map((r) => ({
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
        exam: { subject: r.subject },
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
    const { examId, studentName, answers, cheater } = body;

    if (!examId || !studentName) {
      return NextResponse.json(
        { error: "examId and studentName are required" },
        { status: 400 }
      );
    }

    if (typeof examId !== "string" || typeof studentName !== "string") {
      return NextResponse.json(
        { error: "Invalid input types" },
        { status: 400 }
      );
    }

    if (studentName.trim().length === 0) {
      return NextResponse.json(
        { error: "Student name cannot be empty" },
        { status: 400 }
      );
    }

    const examResult = await query<{
      id: string; subject: string; duration: number;
    }>(
      "SELECT id, subject, duration FROM exams WHERE id = $1",
      [examId]
    );

    const exam = examResult.rows[0];

    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    const questionsResult = await query<{
      id: string; question: string; option_a: string; option_b: string;
      option_c: string; option_d: string; correct_ans: string; explanation: string | null;
    }>(
      "SELECT id, question, option_a, option_b, option_c, option_d, correct_ans, explanation FROM questions WHERE exam_id = $1 ORDER BY sort_order ASC",
      [examId]
    );

    const questions = questionsResult.rows;

    const studentAnswers: Record<string, string> = answers && typeof answers === "object" ? answers : {};
    let marks = 0;
    const answerList: Array<{
      question: string;
      selected: string;
      correct: string;
      explanation: string;
    }> = [];

    questions.forEach((q, idx) => {
      const selected = studentAnswers[String(idx)] || "Not Answered";
      const isCorrect = selected === q.correct_ans;
      if (isCorrect) marks += 1;

      const optionKey = `option_${selected.toLowerCase()}` as keyof typeof q;
      const selectedText = selected === "Not Answered"
        ? selected
        : (q[optionKey] as string) || selected;

      const correctKey = `option_${q.correct_ans.toLowerCase()}` as keyof typeof q;
      const correctText = q[correctKey] as string;

      answerList.push({
        question: q.question,
        selected: selectedText,
        correct: correctText,
        explanation: q.explanation || "",
      });
    });

    const totalMarks = questions.length;
    const percentage = totalMarks > 0 ? Math.round((marks / totalMarks) * 100) : 0;
    const feedback =
      percentage >= 90
        ? "Excellent!"
        : percentage >= 75
        ? "Good Job!"
        : percentage >= 50
        ? "Average"
        : "Needs Improvement";

    const result = await query<{
      id: string; exam_id: string; student_name: string; marks: number;
      total_marks: number; percentage: number; feedback: string;
      answers: unknown; cheater: boolean; created_at: string;
    }>(
      `INSERT INTO results (exam_id, student_name, marks, total_marks, percentage, feedback, answers, cheater)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING id, exam_id, student_name, marks, total_marks, percentage, feedback, answers, cheater, created_at`,
      [examId, studentName.trim(), marks, totalMarks, percentage, feedback, JSON.stringify(answerList), cheater === true]
    );

    const row = result.rows[0];

    return NextResponse.json(
      {
        id: row.id,
        examId: row.exam_id,
        studentName: row.student_name,
        marks: row.marks,
        totalMarks: row.total_marks,
        percentage: row.percentage,
        feedback: row.feedback,
        answers: row.answers,
        cheater: row.cheater,
        createdAt: row.created_at,
        exam: { subject: exam.subject },
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
