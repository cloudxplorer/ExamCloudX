"use client";

import { motion } from "framer-motion";
import { GraduationCap, Download, Award, TrendingUp, MessageSquare, Shield, BookOpen, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

export default function ResultPage() {
  const { examResult, setView } = useAppStore();

  if (!examResult) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0f] text-white px-6 text-center">
        <GraduationCap className="w-16 h-16 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Result</h2>
        <Button onClick={() => setView("landing")} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl mt-4">Go Home</Button>
      </div>
    );
  }

  const { studentName, marks, totalMarks, percentage, feedback, cheater } = examResult;
  const subject = examResult.exam?.subject || "Unknown";
  const answers: { question: string; selected: string; correct: string; explanation: string }[] = examResult.answers
    ? (typeof examResult.answers === "string" ? JSON.parse(examResult.answers) : examResult.answers)
    : [];

  const gradeColor = percentage >= 90 ? "from-emerald-400 to-teal-400" : percentage >= 75 ? "from-cyan-400 to-teal-400" : percentage >= 50 ? "from-amber-400 to-orange-400" : "from-red-400 to-rose-400";
  const gradeBg = percentage >= 90 ? "bg-emerald-500/10 text-emerald-300" : percentage >= 75 ? "bg-cyan-500/10 text-cyan-300" : percentage >= 50 ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300";

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    const questionRows = answers.map((a, i) => {
      const ok = a.selected === a.correct;
      return `<tr class="${ok ? "" : "wrong"}">
        <td>${i + 1}</td>
        <td>${escapeHtml(a.question)}</td>
        <td class="${ok ? "ok" : "no"}">${escapeHtml(a.selected)}</td>
        <td class="ok">${escapeHtml(a.correct)}</td>
        <td class="${ok ? "ok" : "no"}">${ok ? "Correct" : "Wrong"}</td>
      </tr>
      ${a.explanation ? `<tr class="exp-row"><td></td><td colspan="4" class="exp"><strong>Explanation:</strong> ${escapeHtml(a.explanation)}</td></tr>` : ""}`;
    }).join("");

    w.document.write(`<!DOCTYPE html><html><head><title>Result - ${escapeHtml(studentName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;color:#1a1a2e;background:#fff;max-width:900px;margin:0 auto}
.header{text-align:center;padding-bottom:30px;border-bottom:3px solid #10b981;margin-bottom:30px}
.logo{font-size:32px;font-weight:800;color:#10b981;letter-spacing:-0.5px}
.logo-sub{font-size:11px;color:#6b7280;margin-top:2px;letter-spacing:2px;text-transform:uppercase}
.sub{font-size:14px;color:#6b7280;margin-top:4px}
.info{display:flex;justify-content:space-between;padding:20px;background:#f0fdf4;border-radius:12px;margin-bottom:25px;border:1px solid #d1fae5}
.info-item{text-align:center;flex:1}
.info-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px}
.info-value{font-size:15px;font-weight:700;color:#1a1a2e;margin-top:3px}
.cheat{background:#fef2f2;color:#dc2626;padding:12px;border-radius:8px;text-align:center;font-weight:700;margin-bottom:20px;border:1px solid #fecaca}
.result-box{text-align:center;padding:30px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-radius:16px;margin-bottom:25px;border:1px solid #d1fae5}
.score{font-size:48px;font-weight:800;color:#10b981}
.detail{font-size:15px;color:#374151;margin-top:8px}
.fb{font-size:13px;color:#6b7280;margin-top:6px;font-style:italic}
h3{font-size:16px;font-weight:700;margin-bottom:12px;margin-top:10px;color:#1a1a2e}
table{width:100%;border-collapse:collapse;margin-bottom:30px}
th{background:#f9fafb;padding:10px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb}
td{padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;vertical-align:top;line-height:1.4}
.ok{color:#10b981;font-weight:600}
.no{color:#ef4444;font-weight:600}
.wrong td{background:#fef2f2}
.exp-row td{background:#f0fdf4 !important;border-bottom:1px solid #d1fae5}
.exp{color:#374151;font-size:12px;padding:8px 10px !important;line-height:1.5}
.exp strong{color:#0d9488}
.footer{text-align:center;margin-top:30px;padding-top:20px;border-top:2px solid #e5e7eb;color:#9ca3af;font-size:11px}
@media print{body{padding:20px}table{page-break-inside:auto}tr{page-break-inside:avoid;page-break-after:auto}}
</style></head><body>
<div class="header"><div class="logo">ExamCloudX</div><div class="logo-sub">Examination Platform</div><div class="sub">Examination Report</div></div>
<div class="info">
<div class="info-item"><div class="info-label">Student</div><div class="info-value">${escapeHtml(studentName)}</div></div>
<div class="info-item"><div class="info-label">Subject</div><div class="info-value">${escapeHtml(subject)}</div></div>
<div class="info-item"><div class="info-label">Date</div><div class="info-value">${new Date().toLocaleDateString()}</div></div>
</div>
${cheater ? '<div class="cheat">FLAGGED FOR CHEATING</div>' : ""}
<div class="result-box">
<div class="score">${percentage}%</div>
<div class="detail">${marks} / ${totalMarks} correct</div>
<div class="fb">${escapeHtml(feedback)}</div>
</div>
<h3>Answer Details with Explanations</h3>
<table><thead><tr><th>#</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Status</th></tr></thead>
<tbody>${questionRows}</tbody></table>
<div class="footer">ExamCloudX &middot; Generated ${new Date().toLocaleDateString()}</div>
</body></html>`);

    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0a0f] text-white">
      <header className="w-full px-4 sm:px-6 py-4 flex items-center gap-3 border-b border-white/[0.04]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">ExamCloudX</span>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/15"
            >
              <Award className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-1">Exam Complete</h2>
            <p className="text-slate-200 text-sm">{subject}</p>
          </div>

          {cheater && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/10 text-center">
              <Shield className="w-4 h-4 text-red-400 inline mr-1.5" />
              <span className="text-red-300 font-semibold text-sm">Flagged for cheating</span>
            </motion.div>
          )}

          <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl mb-6">
            <CardContent className="p-8 text-center">
              <div className={`text-6xl font-extrabold bg-gradient-to-r ${gradeColor} bg-clip-text text-transparent mb-2`}>{percentage}%</div>
              <p className="text-slate-200">{marks} / {totalMarks} correct</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4 ${gradeBg}`}>
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium text-sm">{feedback}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-white">{marks}</p>
                <p className="text-[10px] text-slate-200 mt-1">Marks</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
              <CardContent className="p-4 text-center">
                <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-white">{totalMarks}</p>
                <p className="text-[10px] text-slate-200 mt-1">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
              <CardContent className="p-4 text-center">
                <Badge className={`${percentage >= 50 ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"} text-sm px-3 py-1`}>
                  {percentage >= 90 ? "A+" : percentage >= 75 ? "A" : percentage >= 50 ? "B" : "F"}
                </Badge>
                <p className="text-[10px] text-slate-200 mt-2">Grade</p>
              </CardContent>
            </Card>
          </div>

          {answers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">Answer Summary with Explanations</h3>
              </div>
              <div className="space-y-3">
                {answers.map((a, i) => {
                  const ok = a.selected === a.correct;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-xl border p-4 ${ok ? "bg-emerald-500/[0.03] border-emerald-500/15" : "bg-red-500/[0.03] border-red-500/15"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white mb-2">
                            <span className="text-slate-400 mr-1.5">Q{i + 1}.</span>{a.question}
                          </p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mb-2">
                            <span className={ok ? "text-emerald-400" : "text-red-400"}>
                              Your answer: {a.selected} {ok ? "" : ""}
                            </span>
                            {!ok && (
                              <span className="text-emerald-400">
                                Correct: {a.correct}
                              </span>
                            )}
                          </div>
                          {a.explanation && (
                            <div className="mt-2 p-3 rounded-lg bg-teal-500/[0.06] border border-teal-500/15">
                              <div className="flex items-start gap-2">
                                <Lightbulb className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-teal-200 leading-relaxed">{a.explanation}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={downloadPDF}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl h-12 font-semibold shadow-lg shadow-emerald-500/15"
            >
              <Download className="w-4 h-4 mr-2" /> Download as PDF
            </Button>
            <Button
              onClick={() => setView("landing")}
              variant="outline"
              className="border-white/[0.1] text-slate-200 hover:bg-white/5 hover:text-white rounded-xl h-12 px-6"
            >
              Home
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
