"use client";

import React from "react";
import { MessageSquarePlus } from "lucide-react";
import { Conversation } from "@/types";
import { ConversationItem } from "./ConversationItem";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: number | null;
  onSelectConversation: (conv: Conversation) => void;
  searchQuery: string;
  isLoading: boolean;
  onStartNewChat: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  searchQuery,
  isLoading,
  onStartNewChat,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <LoadingSpinner size="md" />
        <p className="text-xs mt-3 text-slate-400 dark:text-zinc-500">
          Loading conversations...
        </p>
      </div>
    );
  }

  const query = searchQuery.toLowerCase().trim();
  const filtered = conversations.filter((c) => {
    if (!query) return true;
    if (c.type === "group" && c.name?.toLowerCase().includes(query)) {
      return true;
    }
    if (c.other_user?.display_name.toLowerCase().includes(query)) {
      return true;
    }
    if (c.other_user?.username.toLowerCase().includes(query)) {
      return true;
    }
    if (c.last_message?.content.toLowerCase().includes(query)) {
      return true;
    }
    return false;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        {searchQuery ? (
          <div className="max-w-[220px]">
            <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              No conversations found
            </p>
            <p className="text-xs mt-1 text-slate-400 dark:text-zinc-500">
              No matches for &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : (
          <div className="max-w-[220px]">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-dark-surface flex items-center justify-center mx-auto mb-3 text-signal-500">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
              No messages yet
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              Start a new secure conversation with any contact.
            </p>
            <button
              onClick={onStartNewChat}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-signal-500 hover:bg-signal-600 text-white rounded-lg transition-colors shadow-subtle"
            >
              Start Chat
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-dark-border/40">
      {filtered.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === activeConversationId}
          onSelect={() => onSelectConversation(conv)}
        />
      ))}
    </div>
  );
}
