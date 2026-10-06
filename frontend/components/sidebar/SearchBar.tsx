"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search conversations...",
}: SearchBarProps) {
  return (
    <div className="px-3 py-2 bg-white dark:bg-dark-panel select-none">
      <div className="relative flex items-center bg-slate-100/80 dark:bg-dark-surface rounded-xl px-3 py-1.5 focus-within:ring-1.5 focus-within:ring-signal-500/50 transition-all border border-transparent focus-within:border-signal-500/30">
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 mr-2 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[13px] text-light-text dark:text-dark-text placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-dark-hover text-slate-400 dark:text-zinc-400 transition-colors"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
