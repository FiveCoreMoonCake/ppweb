"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signInWithGoogle, signUp, signInWithPassword, resetPassword } = useAuth();

  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace(redirect);
    }
  }, [user, loading, redirect, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setSubmitting(true);
    setMessage(null);

    if (isRegister) {
      const { error, needsConfirmation } = await signUp(email.trim(), password);
      if (error) {
        setMessage({ type: "err", text: error });
      } else if (needsConfirmation) {
        setMessage({ type: "ok", text: "注册成功！请查收确认邮件，点击链接后即可登录" });
      }
      // If no confirmation needed, onAuthStateChange will auto-redirect
    } else {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) {
        setMessage({ type: "err", text: error === "Invalid login credentials" ? "邮箱或密码不正确" : error });
      }
    }
    setSubmitting(false);
  }

  // Show nothing while checking auth state
  if (loading || user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-800 text-center tracking-tight">
            登录 PP 学习工具箱
          </h1>
          <p className="text-sm text-slate-500 text-center mt-2">
            登录后即可使用全部学习工具
          </p>

          {/* Google login */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-8 w-full flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-indigo-300 transition-all duration-200 cursor-pointer"
          >
            <GoogleIcon />
            使用 Google 账号登录
          </button>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-slate-400">或</span>
            </div>
          </div>

          {/* Email + Password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="email" className="sr-only">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow disabled:opacity-60"
            />
            <label htmlFor="password" className="sr-only">
              密码
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder={isRegister ? "设置密码（至少 6 位）" : "密码"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isRegister ? "注册中…" : "登录中…"}
                </span>
              ) : (
                isRegister ? "注册" : "登录"
              )}
            </button>
          </form>

          {/* Toggle login / register */}
          <p className="mt-4 text-center text-sm text-slate-500">
            {isRegister ? "已有账号？" : "没有账号？"}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setMessage(null); }}
              className="ml-1 text-indigo-600 font-medium hover:underline cursor-pointer"
            >
              {isRegister ? "去登录" : "注册新账号"}
            </button>
          </p>

          {/* Forgot password — also used for existing Magic Link users to set a password */}
          {!isRegister && (
            <p className="mt-2 text-center">
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  if (!email.trim()) { setMessage({ type: "err", text: "请先输入邮箱地址" }); return; }
                  setSubmitting(true); setMessage(null);
                  const { error } = await resetPassword(email.trim());
                  setMessage(error
                    ? { type: "err", text: error }
                    : { type: "ok", text: "密码重置邮件已发送，请查收" }
                  );
                  setSubmitting(false);
                }}
                className="text-xs text-slate-400 hover:text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
              >
                忘记密码 / 设置密码
              </button>
            </p>
          )}

          {/* Feedback message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                message.type === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-center text-xs text-slate-400">
          登录即表示你同意我们的使用条款
        </p>
      </motion.div>
    </div>
  );
}

/** Inline Google "G" logo SVG */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
