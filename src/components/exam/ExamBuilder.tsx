"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Plus,
  Trash2,
  Play,
  Save,
  Link,
  Camera,
  CameraOff,
  LogOut,
  BarChart3,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface QuestionInput {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAns: string;
  explanation: string;
}

const emptyQ = (): QuestionInput => ({
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAns: "A",
  explanation: "",
});

function parseJSONQuestions(d: any): QuestionInput[] | null {
  let questionsArray: any[] | null = null;

  if (Array.isArray(d)) {
    questionsArray = d;
  } else if (d && typeof d === "object") {
    if (Array.isArray(d.questions)) {
      questionsArray = d.questions;
    } else {
      return null;
    }
  } else {
    return null;
  }

  const parsed: QuestionInput[] = [];

  for (const q of questionsArray) {
    if (!q || typeof q !== "object" || !q.question) continue;

    let optionA = "";
    let optionB = "";
    let optionC = "";
    let optionD = "";
    let correctAns = "A";

    if (Array.isArray(q.options) && q.options.length >= 4) {
      optionA = String(q.options[0] || "");
      optionB = String(q.options[1] || "");
      optionC = String(q.options[2] || "");
      optionD = String(q.options[3] || "");

      if (q.answer) {
        const ans = String(q.answer);
        if (ans === optionA) correctAns = "A";
        else if (ans === optionB) correctAns = "B";
        else if (ans === optionC) correctAns = "C";
        else if (ans === optionD) correctAns = "D";
        else if (["A", "B", "C", "D"].includes(ans.toUpperCase())) {
          correctAns = ans.toUpperCase();
        } else {
          const idx = q.options.findIndex(
            (o: any) => String(o).trim().toLowerCase() === ans.trim().toLowerCase()
          );
          if (idx >= 0 && idx < 4) {
            correctAns = ["A", "B", "C", "D"][idx];
          }
        }
      } else if (q.correctAns) {
        const ca = String(q.correctAns);
        if (["A", "B", "C", "D"].includes(ca.toUpperCase())) {
          correctAns = ca.toUpperCase();
        }
      }
    } else {
      optionA = q.optionA || q.A || "";
      optionB = q.optionB || q.B || "";
      optionC = q.optionC || q.C || "";
      optionD = q.optionD || q.D || "";

      if (q.correctAns) {
        correctAns = String(q.correctAns).toUpperCase();
        if (!["A", "B", "C", "D"].includes(correctAns)) correctAns = "A";
      } else if (q.answer) {
        const ans = String(q.answer);
        if (ans === optionA) correctAns = "A";
        else if (ans === optionB) correctAns = "B";
        else if (ans === optionC) correctAns = "C";
        else if (ans === optionD) correctAns = "D";
        else if (["A", "B", "C", "D"].includes(ans.toUpperCase())) {
          correctAns = ans.toUpperCase();
        }
      } else if (q.correct) {
        const c = String(q.correct);
        if (c === optionA) correctAns = "A";
        else if (c === optionB) correctAns = "B";
        else if (c === optionC) correctAns = "C";
        else if (c === optionD) correctAns = "D";
        else if (["A", "B", "C", "D"].includes(c.toUpperCase())) {
          correctAns = c.toUpperCase();
        }
      }
    }

    parsed.push({
      question: String(q.question || ""),
      optionA,
      optionB,
      optionC,
      optionD,
      correctAns,
      explanation: String(q.explanation || ""),
    });
  }

  return parsed.length > 0 ? parsed : null;
}

