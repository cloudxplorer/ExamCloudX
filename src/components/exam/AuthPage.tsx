"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export default function AuthPage() {
  const { setView, setAdmin } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return toast.error("Fill all fields");
    if (!isLogin && !name.trim()) return toast.error("Enter your name");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const body = isLogin ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const adminUser = {
          id: data.user?.id || `local_${Date.now()}`,
          email: data.user?.email || email,
          name: data.user?.name || name || email.split("@")[0],
        };
        setAdmin(adminUser);
        localStorage.setItem("examcloudx_admin", JSON.stringify(adminUser));
        if (data.token) {
          localStorage.setItem("examcloudx_token", data.token);
        }
        toast.success(isLogin ? "Welcome back!" : "Account created!");
        setView("admin");
      } else {
        toast.error(data.error || "Authentication failed");
      }
    } catch {
      toast.error("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#0a0a0f] text-white">
      <header className="w-full max-w-full px-6 py-5 flex items-center gap-3 border-b border-white/[0.04]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">ExamCloudX</span>
      </header>

      <main className="flex-1 w-full max-w-full overflow-x-hidden flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/15">
              {isLogin ? <Lock className="w-7 h-7 text-white" /> : <User className="w-7 h-7 text-white" />}
            </div>
            <h2 className="text-2xl font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className="text-slate-200 mt-2 text-sm">
              {isLogin ? "Sign in to your workspace" : "Sign up to start creating exams"}
            </p>
          </div>

          <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
            <CardContent className="p-6 space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-emerald-500/15 rounded-xl h-11 pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="you@example.com"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-emerald-500/15 rounded-xl h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Min 6 characters"
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-400 focus:border-emerald-500/40 focus:ring-emerald-500/15 rounded-xl h-11 pl-10 pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl h-11 font-semibold shadow-lg shadow-emerald-500/15 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"} <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-200 mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
