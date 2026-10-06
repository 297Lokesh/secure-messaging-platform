"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Search, UserPlus } from "lucide-react";
import { User } from "@/types";
import { usersApi } from "@/lib/api";
import { Avatar } from "@/components/common/Avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useChat } from "@/context/ChatContext";

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewGroup: () => void;
  onOpenAddContact: () => void;
}

export function NewMessageModal({
  isOpen,
  onClose,
  onOpenNewGroup,
  onOpenAddContact,
}: NewMessageModalProps) {
  const { createDirectChat } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      usersApi
        .getUsers()
        .then((users) => setAllUsers(users))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const query = searchQuery.toLowerCase().trim();
  const filteredUsers = allUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      u.phone.includes(query)
  );

  const handleSelectUser = async (userId: number) => {
    try {
      await createDirectChat(userId);
      onClose();
    } catch {
      // Error handling
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-white dark:bg-dark-panel rounded-2xl w-full max-w-md shadow-modal border border-light-border dark:border-dark-border overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-4 border-b border-light-border dark:border-dark-border flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-sm text-light-text dark:text-dark-text">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-dark-hover text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-light-border dark:border-dark-border">
          <div className="relative flex items-center bg-slate-100/80 dark:bg-dark-surface rounded-xl px-3 py-1.5 focus-within:ring-1.5 focus-within:ring-signal-500/50 transition-all border border-transparent focus-within:border-signal-500/30">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, or phone..."
              className="w-full bg-transparent text-[13px] text-light-text dark:text-dark-text placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Action items: New Group & Add Contact */}
        <div className="p-2 border-b border-light-border dark:border-dark-border space-y-0.5">
          <button
            onClick={() => {
              onClose();
              onOpenNewGroup();
            }}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-signal-50 dark:bg-signal-950/60 text-signal-600 dark:text-signal-400 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-light-text dark:text-dark-text">
                New Group
              </p>
              <p className="text-[11px] text-light-muted dark:text-dark-muted">
                Create a secure group conversation
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAddContact();
            }}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-light-text dark:text-dark-text">
                Add Contact
              </p>
              <p className="text-[11px] text-light-muted dark:text-dark-muted">
                Search and add contacts by username or phone
              </p>
            </div>
          </button>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100/60 dark:divide-dark-border/40">
          <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Contacts & Users
          </p>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <LoadingSpinner size="md" />
              <p className="text-xs mt-2 text-slate-400 dark:text-zinc-500">
                Loading users...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-zinc-500 text-xs">
              No users found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u.id)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-hover text-left transition-colors"
              >
                <Avatar
                  src={u.avatar_url}
                  name={u.display_name}
                  size="md"
                  isOnline={u.is_online}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-medium text-light-text dark:text-dark-text truncate">
                      {u.display_name}
                    </p>
                    {u.is_online && (
                      <span className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                        Online
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-light-muted dark:text-dark-muted truncate">
                    @{u.username} • {u.phone}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
