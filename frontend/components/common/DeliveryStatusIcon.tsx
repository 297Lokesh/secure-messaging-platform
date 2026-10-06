"use client";

import React from "react";
import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryStatusIconProps {
  status: "sending" | "sent" | "delivered" | "read";
  className?: string;
  onBubble?: boolean;
}

export function DeliveryStatusIcon({
  status,
  className,
  onBubble = false,
}: DeliveryStatusIconProps) {
  const baseColor = onBubble ? "text-white/70" : "text-slate-400 dark:text-zinc-500";
  const readColor = onBubble ? "text-white font-bold" : "text-sky-500 dark:text-sky-400 font-bold";

  switch (status) {
    case "sending":
      return (
        <Clock
          className={cn("w-3 h-3 animate-spin", baseColor, className)}
          aria-label="Sending"
        />
      );
    case "sent":
      return (
        <Check
          className={cn("w-3 h-3 stroke-[2.5]", baseColor, className)}
          aria-label="Sent"
        />
      );
    case "delivered":
      return (
        <CheckCheck
          className={cn("w-3.5 h-3.5 stroke-[2.2]", baseColor, className)}
          aria-label="Delivered"
        />
      );
    case "read":
      return (
        <CheckCheck
          className={cn("w-3.5 h-3.5 stroke-[2.8]", readColor, className)}
          aria-label="Read"
        />
      );
    default:
      return null;
  }
}
