"use client";

import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, char: string) => {
    // Only allow digits
    const cleaned = char.replace(/[^0-9]/g, "");
    if (!cleaned) {
      // Emptying the box
      const nextDigits = [...digits];
      nextDigits[index] = "";
      onChange(nextDigits.join(""));
      return;
    }

    const lastChar = cleaned[cleaned.length - 1];
    const nextDigits = [...digits];
    nextDigits[index] = lastChar;
    const nextVal = nextDigits.join("");
    onChange(nextVal);

    // Auto-advance to next input
    if (index < 5 && lastChar) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current box is empty, jump to previous and delete
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        onChange(nextDigits.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasteData) return;

    onChange(pasteData);
    const targetIndex = Math.min(pasteData.length, 5);
    inputsRef.current[targetIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl sm:rounded-2xl border transition-all outline-none ${
            hasError
              ? "border-rose-400 dark:border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/30"
              : digits[i]
              ? "border-signal-500 bg-signal-50/30 dark:bg-signal-950/20 text-light-text dark:text-[#f3f4f6] focus:ring-2 focus:ring-signal-500/40"
              : "border-light-border dark:border-[#2d2d34] bg-[#f8f9fa] dark:bg-[#26262b] text-light-text dark:text-[#f3f4f6] focus:border-signal-500 focus:ring-2 focus:ring-signal-500/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      ))}
    </div>
  );
}
