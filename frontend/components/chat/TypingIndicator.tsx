"use client";

import React from "react";

interface TypingIndicatorProps {
  typingUsers: { userId: number; displayName: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  let label = "";
  if (typingUsers.length === 1) {
    label = `${typingUsers[0].displayName.split(" ")[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    label = `${typingUsers[0].displayName.split(" ")[0]} and ${typingUsers[1].displayName.split(" ")[0]} are typing...`;
  } else {
    label = `${typingUsers.length} people are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-1 select-none animate-in fade-in">
      <div className="bg-light-bubble dark:bg-dark-bubble rounded-bubble px-3 py-2 flex items-center gap-1 shadow-subtle">
        <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" />
      </div>
      <span className="text-[11.5px] font-normal text-slate-400 dark:text-zinc-500 italic">
        {label}
      </span>
    </div>
  );
}
