"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import LandingPage from "@/components/exam/LandingPage";
import AuthPage from "@/components/exam/AuthPage";
import ExamBuilder from "@/components/exam/ExamBuilder";
import AdminDashboard from "@/components/exam/AdminDashboard";
import StudentExam from "@/components/exam/StudentExam";
import ResultPage from "@/components/exam/ResultPage";

export default function Home() {
  const { view, setView, setCurrentExam, setAdmin } = useAppStore();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = localStorage.getItem("examcloudx_admin");
      const token = localStorage.getItem("examcloudx_token");

      const params = new URLSearchParams(window.location.search);
      const examId = params.get("exam");

      if (stored && token) {
        try {
          const res = await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          if (!cancelled && res.ok) {
            const data = await res.json();
            if (data.valid && data.user) {
              const admin = { id: data.user.id, email: data.user.email || "", name: data.user.name || "" };
              setAdmin(admin);
              localStorage.setItem("examcloudx_admin", JSON.stringify(admin));

              if (examId) {
                setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
                setView("exam");
              } else {
                setView("admin");
              }
            } else {
              localStorage.removeItem("examcloudx_admin");
              localStorage.removeItem("examcloudx_token");
              setAdmin(null);

              if (examId) {
                setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
                setView("exam");
              }
            }
          } else if (!cancelled) {
            localStorage.removeItem("examcloudx_admin");
            localStorage.removeItem("examcloudx_token");
            setAdmin(null);

            if (examId) {
              setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
              setView("exam");
            }
          }
        } catch {
          if (!cancelled) {
            try {
              const admin = JSON.parse(stored);
              setAdmin(admin);
              if (examId) {
                setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
                setView("exam");
              } else {
                setView("admin");
              }
            } catch {
              localStorage.removeItem("examcloudx_admin");
              localStorage.removeItem("examcloudx_token");
              if (examId) {
                setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
                setView("exam");
              }
            }
          }
        }
      } else if (stored) {
        try {
          const admin = JSON.parse(stored);
          setAdmin(admin);

          if (examId) {
            setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
            setView("exam");
          } else {
            setView("admin");
          }
        } catch {
          localStorage.removeItem("examcloudx_admin");
          if (examId) {
            setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
            setView("exam");
          }
        }
      } else if (examId) {
        setCurrentExam({ id: examId, subject: "", duration: 0, questions: [], cameraRequired: false });
        setView("exam");
      }

      if (!cancelled) {
        setRestoring(false);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [setAdmin, setCurrentExam, setView]);

  if (restoring) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  switch (view) {
    case "landing":
      return <LandingPage />;
    case "auth":
      return <AuthPage />;
    case "builder":
      return <ExamBuilder />;
    case "admin":
      return <AdminDashboard />;
    case "exam":
      return <StudentExam />;
    case "result":
      return <ResultPage />;
    default:
      return <LandingPage />;
  }
}
