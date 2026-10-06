"use client";

import React from "react";
import { Users } from "lucide-react";
import { Conversation } from "@/types";
import { Avatar } from "@/components/common/Avatar";
import { DeliveryStatusIcon } from "@/components/common/DeliveryStatusIcon";
import { formatConversationTime, cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: ConversationItemProps) {
  const { user } = useAuth();
  const isGroup = conversation.type === "group";

  // Compute title, avatar, and online status
  let title = "";
  let avatarUrl: string | null | undefined = null;
  let isOnline: boolean | undefined = undefined;

  if (isGroup) {
    title = conversation.name || "Group Conversation";
    avatarUrl = conversation.avatar_url;
  } else {
    const other = conversation.other_user;
    title = other?.display_name || "Direct Message";
    avatarUrl = other?.avatar_url;
    isOnline = other?.is_online;
  }

  const lastMsg = conversation.last_message;
  const isOutgoing = lastMsg && lastMsg.sender_id === user?.id;

  // Format last message snippet
  let snippet = "No messages yet";
  if (lastMsg) {
    if (isOutgoing) {
      snippet = `You: ${lastMsg.content}`;
    } else if (isGroup && lastMsg.sender) {
      snippet = `${lastMsg.sender.display_name.split(" ")[0]}: ${lastMsg.content}`;
    } else {
      snippet = lastMsg.content;
    }
  }

  const unreadCount = conversation.unread_count || 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors select-none relative",
        isSelected
          ? "bg-slate-100/90 dark:bg-dark-surface"
          : "hover:bg-slate-50 dark:hover:bg-dark-hover/60 bg-transparent"
      )}
    >
      {/* Selection pill indicator on edge */}
      {isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-signal-500 rounded-r-full" />
      )}

      {/* Avatar with presence */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={avatarUrl}
          name={title}
          size="md"
          isOnline={isGroup ? undefined : isOnline}
        />
        {isGroup && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-slate-700 text-white rounded-full p-0.5 border border-white dark:border-dark-panel">
            <Users className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Info Container */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Row 1: Name & Timestamp */}
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <h2
            className={cn(
              "text-[13.5px] truncate font-medium",
              unreadCount > 0
                ? "text-slate-900 dark:text-white font-semibold"
                : isSelected
                ? "text-slate-900 dark:text-slate-100 font-semibold"
                : "text-slate-800 dark:text-slate-200"
            )}
          >
            {title}
          </h2>
          {lastMsg && (
            <span
              className={cn(
                "text-[11px] flex-shrink-0 font-normal",
                unreadCount > 0
                  ? "text-signal-600 dark:text-signal-400 font-medium"
                  : "text-slate-400 dark:text-zinc-500"
              )}
            >
              {formatConversationTime(lastMsg.created_at)}
            </span>
          )}
        </div>

        {/* Row 2: Snippet & Unread badge */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-[12.5px] truncate flex items-center gap-1.5 leading-snug",
              unreadCount > 0
                ? "text-slate-900 dark:text-slate-100 font-medium"
                : "text-slate-500 dark:text-zinc-400"
            )}
          >
            {isOutgoing && lastMsg && (
              <DeliveryStatusIcon
                status={lastMsg.status}
                className="flex-shrink-0"
              />
            )}
            <span className="truncate">{snippet}</span>
          </p>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="flex-shrink-0 px-1.5 py-0.2 min-w-[18px] h-[18px] text-center text-[10.5px] font-bold bg-signal-500 text-white rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
