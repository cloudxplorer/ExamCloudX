import { create } from "zustand";

type View = "landing" | "auth" | "builder" | "admin" | "exam" | "result";

interface QuestionInput {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAns: string;
  explanation: string;
}

interface ExamData {
  id: string;
  subject: string;
  duration: number;
  link?: string | null;
  cameraRequired: boolean;
  questions: QuestionInput[];
}

interface ResultData {
  id: string;
  studentName: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  feedback: string;
  cheater: boolean;
  examId: string;
  answers?: string;
  exam?: { subject: string };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  view: View;
  setView: (view: View) => void;
  currentExam: ExamData | null;
  setCurrentExam: (exam: ExamData | null) => void;
  studentName: string;
  setStudentName: (name: string) => void;
  selectedAnswers: Record<number, string>;
  setSelectedAnswers: (answers: Record<number, string>) => void;
  examResult: ResultData | null;
  setExamResult: (result: ResultData | null) => void;
  examLink: string;
  setExamLink: (link: string) => void;
  admin: AdminUser | null;
  setAdmin: (admin: AdminUser | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "landing",
  setView: (view) => set({ view }),
  currentExam: null,
  setCurrentExam: (exam) => set({ currentExam: exam }),
  studentName: "",
  setStudentName: (name) => set({ studentName: name }),
  selectedAnswers: {},
  setSelectedAnswers: (answers) => set({ selectedAnswers: answers }),
  examResult: null,
  setExamResult: (result) => set({ examResult: result }),
  examLink: "",
  setExamLink: (link) => set({ examLink: link }),
  admin: null,
  setAdmin: (admin) => set({ admin }),
}));
