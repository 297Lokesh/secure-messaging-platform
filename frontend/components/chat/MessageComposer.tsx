"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Plus, Smile, X } from "lucide-react";
import { Message } from "@/types";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  onSendMessage: (content: string) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "🙌", "🔒", "🚀", "✨", "💯"];

export function MessageComposer({
  onSendMessage,
  onTyping,
  replyingTo,
  onCancelReply,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus textarea on reply
  useEffect(() => {
    textareaRef.current?.focus();
  }, [replyingTo]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (val.trim()) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else {
      onTyping(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    const textToSend = content;
    setContent("");
    setShowEmojiPicker(false);
    onTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await onSendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="p-3 bg-white dark:bg-dark-bg border-t border-light-border dark:border-dark-border flex-shrink-0 relative select-none">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-slate-100/90 dark:bg-dark-surface px-3 py-1.5 rounded-xl mb-2 text-xs border-l-3 border-signal-500 animate-in fade-in">
          <div className="truncate pr-2">
            <span className="font-semibold text-signal-600 dark:text-signal-400">
              Replying to {replyingTo.sender?.display_name || "message"}
            </span>
            <p className="text-slate-600 dark:text-zinc-300 truncate mt-0.5 text-[11px]">
              {replyingTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-dark-hover text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-12 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-card p-2 flex items-center gap-1.5 z-30 animate-in fade-in zoom-in-95">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-lg p-1.5 hover:bg-slate-100 dark:hover:bg-dark-hover rounded-xl transition-transform hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Signal Bottom Pill Composer */}
      <div className="flex items-end gap-1.5 bg-slate-100/90 dark:bg-dark-surface rounded-2xl px-2 py-1.5 focus-within:ring-1.5 focus-within:ring-signal-500/50 transition-all border border-transparent focus-within:border-signal-500/30">
        {/* Plus / Attachment button */}
        <button
          type="button"
          onClick={() => {
            alert("File attachments simulated for security demonstration.");
          }}
          className="p-1.5 text-slate-500 hover:text-signal-500 dark:text-zinc-400 dark:hover:text-signal-400 rounded-full hover:bg-slate-200/60 dark:hover:bg-dark-hover transition-colors flex-shrink-0"
          title="Add attachment"
          aria-label="Add attachment"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          className="w-full bg-transparent text-[14px] text-light-text dark:text-dark-text placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none resize-none py-1.5 max-h-32 min-h-[22px] leading-normal"
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />

        {/* Emoji trigger */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={cn(
            "p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-dark-hover transition-colors flex-shrink-0",
            showEmojiPicker
              ? "text-signal-500"
              : "text-slate-400 hover:text-signal-500 dark:text-zinc-400 dark:hover:text-signal-400"
          )}
          title="Insert emoji"
          aria-label="Insert emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim()}
          className={cn(
            "p-1.5 rounded-full transition-all flex-shrink-0 flex items-center justify-center",
            content.trim()
              ? "bg-signal-500 hover:bg-signal-600 text-white shadow-subtle active:scale-95 cursor-pointer"
              : "text-slate-300 dark:text-zinc-600 cursor-not-allowed opacity-60"
          )}
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 translate-x-px" />
        </button>
      </div>
    </div>
  );
}
