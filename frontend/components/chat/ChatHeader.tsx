"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Conversation } from "@/types";
import { Avatar } from "@/components/common/Avatar";
import { formatConversationTime } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: Conversation;
  onBackMobile: () => void;
  onOpenDetails: () => void;
}

export function ChatHeader({
  conversation,
  onBackMobile,
  onOpenDetails,
}: ChatHeaderProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const isGroup = conversation.type === "group";
  let title = "";
  let avatarUrl: string | null | undefined = null;
  let statusText = "";
  let isOnline = false;

  if (isGroup) {
    title = conversation.name || "Group";
    avatarUrl = conversation.avatar_url;
    statusText = `${conversation.members?.length || 0} members`;
  } else {
    const other = conversation.other_user;
    title = other?.display_name || "Direct Message";
    avatarUrl = other?.avatar_url;
    isOnline = Boolean(other?.is_online);
    if (isOnline) {
      statusText = "Online";
    } else if (other?.last_seen) {
      statusText = `Last seen ${formatConversationTime(other.last_seen)}`;
    } else {
      statusText = "Offline";
    }
  }

  const triggerFeatureNotice = (feature: string) => {
    setShowTooltip(feature);
    setTimeout(() => setShowTooltip(null), 2500);
  };

  return (
    <div className="h-14 px-4 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-bg flex items-center justify-between flex-shrink-0 z-10 relative select-none">
      {/* Left: Mobile back button + Avatar + Details */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBackMobile}
          className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface text-slate-600 dark:text-zinc-300"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenDetails}
          className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0"
        >
          <Avatar
            src={avatarUrl}
            name={title}
            size="md"
            isOnline={isGroup ? undefined : isOnline}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[14.5px] font-semibold text-light-text dark:text-dark-text truncate leading-tight group-hover:text-signal-500 transition-colors">
                {title}
              </h2>
              <span
                className="hidden sm:inline-flex text-emerald-600 dark:text-emerald-400"
                title="End-to-End Encrypted (Simulated)"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11.5px] text-light-muted dark:text-dark-muted truncate flex items-center gap-1">
              {isGroup && <Users className="w-3 h-3 inline text-slate-400" />}
              <span
                className={
                  isOnline && !isGroup
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : ""
                }
              >
                {statusText}
              </span>
            </p>
          </div>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 text-slate-500 dark:text-zinc-400 relative">
        <button
          onClick={() => triggerFeatureNotice("Voice Calls")}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-surface transition-colors"
          title="Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={() => triggerFeatureNotice("Video Calls")}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-surface transition-colors"
          title="Video Call"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenDetails}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-surface transition-colors"
          title="Conversation Info"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Discreet notification popover for coming soon */}
        {showTooltip && (
          <div className="absolute right-0 top-11 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-card z-50 whitespace-nowrap animate-in fade-in">
            {showTooltip}: Coming Soon
          </div>
        )}
      </div>
    </div>
  );
}
