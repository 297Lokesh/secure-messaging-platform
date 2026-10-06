"use client";

import React from "react";
import { MessageSquare, ShieldCheck, Lock } from "lucide-react";

interface EmptyChatStateProps {
  onStartChat: () => void;
}

export function EmptyChatState({ onStartChat }: EmptyChatStateProps) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-dark-bg text-center select-none">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-dark-surface text-signal-500 flex items-center justify-center mb-5 shadow-subtle border border-light-border dark:border-dark-border">
        <MessageSquare className="w-7 h-7" />
      </div>

      <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100 mb-1">
        Select a conversation
      </h2>

      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mb-5 leading-relaxed">
        Choose a conversation from the sidebar or start a new message to begin chatting securely.
      </p>

      <button
        onClick={onStartChat}
        className="px-4 py-2 bg-signal-500 hover:bg-signal-600 text-white text-xs font-semibold rounded-xl shadow-subtle transition-all active:scale-95"
      >
        New Message
      </button>

      <div className="mt-10 flex items-center gap-5 text-[11px] text-slate-400 dark:text-zinc-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Simulated E2E Encryption</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Private & Secure</span>
        </div>
      </div>
    </div>
  );
}
