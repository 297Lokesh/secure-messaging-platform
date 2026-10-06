"use client";

import React from "react";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = "md",
  isOnline,
  className,
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-7 h-7 text-[11px]",
    md: "w-10 h-10 text-xs font-semibold",
    lg: "w-12 h-12 text-sm font-semibold",
    xl: "w-20 h-20 text-lg font-bold",
  };

  const badgeSizes = {
    sm: "w-2 h-2 border-[1.5px] bottom-0 right-0",
    md: "w-3 h-3 border-2 bottom-0 right-0",
    lg: "w-3.5 h-3.5 border-2 bottom-0.5 right-0.5",
    xl: "w-4 h-4 border-2 bottom-1 right-1",
  };

  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div className={cn("relative inline-block flex-shrink-0 select-none", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-medium shadow-subtle transition-transform",
          sizeClasses[size],
          !src && bgColor,
          !src && "text-white"
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute rounded-full ring-0",
            badgeSizes[size],
            isOnline
              ? "bg-emerald-500 border-white dark:border-dark-bg"
              : "bg-slate-300 dark:bg-zinc-600 border-white dark:border-dark-bg"
          )}
          title={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
