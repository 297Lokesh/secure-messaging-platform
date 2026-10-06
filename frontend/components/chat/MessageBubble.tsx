"use client";

import React, { useState } from "react";
import { Reply, Copy, Check } from "lucide-react";
import { Message } from "@/types";
import { DeliveryStatusIcon } from "@/components/common/DeliveryStatusIcon";
import { formatMessageTime, cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  isGroup: boolean;
  showSenderName: boolean;
  onReply: (msg: Message) => void;
}

export function MessageBubble({
  message,
  isOutgoing,
  isGroup,
  showSenderName,
  onReply,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col mb-1 px-3 sm:px-6",
        isOutgoing ? "items-end" : "items-start"
      )}
    >
      {/* Sender name for group chats */}
      {!isOutgoing && isGroup && showSenderName && (
        <span className="text-[11.5px] font-semibold text-signal-600 dark:text-signal-400 mb-1 ml-2 select-none">
          {message.sender?.display_name || "Unknown"}
        </span>
      )}

      {/* Bubble Container */}
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[70%] md:max-w-[62%] rounded-bubble px-3.5 py-2 shadow-subtle transition-all",
          isOutgoing
            ? "bg-signal-500 text-white rounded-br-[4px]"
            : "bg-light-bubble dark:bg-dark-bubble text-slate-900 dark:text-slate-100 rounded-bl-[4px]"
        )}
      >
        {/* Reply quote preview */}
        {message.reply_to && (
          <div
            className={cn(
              "text-xs px-2.5 py-1.5 mb-1.5 rounded-lg border-l-2 select-none",
              isOutgoing
                ? "bg-black/15 text-white/95 border-white/80"
                : "bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-signal-500"
            )}
          >
            <p className="font-semibold text-[11px] truncate">
              {message.reply_to.sender_name || "Reply"}
            </p>
            <p className="truncate text-[11px] mt-0.5 opacity-80">
              {message.reply_to.content}
            </p>
          </div>
        )}

        {/* Message Content */}
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Micro Timestamp & Delivery Status */}
        <div
          className={cn(
            "flex items-center justify-end gap-1 text-[10px] mt-0.5 select-none font-normal",
            isOutgoing ? "text-white/75" : "text-slate-400 dark:text-zinc-500"
          )}
        >
          <span>{formatMessageTime(message.created_at)}</span>
          {isOutgoing && (
            <DeliveryStatusIcon
              status={message.status}
              onBubble={true}
            />
          )}
        </div>
      </div>

      {/* Discreet Hover Actions */}
      <div
        className={cn(
          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg shadow-card px-1 py-0.5 z-10",
          isOutgoing ? "right-full mr-2" : "left-full ml-2"
        )}
      >
        <button
          onClick={() => onReply(message)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-dark-hover rounded text-slate-500 dark:text-zinc-400 transition-colors"
          title="Reply"
          aria-label="Reply to message"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-slate-100 dark:hover:bg-dark-hover rounded text-slate-500 dark:text-zinc-400 transition-colors"
          title="Copy"
          aria-label="Copy message text"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
