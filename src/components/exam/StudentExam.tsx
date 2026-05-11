"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  AlertTriangle,
  Clock,
  User,
  BookOpen,
  Send,
  Shield,
  Maximize,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import {
  createFaceMesh,
  type FaceMeshInstance,
  type FaceMeshResults,
  type FaceMeshLandmark,
} from "@/lib/mediapipe-loader";
import {
  estimateHeadPose,
  HeadPoseSmoother,
  HeadTurnDetector,
  type HeadPose,
} from "@/lib/head-pose";

interface QuestionData {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAns?: string;
  explanation?: string;
}

interface ExamData {
  id: string;
  subject: string;
  duration: number;
  cameraRequired: boolean;
  questions: QuestionData[];
}

function enterFullscreen() {
  const el = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
  };
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

const fmt = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

export default function StudentExam() {
  const { setView, currentExam, studentName, setStudentName, setExamResult } =
    useAppStore();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [examStarted, setExamStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [cheater, setCheater] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState(0);

  const [faceDetected, setFaceDetected] = useState(false);
  const [multiFace, setMultiFace] = useState(false);
  const [headPoseDisplay, setHeadPoseDisplay] = useState<HeadPose>({
    yaw: 0,
    pitch: 0,
    roll: 0,
  });
  const [headTurnActive, setHeadTurnActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMeshInstance | null>(null);
  const animFrameRef = useRef<number>(0);
  const autoSubmitRef = useRef(false);
  const warningsRef = useRef(0);
  const selectedAnswersRef = useRef<Record<number, string>>({});
  const submittingRef = useRef(false);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasOffscreenRef = useRef<HTMLCanvasElement | null>(null);
  const examRef = useRef<ExamData | null>(null);
  const nameInputRef = useRef("");
  const submittedRef = useRef(false);

  const smootherRef = useRef<HeadPoseSmoother>(new HeadPoseSmoother(0.25));
  const detectorRef = useRef<HeadTurnDetector>(
    new HeadTurnDetector(60, 1000, 10000)
  );
  const lastProcessTimeRef = useRef(0);
  const PROCESS_INTERVAL = 80;

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    examRef.current = exam;
  }, [exam]);

  useEffect(() => {
    nameInputRef.current = nameInput;
  }, [nameInput]);

  const examId = currentExam?.id || "";
  const sName = nameInput || studentName || "Unknown";

  const logProctorEvent = useCallback(
    async (eventType: string, eventDetail: string) => {
      try {
        await fetch("/api/proctor-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId,
            studentName: sName,
            eventType,
            eventDetail,
          }),
        });
      } catch {}
    },
    [examId, sName]
  );

  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return null;
    if (!canvasOffscreenRef.current) {
      canvasOffscreenRef.current = document.createElement("canvas");
    }
    const c = canvasOffscreenRef.current;
    c.width = 320;
    c.height = 240;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 320, 240);
    return c.toDataURL("image/jpeg", 0.6);
  }, []);

  const doSubmitRef = useRef<((isCheater: boolean) => void) | null>(null);

  const handleAutoSubmit = useCallback(() => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    setCheater(true);
    toast.error("Auto-submitted due to cheating");
    setTimeout(() => {
      if (doSubmitRef.current) {
        doSubmitRef.current(true);
      }
    }, 0);
  }, []);

  const addCheatWarning = useCallback(
    (reason: string) => {
      if (warningsRef.current >= 3) return;
      warningsRef.current += 1;
      setWarnings(warningsRef.current);
      toast.error(`Warning ${warningsRef.current}/3: ${reason}`, {
        duration: 4000,
      });
      logProctorEvent("cheat_warning", reason);

      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance("Warning. Please do not cheat.");
        u.rate = 0.9;
        u.pitch = 0.8;
        u.volume = 1;
        speechSynthesis.speak(u);
      }

      if (warningsRef.current >= 3) {
        handleAutoSubmit();
      }
    },
    [logProctorEvent, handleAutoSubmit]
  );

  const drawFaceOverlay = useCallback(
    (landmarks: FaceMeshLandmark[], width: number, height: number) => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const isTurn = headTurnActive;

      ctx.fillStyle = isTurn
        ? "rgba(239, 68, 68, 0.6)"
        : "rgba(16, 185, 129, 0.5)";
      const keyPoints = [1, 33, 263, 234, 454, 10, 152, 61, 291];
      for (const idx of keyPoints) {
        const lm = landmarks[idx];
        if (!lm) continue;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.strokeStyle = isTurn
        ? "rgba(239, 68, 68, 0.4)"
        : "rgba(16, 185, 129, 0.35)";
      ctx.lineWidth = 1.2;
      const jawIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
        379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
        234, 127, 162, 21, 54, 103, 67, 109, 10,
      ];
      ctx.beginPath();
      for (let i = 0; i < jawIndices.length; i++) {
        const lm = landmarks[jawIndices[i]];
        if (!lm) continue;
        const px = lm.x * width;
        const py = lm.y * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const leftEye = [
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160,
        161, 246, 33,
      ];
      const rightEye = [
        263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387,
        388, 466, 263,
      ];
      for (const eyeIdxs of [leftEye, rightEye]) {
        ctx.beginPath();
        for (let i = 0; i < eyeIdxs.length; i++) {
          const lm = landmarks[eyeIdxs[i]];
          if (!lm) continue;
          const px = lm.x * width;
          const py = lm.y * height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      const nose = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];
      if (nose && leftEar && rightEar) {
        const earMidX = ((leftEar.x + rightEar.x) / 2) * width;
        const earMidY = ((leftEar.y + rightEar.y) / 2) * height;
        const nosePx = nose.x * width;
        const nosePy = nose.y * height;

        const arrowLen = 20;
        const dx = nosePx - earMidX;
        const norm = Math.sqrt(dx * dx + 1);
        const arrowEndX = nosePx + (dx / norm) * arrowLen;
        const arrowEndY = nosePy;

        ctx.strokeStyle = isTurn
          ? "rgba(239, 68, 68, 0.8)"
          : "rgba(16, 185, 129, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nosePx, nosePy);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        const headLen = 5;
        const angle = Math.atan2(0, arrowEndX - nosePx);
        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
          arrowEndX - headLen * Math.cos(angle - Math.PI / 6),
          arrowEndY - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
          arrowEndX - headLen * Math.cos(angle + Math.PI / 6),
          arrowEndY - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    },
    [headTurnActive]
  );

  const onFaceMeshResults = useCallback(
    (results: FaceMeshResults) => {
      const faces = results.multiFaceLandmarks || [];

      if (faces.length === 0) {
        setFaceDetected(false);
        setMultiFace(false);
        setHeadTurnActive(false);
        const canvas = overlayCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      const landmarks = faces[0];
      setFaceDetected(true);
      setMultiFace(faces.length > 1);

      drawFaceOverlay(landmarks, results.imageWidth, results.imageHeight);

      const rawPose = estimateHeadPose(landmarks);
      const smoothed = smootherRef.current.smooth(rawPose);
      setHeadPoseDisplay(smoothed);

      const { isViolating, shouldFlag, durationMs } =
        detectorRef.current.check(smoothed.yaw);
      setHeadTurnActive(isViolating);

      if (shouldFlag) {
        const direction =
          smoothed.yaw > 0 ? "right" : "left";
        const reason = `Head turned ${direction} (${Math.abs(smoothed.yaw).toFixed(0)}°) for ${(durationMs / 1000).toFixed(1)}s`;
        addCheatWarning(reason);

        const snapshot = captureSnapshot();
        logProctorEvent(
          "head_turn_violation",
          JSON.stringify({
            yaw: Math.round(smoothed.yaw),
            pitch: Math.round(smoothed.pitch),
            durationMs: Math.round(durationMs),
            direction,
            snapshot: snapshot ? snapshot.substring(0, 100) + "..." : null,
            timestamp: new Date().toISOString(),
          })
        );
      }

      if (faces.length > 1) {
        logProctorEvent(
          "multiple_faces",
          `Detected ${faces.length} faces`
        );
      }
    },
    [
      drawFaceOverlay,
      addCheatWarning,
      logProctorEvent,
      captureSnapshot,
    ]
  );

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraReady(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      return true;
    } catch {
      setCameraBlocked(true);
      toast.error("Camera access denied");
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
    setCameraReady(false);
    setMpReady(false);
  }, []);

  const handleFSRef = useRef<() => void>(() => {});

  const doSubmit = useCallback((isCheater: boolean) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    submittedRef.current = true;
    setSubmitted(true);
    stopCamera();
    if (document.fullscreenElement) {
      document.removeEventListener("fullscreenchange", handleFSRef.current);
      document.exitFullscreen().catch(() => {});
    }

    const currentExamData = examRef.current;
    if (!currentExamData) {
      submittingRef.current = false;
      setSubmitted(false);
      return;
    }

    const answers = selectedAnswersRef.current;

    fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: currentExamData.id,
        studentName: nameInputRef.current || studentName || "Unknown",
        answers,
        cheater: isCheater,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        return res.json();
      })
      .then((result) => {
        setExamResult({
          ...result,
          examId: currentExamData.id,
          exam: { subject: currentExamData.subject },
        });
        setView("result");
      })
      .catch(() => {
        toast.error("Submission failed. Please try again.");
        submittingRef.current = false;
        submittedRef.current = false;
        setSubmitted(false);
      });
  }, [stopCamera, studentName, setExamResult, setView]);

  doSubmitRef.current = doSubmit;

  const initMediaPipe = useCallback(async () => {
    if (faceMeshRef.current) return;
    setMpLoading(true);
    setMpError(null);

    try {
      const fm = await createFaceMesh(onFaceMeshResults);
      faceMeshRef.current = fm;
      setMpReady(true);
      setMpLoading(false);

      const processLoop = () => {
        const video = videoRef.current;
        const fmInstance = faceMeshRef.current;

        if (!video || !fmInstance || !streamRef.current || video.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(processLoop);
          return;
        }

        const now = performance.now();
        if (now - lastProcessTimeRef.current >= PROCESS_INTERVAL) {
          lastProcessTimeRef.current = now;
          fmInstance.send({ image: video }).catch(() => {});
        }

        animFrameRef.current = requestAnimationFrame(processLoop);
      };

      animFrameRef.current = requestAnimationFrame(processLoop);
    } catch (err: unknown) {
      setMpError(err instanceof Error ? err.message : "Failed to initialize face detection");
      setMpLoading(false);
      toast.error("Face detection could not start. Exam continues without proctoring.", {
        duration: 5000,
      });
    }
  }, [onFaceMeshResults]);

  const uploadFrame = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    if (!canvasOffscreenRef.current) {
      canvasOffscreenRef.current = document.createElement("canvas");
    }
    const c = canvasOffscreenRef.current;
    c.width = 320;
    c.height = 240;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    const base64 = c.toDataURL("image/jpeg", 0.5);
    try {
      await fetch("/api/live-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: examId, frame: base64 }),
      });
    } catch {}
  }, [examId]);

  useEffect(() => {
    if (!examStarted) return;

    const handleVis = () => {
      if (submittedRef.current) return;
      if (document.hidden && warningsRef.current < 3) {
        addCheatWarning("Tab switch detected");
      }
    };
    document.addEventListener("visibilitychange", handleVis);

    const handleKey = (e: KeyboardEvent) => {
      if (submittedRef.current) return;
      if (warningsRef.current >= 3) return;
      const blocked =
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && "cvaIJC".includes(e.key) && !e.shiftKey) ||
        (e.ctrlKey && e.shiftKey && "IJC".includes(e.key)) ||
        (e.ctrlKey && e.key === "u") ||
        [
          "F1", "F2", "F3", "F4", "F5", "F6",
          "F7", "F8", "F9", "F10", "F11", "F12",
        ].includes(e.key);
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        addCheatWarning("Suspicious keyboard shortcut");
      }
    };
    document.addEventListener("keydown", handleKey, true);

    const handleCtx = (e: MouseEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
      if (warningsRef.current < 3) addCheatWarning("Right-click disabled");
    };
    document.addEventListener("contextmenu", handleCtx);

    const handleFS = () => {
      if (submittedRef.current) return;
      if (!document.fullscreenElement) {
        logProctorEvent("fullscreen_exit", "User exited fullscreen; re-entering");
        enterFullscreen();
      }
    };
    handleFSRef.current = handleFS;
    document.addEventListener("fullscreenchange", handleFS);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("contextmenu", handleCtx);
      document.removeEventListener("fullscreenchange", handleFS);
    };
  }, [examStarted, addCheatWarning, logProctorEvent]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const eId = currentExam?.id;
        if (!eId) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/exams/${eId}`);
        const data = await res.json();
        setExam(data);
        setTimeLeft(data.duration * 60);
      } catch {
        toast.error("Failed to load exam");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [currentExam]);

  useEffect(() => {
    if (!examStarted || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (doSubmitRef.current) {
            doSubmitRef.current(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, submitted]);

  const handleStart = async () => {
    if (!nameInput.trim()) return toast.error("Enter your name");
    setStudentName(nameInput);

    if (exam?.cameraRequired) {
      const camOk = await startCamera();
      if (!camOk) {
        toast.error(
          "Camera is required for this exam. Please allow camera access to continue."
        );
        return;
      }
    }

    setExamStarted(true);

    try {
      enterFullscreen();
    } catch {}

    if (exam?.cameraRequired) {
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 300);

      setTimeout(() => {
        initMediaPipe();
      }, 1500);

      setTimeout(() => {
        if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = setInterval(() => uploadFrame(), 2000);
      }, 2000);
    }

    logProctorEvent("exam_start", `Student ${nameInput} started exam`);
  };

  const handleNextQuestion = () => {
    if (!exam) return;
    if (currentQIndex < exam.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0f] text-white px-6 text-center">
        <GraduationCap className="w-16 h-16 text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Exam Not Found</h2>
        <p className="text-slate-400 mb-6">Invalid or removed exam link.</p>
        <Button
          onClick={() => setView("landing")}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl"
        >
          Go Home
        </Button>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0f] text-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/15">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-1">{exam.subject}</h2>
            <p className="text-slate-200 text-sm">
              {exam.questions.length} Questions &middot; {exam.duration} Minutes
            </p>
          </div>

          <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200 uppercase tracking-wider">
                  Your Full Name
                </label>
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-emerald-500/15 rounded-xl h-11"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10">
                <p className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                  <Maximize className="w-4 h-4" /> Exam runs in fullscreen mode
                </p>
              </div>

              {exam.cameraRequired && (
                <>
                  <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/10">
                    <p className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                      <Camera className="w-4 h-4" /> Camera is required — MediaPipe Face Mesh
                      will monitor your face in real time (100% browser-side, no data
                      sent to external servers)
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/[0.06] border border-red-500/10">
                    <p className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Turning your head more than
                      60° for over 1 second = cheating warning. 3 warnings =
                      auto-submit.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/[0.06] border border-red-500/10">
                    <p className="text-xs text-red-300 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Tab switch, fullscreen exit,
                      suspicious keys = warnings. 3 warnings = auto-submit.
                    </p>
                  </div>
                  {cameraBlocked && (
                    <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                      <p className="text-xs text-red-300 font-bold flex items-center gap-1.5">
                        <Camera className="w-4 h-4" /> Camera access was denied. You
                        must allow camera to start this exam.
                      </p>
                    </div>
                  )}
                </>
              )}

              {!exam.cameraRequired && (
                <div className="p-3 rounded-xl bg-slate-500/[0.06] border border-slate-500/10">
                  <p className="text-xs text-slate-200 font-medium">
                    Camera proctoring is not enabled for this exam.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleStart}
            disabled={exam.cameraRequired && cameraBlocked}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl h-12 text-base font-semibold shadow-lg shadow-emerald-500/15 disabled:opacity-50"
          >
            Start Exam
          </Button>
        </motion.div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0f] text-white px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-bold mb-2">Submitting Exam...</h2>
          <p className="text-slate-200 text-sm">Please wait while your answers are being processed</p>
          {cheater && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-300 text-sm font-medium">Exam auto-submitted due to cheating detection</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const currentQ = exam.questions[currentQIndex];
  const isLastQuestion = currentQIndex === exam.questions.length - 1;
  const answeredCount = Object.keys(selectedAnswers).length;

  const absYaw = Math.abs(headPoseDisplay.yaw);
  const yawColor =
    absYaw > 60
      ? "text-red-400"
      : absYaw > 40
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0a0a0f] text-white">
      <header className="w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.04] bg-[#0a0a0f]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium truncate">{nameInput}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 ${timeLeft < 60 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}
          />
          <span
            className={`text-lg font-mono font-bold ${timeLeft < 60 ? "text-red-400" : "text-emerald-400"}`}
          >
            {fmt(timeLeft)}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-sm font-medium truncate">{exam.subject}</span>
        </div>
      </header>

      {warnings > 0 && (
        <div
          className={`px-4 py-2 text-center text-xs font-medium ${warnings >= 3 ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
          Warnings: {warnings}/3{" "}
          {warnings >= 3 ? "— Auto-submitted!" : ""}
        </div>
      )}

      {exam.cameraRequired && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-52 h-40 rounded-xl object-cover bg-black"
              style={{
                border: `2px solid ${
                  headTurnActive
                    ? "rgba(239, 68, 68, 0.6)"
                    : !faceDetected
                      ? "rgba(251, 191, 36, 0.5)"
                      : "rgba(16, 185, 129, 0.3)"
                }`,
                boxShadow: headTurnActive
                  ? "0 8px 25px rgba(239,68,68,0.25)"
                  : "0 8px 25px rgba(16,185,129,0.1)",
              }}
            />

            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 w-52 h-40 rounded-xl pointer-events-none"
              style={{ zIndex: 1 }}
            />

            {cameraReady && (
              <div
                className="absolute top-1.5 left-1.5 flex items-center gap-1.5 bg-red-500/80 px-2 py-0.5 rounded-md"
                style={{ zIndex: 2 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[9px] text-white font-medium">LIVE</span>
              </div>
            )}

            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}

            {cameraReady && mpLoading && (
              <div
                className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-md"
                style={{ zIndex: 2 }}
              >
                <Loader2 className="w-2.5 h-2.5 text-amber-300 animate-spin" />
                <span className="text-[8px] text-amber-300">Loading...</span>
              </div>
            )}

            {cameraReady && !mpLoading && (
              <div
                className="absolute bottom-1 left-1 right-1 text-center"
                style={{ zIndex: 2 }}
              >
                <Badge
                  className="text-[8px] h-4 px-1.5"
                  style={{
                    backgroundColor: headTurnActive
                      ? "rgba(239,68,68,0.8)"
                      : !faceDetected
                        ? "rgba(251,191,36,0.7)"
                        : "rgba(16,185,129,0.7)",
                    color: "white",
                  }}
                >
                  {headTurnActive
                    ? "HEAD TURN"
                    : !faceDetected
                      ? "NO FACE"
                      : multiFace
                        ? "MULTIPLE FACES"
                        : "MONITORING"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Question {currentQIndex + 1} of {exam.questions.length}
              </span>
            </div>
            <span className="text-xs text-slate-200">
              {answeredCount}/{exam.questions.length} answered
            </span>
          </div>

          <div className="w-full bg-white/[0.04] rounded-full h-1 mb-6">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${((currentQIndex + 1) / exam.questions.length) * 100}%` }}
            />
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-6 leading-relaxed">{currentQ.question}</h2>
            <div className="space-y-3">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const val = (currentQ as Record<string, string>)[`option${opt}`];
                const isSelected = selectedAnswers[currentQIndex] === opt;
                return (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      setSelectedAnswers((prev) => ({ ...prev, [currentQIndex]: opt }))
                    }
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                      isSelected
                        ? "bg-emerald-500/[0.08] border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                        : "bg-white/[0.015] border-white/[0.06] hover:bg-white/[0.03] hover:border-white/[0.1]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : "bg-white/[0.06] text-slate-400"
                      }`}
                    >
                      {opt}
                    </div>
                    <span className={`text-sm ${isSelected ? "text-white font-medium" : "text-slate-200"}`}>
                      {val}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrevQuestion}
              disabled={currentQIndex === 0}
              variant="ghost"
              className="text-slate-200 hover:text-white hover:bg-white/5 gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={() => {
                  if (doSubmitRef.current) doSubmitRef.current(false);
                }}
                disabled={submittingRef.current}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-500/15"
              >
                <Send className="w-4 h-4 mr-1.5" /> Submit Exam
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-500/15 gap-1.5"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
