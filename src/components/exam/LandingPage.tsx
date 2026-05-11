"use client";

import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Shield, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

const features = [
  {
    icon: BookOpen,
    title: "Create & Manage Exams",
    desc: "Build custom MCQ exams with our intuitive builder. Upload questions via JSON, set durations, toggle camera proctoring, and generate shareable links — all from your own workspace.",
  },
  {
    icon: Shield,
    title: "Browser-Based Proctoring",
    desc: "MediaPipe Face Mesh runs entirely in the browser to detect faces and track head orientation in real time. No data is sent to external servers — students must comply if camera is enabled.",
  },
  {
    icon: Award,
    title: "Results & PDF Reports",
    desc: "Instant grading with detailed feedback. Download professional PDF reports. Admins see all submissions, cheating flags, and analytics in a private dashboard.",
  },
];

export default function LandingPage() {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#0a0a0f] text-white">
      <header className="w-full max-w-full px-6 py-5 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/15">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            ExamCloudX
          </span>
        </div>
        <Button
          onClick={() => setView("auth")}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl px-6 h-10 font-medium shadow-lg shadow-emerald-500/15"
        >
          Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </header>

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15 text-emerald-300 text-sm font-medium mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online Examination Platform
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]">
              Build, Proctor &
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Evaluate Exams
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto mb-10 leading-relaxed">
              A production-grade examination system with browser-based proctoring, multi-admin workspaces, fullscreen enforcement, and professional PDF reports.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <Button
                onClick={() => setView("auth")}
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-8 py-6 text-lg rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.03]"
              >
                Get Started <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.6 }}
                className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-7 hover:bg-white/[0.03] hover:border-emerald-500/15 transition-all duration-500"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/12 to-teal-500/12 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
                <p className="text-slate-200 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-full px-6 py-5 border-t border-white/[0.04] text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} ExamCloudX by Pallavi Thakur. All Rights Reserved.
      </footer>
    </div>
  );
}
