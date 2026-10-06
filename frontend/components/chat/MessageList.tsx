"use client";

import React, { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Message, Conversation } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface MessageListProps {
  messages: Message[];
  conversation: Conversation;
  isLoading: boolean;
  typingUsers: { userId: number; displayName: string }[];
  onReply: (msg: Message) => void;
}

function formatDateSeparator(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  } catch {
    return "";
  }
}

export function MessageList({
  messages,
  conversation,
  isLoading,
  typingUsers,
  onReply,
}: MessageListProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
        <LoadingSpinner size="md" />
        <p className="text-xs mt-3 text-slate-400 dark:text-zinc-500">
          Loading messages...
        </p>
      </div>
    );
  }

  const isGroup = conversation.type === "group";

  return (
    <div className="flex-1 overflow-y-auto px-1 sm:px-3 py-3 flex flex-col justify-start">
      {/* Signal Security Banner */}
      <div className="mx-auto my-3 max-w-sm p-3 rounded-2xl bg-slate-100/70 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border text-center select-none shadow-subtle">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>End-to-End Encrypted (Simulated)</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
          Messages and calls are secured with simulated encryption. No one outside of this chat can read them.
        </p>
      </div>

      {/* Message history */}
      {messages.map((msg, index) => {
        const isOutgoing = msg.sender_id === user?.id;
        const prevMsg = index > 0 ? messages[index - 1] : null;

        // Check date divider
        const currentDateStr = formatDateSeparator(msg.created_at);
        const prevDateStr = prevMsg ? formatDateSeparator(prevMsg.created_at) : null;
        const showDateSeparator = currentDateStr !== prevDateStr;

        // Show sender name if first message from user in consecutive streak in group
        const showSenderName =
          isGroup && (!prevMsg || prevMsg.sender_id !== msg.sender_id || showDateSeparator);

        return (
          <React.Fragment key={msg.id || msg.temp_id || index}>
            {showDateSeparator && (
              <div className="flex items-center justify-center my-3 select-none">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-dark-surface px-3 py-0.5 rounded-full border border-light-border dark:border-dark-border shadow-subtle">
                  {currentDateStr}
                </span>
              </div>
            )}

            <MessageBubble
              message={msg}
              isOutgoing={isOutgoing}
              isGroup={isGroup}
              showSenderName={showSenderName}
              onReply={onReply}
            />
          </React.Fragment>
        );
      })}

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      <div ref={bottomRef} />
    </div>
  );
}