export default function ExamBuilder() {
  const { setView, setCurrentExam, setExamLink, admin, setAdmin } = useAppStore();
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [cameraRequired, setCameraRequired] = useState(true);
  const [questions, setQuestions] = useState<QuestionInput[]>([emptyQ()]);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateQ = useCallback((i: number, f: string, v: string) => {
    setQuestions((prev) => {
      const u = [...prev];
      u[i] = { ...u[i], [f]: v };
      return u;
    });
  }, []);

  const addQ = () => setQuestions((p) => [...p, emptyQ()]);
  const removeQ = (i: number) => {
    if (questions.length <= 1) return;
    setQuestions((p) => p.filter((_, idx) => idx !== i));
  };

  const handleJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Please select a .json file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result;
        if (typeof raw !== "string") {
          toast.error("Failed to read file");
          return;
        }
        const d = JSON.parse(raw);

        if (d.subject) setSubject(d.subject);
        if (d.duration) setDuration(String(d.duration));
        if (d.cameraRequired !== undefined) setCameraRequired(d.cameraRequired);

        const parsed = parseJSONQuestions(d);
        if (parsed) {
          setQuestions(parsed);
          toast.success(`Loaded ${parsed.length} question${parsed.length > 1 ? "s" : ""} from JSON`);
        } else {
          toast.error("No valid questions found. Use format: [{question, options:[...], answer, explanation}]");
        }
      } catch {
        toast.error("Invalid JSON format. Please check your file.");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const saveExam = async () => {
    if (!subject.trim()) return toast.error("Enter subject name");
    if (!duration || Number(duration) <= 0) return toast.error("Enter valid duration");
    if (questions.some((q) => !q.question.trim() || !q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()))
      return toast.error("Fill all question fields");
    if (!admin?.id) return toast.error("Not authenticated");

    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, duration: Number(duration), questions, cameraRequired, adminId: admin.id }),
      });
      const exam = await res.json();
      if (res.ok) {
        setCurrentExam(exam);
        toast.success("Exam saved!");
      } else {
        toast.error(exam.error || "Failed to save exam");
      }
    } catch {
      toast.error("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const startExam = async () => {
    const cur = useAppStore.getState().currentExam;
    if (!cur) return toast.error("Save exam first");

    setStarting(true);
    try {
      const origin = window.location.origin;
      const longUrl = `${origin}/?exam=${cur.id}`;
      let link = longUrl;

      try {
        const shortRes = await fetch(`/api/shorten?url=${encodeURIComponent(longUrl)}`);
        const shortData = await shortRes.json();
        if (shortData.shortUrl) {
          link = shortData.shortUrl;
        }
      } catch {}

      await fetch(`/api/exams/${cur.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });

      setExamLink(link);
      setGeneratedLink(link);
      toast.success("Link generated & saved!");
    } catch {
      const fallback = `${window.location.origin}/?exam=${cur.id}`;
      setExamLink(fallback);
      setGeneratedLink(fallback);
      toast.success("Link generated!");
    } finally {
      setStarting(false);
    }
  };

  const handleLogout = () => {
    setAdmin(null);
    localStorage.removeItem("examcloudx_admin");
    localStorage.removeItem("examcloudx_token");
    toast.success("Logged out");
    setView("landing");
  };

  if (!admin) {
    setView("auth");
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0a0f] text-white">
      <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/[0.06] sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">ExamCloudX</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Badge className="bg-emerald-500/15 text-emerald-300 text-xs border border-emerald-500/20 px-3 py-1 hidden sm:inline-flex">
            {admin?.name || admin?.email || "Admin"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setView("admin")} className="text-slate-200 hover:text-white hover:bg-white/5 h-9 gap-1.5 text-xs">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 gap-1.5 text-xs">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-3xl font-bold mb-1">Exam Builder</h2>
          <p className="text-slate-200 mb-8 text-sm">Create your MCQ exam below</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-slate-200 text-sm font-medium">Subject Name</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200 text-sm font-medium">Duration (minutes)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 30"
                className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl h-11"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] mb-6">
            <div className="flex items-center gap-3">
              {cameraRequired ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                  <CameraOff className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-white">Camera Proctoring</p>
                <p className="text-xs text-slate-200">
                  {cameraRequired ? "Students must allow camera to start exam" : "Camera not required for this exam"}
                </p>
              </div>
            </div>
            <Switch checked={cameraRequired} onCheckedChange={setCameraRequired} />
          </div>

          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleJSON}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/25 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/12 to-teal-500/12 flex items-center justify-center group-hover:from-emerald-500/20 group-hover:to-teal-500/20 transition-all">
                <Upload className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">Upload JSON File</p>
                <p className="text-xs text-slate-400">Supports: {'[{"question","options":[...],"answer","explanation"}]'}</p>
              </div>
            </button>
          </div>

          <AnimatePresence>
            {questions.map((q, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="mb-5">
                <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Question {idx + 1}</span>
                      {questions.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeQ(idx)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Input
                        value={q.question}
                        onChange={(e) => updateQ(idx, "question", e.target.value)}
                        placeholder="Type your question..."
                        className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl h-11"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div key={opt} className="relative">
                            <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${q.correctAns === opt ? "bg-emerald-500 text-white" : "bg-white/[0.1] text-slate-400"}`}>
                              {opt}
                            </div>
                            <Input
                              value={q[`option${opt}` as keyof QuestionInput] || ""}
                              onChange={(e) => updateQ(idx, `option${opt}`, e.target.value)}
                              placeholder={`Option ${opt}`}
                              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl h-11 pl-12"
                            />
                            <button onClick={() => updateQ(idx, "correctAns", opt)} className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${q.correctAns === opt ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.05] text-slate-500 hover:bg-white/[0.1]"}`}>
                              {q.correctAns === opt ? "Correct" : "Set"}
                            </button>
                          </div>
                        ))}
                      </div>
                      <Textarea
                        value={q.explanation}
                        onChange={(e) => updateQ(idx, "explanation", e.target.value)}
                        placeholder="Explanation for the correct answer (optional)..."
                        className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl min-h-[60px] resize-y text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2.5 mb-8">
            <Button onClick={addQ} variant="outline" className="bg-white/[0.04] border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-emerald-500/25 rounded-xl h-10 text-sm">
              <Plus className="w-4 h-4 mr-1.5" /> Add Question
            </Button>
            <Button onClick={saveExam} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl h-10 shadow-lg shadow-emerald-500/15 text-sm">
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving..." : "Save Exam"}
            </Button>
            <Button onClick={startExam} disabled={starting} className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-xl h-10 shadow-lg shadow-cyan-500/15 text-sm">
              <Play className="w-4 h-4 mr-1.5" /> {starting ? "Generating..." : "Start Exam"}
            </Button>
          </div>

          {generatedLink && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <Card className="bg-emerald-500/[0.06] border-emerald-500/20 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <Link className="w-4 h-4 text-emerald-400 shrink-0" />
                  <code className="text-xs text-white bg-white/[0.06] px-3 py-1.5 rounded-lg break-all flex-1 min-w-0">{generatedLink}</code>
                  <Button
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Copied!"); }}
                    className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg h-7 text-xs"
                  >
                    Copy
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
