"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { OtpInput } from "@/components/auth/OtpInput";

const DEMO_USERS = [
  { username: "demo", name: "Demo User" },
  { username: "sarah", name: "Sarah Jenkins" },
  { username: "alex", name: "Alex Chen" },
  { username: "priya", name: "Priya Sharma" },
  { username: "john", name: "John Doe" },
  { username: "david", name: "David Miller" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const { validateCredentials, verifyOtp, resendOtp } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 credentials
  const [usernameOrPhone, setUsernameOrPhone] = useState("");
  const [password, setPassword] = useState("");

  // Target user details returned by backend password validation
  const [targetPhone, setTargetPhone] = useState("");
  const [targetName, setTargetName] = useState("");

  // Step 2 OTP
  const [otp, setOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Handle redirected from verified registration
  useEffect(() => {
    const verified = searchParams.get("verified");
    const user = searchParams.get("user");
    if (verified === "true") {
      setInfoMessage("Account verified! Please sign in with your password to continue.");
      if (user) {
        setUsernameOrPhone(user);
      }
    }
  }, [searchParams]);

  // Step 1: Password authentication comes FIRST
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrPhone.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // Validate credentials against backend. User does NOT enter chat yet.
      const data = await validateCredentials(
        usernameOrPhone.trim(),
        password || undefined,
        null
      );

      setTargetPhone(data.phone);
      setTargetName(data.display_name);
      setStep(2);
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      const statusText = err.response?.status ? `(HTTP ${err.response.status})` : "";
      const netMsg = err.message || err.code || "Network error";
      if (serverDetail) {
        setErrorMessage(typeof serverDetail === "string" ? serverDetail : JSON.stringify(serverDetail));
      } else if (err.response?.status) {
        setErrorMessage(`Server error ${statusText}: ${err.response.statusText || "Request failed"}`);
      } else {
        setErrorMessage(`Connection failed (${netMsg}). Unable to reach authentication server.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: OTP verification comes SECOND. Only after BOTH is user authenticated.
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // Backend validates OTP code (123456) and returns JWT token
      await verifyOtp(targetPhone || usernameOrPhone.trim(), otp.trim());
      // verifyOtp in AuthContext saves JWT session and redirects to /chat
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      const statusText = err.response?.status ? `(HTTP ${err.response.status})` : "";
      const netMsg = err.message || err.code || "Network error";
      if (serverDetail) {
        setErrorMessage(typeof serverDetail === "string" ? serverDetail : JSON.stringify(serverDetail));
      } else if (err.response?.status) {
        setErrorMessage(`Server error ${statusText}: ${err.response.statusText || "Request failed"}`);
      } else {
        setErrorMessage(`Connection failed (${netMsg}). Unable to reach authentication server.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Demo Login: Fills credentials and validates password FIRST, advancing to OTP
  const handleQuickDemoSelect = async (username: string) => {
    setUsernameOrPhone(username);
    setPassword("DemoPass123!");
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const data = await validateCredentials(username, "DemoPass123!", null);
      setTargetPhone(data.phone);
      setTargetName(data.display_name);
      setStep(2);
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      const statusText = err.response?.status ? `(HTTP ${err.response.status})` : "";
      const netMsg = err.message || err.code || "Network error";
      if (serverDetail) {
        setErrorMessage(typeof serverDetail === "string" ? serverDetail : JSON.stringify(serverDetail));
      } else if (err.response?.status) {
        setErrorMessage(`Server error ${statusText}: ${err.response.statusText || "Request failed"}`);
      } else {
        setErrorMessage(`Connection failed (${netMsg}). Unable to reach authentication server.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code handler
  const handleResendOtp = async () => {
    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await resendOtp(targetPhone || usernameOrPhone.trim());
      setInfoMessage(res.message || "New code sent. Demo OTP: 123456");
      setOtp("");
      setTimeout(() => setInfoMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Could not resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const [showForgotModal, setShowForgotModal] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f2f4f7] dark:bg-[#121214]">
      <div className="w-full max-w-md bg-white dark:bg-[#1b1b1e] rounded-3xl shadow-xl border border-light-border dark:border-[#2d2d34] p-8 flex flex-col transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-signal-500 text-white flex items-center justify-center shadow-lg shadow-signal-500/25 mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f3f4f6] tracking-tight">
            {step === 1 ? "Secure Messaging" : "Verify your login"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8e8e93] mt-1 flex items-center gap-1.5">
            {step === 1 ? (
              <span>Welcome back</span>
            ) : (
              <span>Enter the 6-digit verification code</span>
            )}
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium text-center animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Info / Success notification */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center animate-in fade-in flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Forgot Password Notice */}
        {showForgotModal && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs text-center animate-in fade-in">
            <p className="font-semibold mb-0.5">Password Reset Placeholder</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Demo accounts use password: <strong className="font-mono">DemoPass123!</strong> or you can create a fresh account via Register.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="mt-1.5 text-[11px] underline font-semibold text-amber-800 dark:text-amber-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {step === 1 ? (
          /* STEP 1: Enter Username/Phone & Password */
          <>
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1">
                  Username / Phone Number
                </label>
                <input
                  type="text"
                  value={usernameOrPhone}
                  onChange={(e) => setUsernameOrPhone(e.target.value)}
                  placeholder="e.g. demo or +1234567001"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="DemoPass123!"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !usernameOrPhone.trim()}
                className="w-full py-2.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-all shadow-md shadow-signal-500/20 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="border-white" />
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Forgot password placeholder & Register link */}
              <div className="flex items-center justify-between text-xs pt-1 text-slate-500 dark:text-[#8e8e93]">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="hover:underline text-slate-500 dark:text-[#8e8e93]"
                >
                  Forgot password?
                </button>
                <p>
                  <span>New here? </span>
                  <Link
                    href="/register"
                    className="font-semibold text-signal-600 dark:text-signal-400 hover:underline"
                  >
                    Register
                  </Link>
                </p>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#26262b]">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-[#8e8e93] uppercase tracking-wider mb-2 text-center">
                Quick Demo Accounts (Pass: DemoPass123!)
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleQuickDemoSelect(u.username)}
                    className="py-1.5 px-2 text-xs font-medium rounded-lg bg-[#f0f2f5] hover:bg-signal-100 dark:bg-[#26262b] dark:hover:bg-signal-950/80 text-slate-700 dark:text-[#dedee3] hover:text-signal-600 transition-colors truncate text-center"
                    title={`Login as ${u.name}`}
                  >
                    {u.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* STEP 2: 6-Digit OTP Verification Screen */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {/* Demo OTP Pill */}
            <div className="p-3.5 rounded-2xl bg-[#e6efff] dark:bg-signal-950/60 border border-signal-200 dark:border-signal-800 text-center">
              <p className="text-xs text-signal-700 dark:text-signal-300 font-medium">
                Demo OTP: <strong className="font-mono text-signal-900 dark:text-signal-100 font-bold">123456</strong>
              </p>
              <button
                type="button"
                onClick={() => setOtp("123456")}
                className="mt-1 text-xs text-signal-700 dark:text-signal-300 underline font-semibold hover:text-signal-900 transition-colors"
              >
                Autofill 123456
              </button>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="py-2">
              <OtpInput
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                hasError={!!errorMessage}
                disabled={isLoading}
                autoFocus={true}
              />
              {otp.length > 0 && otp.length < 6 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center mt-1">
                  Please enter all 6 digits
                </p>
              )}
            </div>

            {/* Verify OTP Button */}
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-2.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full transition-all shadow-md shadow-signal-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="border-white" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 dark:text-[#8e8e93]">
                Didn&apos;t receive a code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending || isLoading}
                  className="font-semibold text-signal-600 dark:text-signal-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Resend code</span>
                </button>
              </p>
            </div>

            {/* Back to Login Credentials */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#26262b] text-center">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setErrorMessage(null);
                }}
                className="text-xs text-slate-500 dark:text-[#8e8e93] hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to login</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f2f4f7] dark:bg-[#121214]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

