"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Search,
  Trash2,
  Eye,
  FileText,
  Users,
  BookOpen,
  AlertTriangle,
  LogOut,
  Plus,
  Camera,
  Video,
  VideoOff,
  RefreshCw,
  Shield,
  UserCheck,
  FileDown,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface ExamRecord {
  id: string;
  subject: string;
  duration: number;
  link?: string | null;
  cameraRequired: boolean;
  createdAt: string;
  questions: { id: string }[];
  results: ResultRecord[];
}

interface ResultRecord {
  id: string;
  studentName: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  feedback: string;
  cheater: boolean;
  createdAt: string;
  examId: string;
  answers?: string;
  exam?: { subject: string };
}

interface ProctorLog {
  id: string;
  studentName: string;
  eventType: string;
  eventDetail: string;
  createdAt: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEventDetail(eventType: string, eventDetail: string | null): string {
  const typeLabel = eventType.replace(/_/g, " ");

  if (!eventDetail) return typeLabel;

  try {
    const parsed = JSON.parse(eventDetail);

    if (eventType === "head_turn_violation") {
      const dir = parsed.direction || "unknown";
      const yaw = parsed.yaw != null ? Math.abs(parsed.yaw) : "?";
      const dur = parsed.durationMs != null ? (parsed.durationMs / 1000).toFixed(1) : "?";
      return `Head turned ${dir} (${yaw}°) for ${dur}s`;
    }

    if (eventType === "fullscreen_exit") {
      return "Exited fullscreen — re-entering";
    }

    if (eventType === "multiple_faces") {
      return `Multiple faces detected`;
    }

    const { snapshot, ...rest } = parsed;
    const summary = Object.entries(rest)
      .map(([k, v]) => `${k}: ${String(v).substring(0, 50)}`)
      .join(", ");
    return summary ? `${typeLabel} — ${summary}` : typeLabel;
  } catch {
    const truncated = eventDetail.length > 120 ? eventDetail.substring(0, 120) + "…" : eventDetail;
    return `${typeLabel} — ${truncated}`;
  }
}

export default function AdminDashboard() {
  const { setView, admin, setAdmin } = useAppStore();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [proctorExam, setProctorExam] = useState<string | null>(null);
  const [proctorLogs, setProctorLogs] = useState<ProctorLog[]>([]);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const liveFrameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!admin) {
      setView("auth");
    }
  }, [admin, setView]);

  useEffect(() => {
    if (!admin?.id) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/exams?adminId=${admin.id}`),
      fetch(`/api/results?adminId=${admin.id}`),
    ])
      .then(([examRes, resultRes]) => Promise.all([examRes.json(), resultRes.json()]))
      .then(([examData, resultData]) => {
        if (!cancelled) {
          setExams(examData);
          setResults(resultData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load data");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [admin]);

  const fetchData = useCallback(async () => {
    if (!admin?.id) return;
    setLoading(true);
    try {
      const [examRes, resultRes] = await Promise.all([
        fetch(`/api/exams?adminId=${admin.id}`),
        fetch(`/api/results?adminId=${admin.id}`),
      ]);
      setExams(await examRes.json());
      setResults(await resultRes.json());
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [admin]);

  const fetchProctorLogs = useCallback(async (examId: string) => {
    try {
      const res = await fetch(`/api/proctor-logs?examId=${examId}`);
      const data = await res.json();
      setProctorLogs(Array.isArray(data) ? data : []);
    } catch {
      setProctorLogs([]);
    }
  }, []);

  const fetchLiveFrame = useCallback(async (examId: string) => {
    try {
      const res = await fetch(`/api/live-frame?examId=${examId}`);
      const data = await res.json();
      if (data.frame) {
        setLiveFrame(data.frame);
      }
    } catch {
      setLiveFrame(null);
    }
  }, []);

  const deleteExam = async (id: string) => {
    await fetch(`/api/exams?id=${id}`, { method: "DELETE" });
    toast.success("Exam deleted");
    fetchData();
  };

  const deleteResult = async (id: string) => {
    await fetch(`/api/results/${id}`, { method: "DELETE" });
    toast.success("Result deleted");
    fetchData();
  };

  const downloadResultPDF = useCallback((r: ResultRecord) => {
    const subject = r.exam?.subject || "Unknown";
    const grade = r.percentage >= 90 ? "A+" : r.percentage >= 75 ? "A" : r.percentage >= 50 ? "B" : "F";

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Result - ${escapeHtml(r.studentName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;color:#1a1a2e;background:#fff;max-width:700px;margin:0 auto}
.header{text-align:center;padding-bottom:30px;border-bottom:3px solid #10b981;margin-bottom:30px}
.logo{font-size:32px;font-weight:800;color:#10b981;letter-spacing:-0.5px}
.logo-sub{font-size:11px;color:#6b7280;margin-top:2px;letter-spacing:2px;text-transform:uppercase}
.sub{font-size:14px;color:#6b7280;margin-top:6px}
.info{display:flex;justify-content:space-between;padding:20px;background:#f0fdf4;border-radius:12px;margin-bottom:25px;border:1px solid #d1fae5}
.info-item{text-align:center;flex:1}
.info-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px}
.info-value{font-size:15px;font-weight:700;color:#1a1a2e;margin-top:3px}
.cheat{background:#fef2f2;color:#dc2626;padding:12px;border-radius:8px;text-align:center;font-weight:700;margin-bottom:20px;border:1px solid #fecaca}
.result-box{text-align:center;padding:30px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-radius:16px;margin-bottom:25px;border:1px solid #d1fae5}
.score{font-size:48px;font-weight:800;color:#10b981}
.detail{font-size:15px;color:#374151;margin-top:8px}
.fb{font-size:13px;color:#6b7280;margin-top:6px;font-style:italic}
.grade-badge{display:inline-block;margin-top:10px;padding:4px 16px;border-radius:20px;font-weight:700;font-size:14px;background:${r.percentage >= 50 ? "#d1fae5" : "#fecaca"};color:${r.percentage >= 50 ? "#065f46" : "#991b1b"}}
.footer{text-align:center;margin-top:30px;padding-top:20px;border-top:2px solid #e5e7eb;color:#9ca3af;font-size:11px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header"><div class="logo">ExamCloudX</div><div class="logo-sub">Examination Platform</div><div class="sub">Examination Result Report</div></div>
<div class="info">
<div class="info-item"><div class="info-label">Student</div><div class="info-value">${escapeHtml(r.studentName)}</div></div>
<div class="info-item"><div class="info-label">Subject</div><div class="info-value">${escapeHtml(subject)}</div></div>
<div class="info-item"><div class="info-label">Date</div><div class="info-value">${new Date(r.createdAt).toLocaleDateString()}</div></div>
</div>
${r.cheater ? '<div class="cheat">FLAGGED FOR CHEATING</div>' : ""}
<div class="result-box">
<div class="score">${r.percentage}%</div>
<div class="detail">${r.marks} / ${r.totalMarks} correct</div>
<div class="fb">${escapeHtml(r.feedback)}</div>
<div class="grade-badge">Grade: ${grade}</div>
</div>
<div class="footer">ExamCloudX &middot; Generated ${new Date().toLocaleDateString()}</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }, []);

  const handleLogout = () => {
    setAdmin(null);
    localStorage.removeItem("examcloudx_admin");
    localStorage.removeItem("examcloudx_token");
    toast.success("Logged out");
    setView("landing");
  };

  const toggleProctorView = async (examId: string) => {
    if (proctorExam === examId) {
      setProctorExam(null);
      setProctorLogs([]);
      setLiveFrame(null);
      if (liveFrameIntervalRef.current) {
        clearInterval(liveFrameIntervalRef.current);
        liveFrameIntervalRef.current = null;
      }
      return;
    }

    setProctorExam(examId);
    fetchProctorLogs(examId);
  };

  useEffect(() => {
    if (proctorExam) {
      const interval = setInterval(() => fetchProctorLogs(proctorExam), 5000);
      return () => clearInterval(interval);
    }
  }, [proctorExam, fetchProctorLogs]);

  useEffect(() => {
    if (proctorExam) {
      const initialTimeout = setTimeout(() => fetchLiveFrame(proctorExam), 0);
      liveFrameIntervalRef.current = setInterval(() => fetchLiveFrame(proctorExam), 2000);
      return () => {
        clearTimeout(initialTimeout);
        if (liveFrameIntervalRef.current) {
          clearInterval(liveFrameIntervalRef.current);
          liveFrameIntervalRef.current = null;
        }
      };
    }
  }, [proctorExam, fetchLiveFrame]);

  const filteredExams = exams.filter((e) => e.subject.toLowerCase().includes(search.toLowerCase()));

  if (!admin) return null;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0a0f] text-white">
      <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/[0.06] sticky top-0 z-30 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">ExamCloudX</span>
          <Badge className="bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/15 hidden sm:inline-flex">{admin.name || admin.email}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setView("builder")} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Exam
          </Button>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs gap-1.5">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-3xl font-bold mb-1">Dashboard</h2>
          <p className="text-slate-200 mb-8 text-sm">Your exams and student results</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/12 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{exams.length}</p>
                  <p className="text-slate-200 text-xs">Total Exams</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/12 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{results.length}</p>
                  <p className="text-slate-200 text-xs">Submissions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/12 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{results.filter((r) => r.cheater).length}</p>
                  <p className="text-slate-200 text-xs">Cheating Flags</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exams..." className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-emerald-500/15 rounded-xl h-11 pl-11" />
            </div>
          </div>

          {proctorExam && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Card className="bg-white/[0.02] border-emerald-500/15 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="font-semibold text-white">Live Proctor Monitor</p>
                        <p className="text-xs text-slate-200">Real-time student camera feed and proctoring events</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleProctorView(proctorExam)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs">
                      <VideoOff className="w-3.5 h-3.5 mr-1.5" /> Close Monitor
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-200 uppercase tracking-wider mb-2">Student Live Feed</p>
                      <div className="relative w-full max-w-[320px] rounded-xl overflow-hidden bg-black border border-white/[0.06]" style={{ aspectRatio: "4/3" }}>
                        {liveFrame ? (
                          <img src={liveFrame} alt="Student live feed" className="w-full h-full object-contain" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <UserCheck className="w-10 h-10 text-slate-500 mb-2" />
                            <p className="text-slate-400 text-xs">Waiting for student camera...</p>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/80 px-2 py-0.5 rounded-md">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span className="text-[10px] text-white font-medium">LIVE</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-200 uppercase tracking-wider">Proctor Events</p>
                        <Button variant="ghost" size="sm" onClick={() => fetchProctorLogs(proctorExam)} className="h-6 text-xs text-slate-200 hover:text-white">
                          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {proctorLogs.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-xs">No proctor events yet</div>
                        ) : (
                          proctorLogs.map((log) => (
                            <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${["cheat_warning", "head_turn_violation", "multiple_faces"].includes(log.eventType) ? "text-red-400" : "text-amber-400"}`} />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p className="text-xs font-medium text-white truncate">{log.studentName}</p>
                                <p className="text-[10px] text-slate-200 break-all line-clamp-3">{formatEventDetail(log.eventType, log.eventDetail)}</p>
                                <p className="text-[9px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {filteredExams.length === 0 && (
                <div className="text-center py-16 text-slate-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No exams found</p></div>
              )}
              {filteredExams.map((exam) => {
                const examResults = results.filter((r) => r.examId === exam.id);
                const isExpanded = expandedExam === exam.id;
                return (
                  <motion.div key={exam.id} layout>
                    <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl overflow-hidden hover:border-emerald-500/15 transition-all duration-300">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white flex items-center gap-2">
                                {exam.subject}
                                {exam.cameraRequired && (
                                  <Badge className="bg-amber-500/10 text-amber-300 text-[9px] h-4 px-1.5 gap-0.5 border-amber-500/15">
                                    <Camera className="w-2.5 h-2.5" /> Cam
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-xs text-slate-200">{exam.duration} min &middot; {exam.questions.length} Qs &middot; {examResults.length} results</p>
                              {exam.link && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Link className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <code className="text-[10px] text-emerald-300 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded truncate max-w-[200px]">{exam.link}</code>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(exam.link || ""); toast.success("Link copied!"); }}
                                    className="text-[9px] text-slate-400 hover:text-white px-1 py-0.5 rounded hover:bg-white/10 transition-colors"
                                  >
                                    Copy
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {exam.cameraRequired && (
                              <Button variant="ghost" size="sm" onClick={() => toggleProctorView(exam.id)} className={`text-slate-400 hover:text-white hover:bg-white/5 h-8 rounded-xl text-xs gap-1 ${proctorExam === exam.id ? "bg-emerald-500/10 text-emerald-300" : ""}`}>
                                <Video className="w-3.5 h-3.5" /> Monitor
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setExpandedExam(isExpanded ? null : exam.id)} className="text-slate-400 hover:text-white hover:bg-white/5 h-8 rounded-xl text-xs gap-1">
                              <Eye className="w-3.5 h-3.5" /> Results
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteExam(exam.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-5 border-t border-white/[0.04] pt-4">
                              {examResults.length === 0 ? (
                                <p className="text-slate-400 text-xs text-center py-4">No submissions yet</p>
                              ) : (
                                <div className="space-y-2.5">
                                  {examResults.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between bg-white/[0.015] rounded-xl p-3.5 border border-white/[0.04]">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${r.cheater ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                          {r.studentName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-white flex items-center gap-1.5">
                                            {r.studentName}
                                            {r.cheater && <Badge variant="destructive" className="text-[8px] h-3.5 px-1">Cheater</Badge>}
                                          </p>
                                          <p className="text-[11px] text-slate-200">{r.marks}/{r.totalMarks} &middot; {r.percentage}% &middot; {r.feedback}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Button variant="ghost" size="sm" onClick={() => downloadResultPDF(r)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 w-7 p-0" title="Download PDF">
                                          <FileDown className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => deleteResult(r.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
