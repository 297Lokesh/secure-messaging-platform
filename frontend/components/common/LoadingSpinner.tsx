import React from "react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div
      className={cn(
        "rounded-full border-signal-500 border-t-transparent animate-spin inline-block",
        sizes[size],
        className
      )}
    />
  );
}
