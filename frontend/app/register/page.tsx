"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, ShieldCheck, ArrowRight, CheckCircle2, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { OtpInput } from "@/components/auth/OtpInput";

export default function RegisterPage() {
  const router = useRouter();
  const { register, verifyRegistrationOtp, resendOtp } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [identifier, setIdentifier] = useState(""); // Username OR Phone
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");

  // Target identifier confirmed by backend
  const [targetIdentifier, setTargetIdentifier] = useState("");

  // OTP State
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !displayName.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const isPhone = identifier.trim().startsWith("+") || /^\d+$/.test(identifier.trim().replace(/[\s-]/g, ""));

    try {
      const res = await register({
        username: isPhone ? undefined : identifier.trim(),
        phone: isPhone ? identifier.trim() : undefined,
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
        password,
      });

      const confirmedId = res.username || res.phone || identifier.trim();
      setTargetIdentifier(confirmedId);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || "Registration failed. Username or phone may already be registered."
      );
    } finally {
      setIsLoading(false);
    }
  };

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
      const res = await verifyRegistrationOtp(targetIdentifier || identifier.trim(), otp.trim());
      setIsVerified(true);
      setInfoMessage(res.message || "Account verified successfully! Redirecting to login...");

      // Required flow: Account verified -> Redirect to Login
      setTimeout(() => {
        router.push(`/login?verified=true&user=${encodeURIComponent(targetIdentifier || identifier.trim())}`);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || "Invalid OTP code. Please enter 123456."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await resendOtp(targetIdentifier || identifier.trim());
      setInfoMessage(res.message || "New code sent. Demo OTP: 123456");
      setOtp("");
      setTimeout(() => setInfoMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Could not resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f2f4f7] dark:bg-[#121214]">
      <div className="w-full max-w-md bg-white dark:bg-[#1b1b1e] rounded-3xl shadow-xl border border-light-border dark:border-[#2d2d34] p-8 flex flex-col transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-signal-500 text-white flex items-center justify-center shadow-lg shadow-signal-500/25 mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f3f4f6] tracking-tight">
            {step === 1 ? "Create Signal Account" : "Verify your account"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8e8e93] mt-1 flex items-center gap-1.5">
            {step === 1 ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Private & Encrypted Registration</span>
              </>
            ) : (
              <span>Enter the 6-digit code to continue</span>
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

        {step === 1 ? (
          /* Step 1: Account Information */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alice Walker"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1">
                Username OR Phone Number *
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. alicew OR +1234567890"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1">
                Profile Avatar URL (optional)
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-all shadow-md shadow-signal-500/20 flex items-center justify-center gap-2 mt-5"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="border-white" />
              ) : (
                <>
                  <span>Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Verification Screen */
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
                disabled={isLoading || isVerified}
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
              disabled={isLoading || otp.length !== 6 || isVerified}
              className="w-full py-2.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full transition-all shadow-md shadow-signal-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="border-white" />
              ) : isVerified ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Verified! Redirecting...</span>
                </>
              ) : (
                <span>Verify OTP</span>
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

            {/* Back to Login / Registration Details */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#8e8e93] pt-2 border-t border-slate-100 dark:border-[#26262b]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Edit details</span>
              </button>
              <Link href="/login" className="hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        )}

        {/* Login Link */}
        <p className="text-center text-xs text-slate-500 dark:text-[#8e8e93] mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-signal-600 dark:text-signal-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
