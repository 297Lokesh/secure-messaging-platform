"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Users, ArrowRight, ArrowLeft, Search, Camera } from "lucide-react";
import { User } from "@/types";
import { usersApi } from "@/lib/api";
import { Avatar } from "@/components/common/Avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useChat } from "@/context/ChatContext";

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewGroupModal({ isOpen, onClose }: NewGroupModalProps) {
  const { createGroupChat } = useChat();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [groupName, setGroupName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUserIds([]);
      setSearchFilter("");
      setGroupName("");
      setAvatarUrl("");
      setIsLoading(true);
      usersApi
        .getUsers()
        .then((users) => setAllUsers(users))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await createGroupChat(groupName.trim(), selectedUserIds);
      onClose();
    } catch {
      // Error handled silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b1b1e] rounded-2xl w-full max-w-md shadow-2xl border border-light-border dark:border-[#2d2d34] overflow-hidden flex flex-col max-h-[85vh] transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-light-border dark:border-[#26262b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-500 dark:text-[#a0a1a5] transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-base text-light-text dark:text-[#f3f4f6]">
                {step === 1 ? "New Group" : "Name This Group"}
              </h2>
              <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                {step === 1
                  ? `${selectedUserIds.length} members selected`
                  : "Provide a name and optional icon"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-400 hover:text-slate-600 dark:hover:text-[#dedee3] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Search members input */}
            <div className="p-3 border-b border-light-border dark:border-[#26262b]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-[#8e8e93]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search name or username..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f0f2f5] dark:bg-[#26262b] rounded-full border border-transparent focus:border-signal-500/40 text-light-text dark:text-dark-text outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Selected members badge chips */}
            {selectedUserIds.length > 0 && (
              <div className="px-4 py-2.5 bg-[#f8f9fa] dark:bg-[#202024] border-b border-light-border dark:border-[#26262b] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {selectedUserIds.map((uid) => {
                  const u = allUsers.find((user) => user.id === uid);
                  if (!u) return null;
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-signal-100 dark:bg-signal-950/70 text-signal-700 dark:text-signal-300 flex-shrink-0 animate-in fade-in"
                    >
                      <span>{u.display_name.split(" ")[0]}</span>
                      <button
                        onClick={() => toggleSelectUser(uid)}
                        className="hover:text-signal-900 dark:hover:text-white transition-colors"
                        aria-label={`Remove ${u.display_name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-[#26262b]/50">
              {isLoading ? (
                <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <LoadingSpinner size="md" />
                  <span className="text-xs">Loading contacts...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No users match &ldquo;{searchFilter}&rdquo;
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-signal-50/60 dark:bg-signal-950/30"
                          : "hover:bg-[#f0f2f5] dark:hover:bg-[#26262b]/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.avatar_url}
                          name={u.display_name}
                          size="md"
                          isOnline={u.is_online}
                        />
                        <div className="text-left">
                          <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                            {u.display_name}
                          </p>
                          <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                            @{u.username}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-signal-500 border-signal-500 text-white"
                            : "border-slate-300 dark:border-[#404047] text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Next Button */}
            <div className="p-3 border-t border-light-border dark:border-[#26262b] flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={selectedUserIds.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full transition-all shadow-xs"
              >
                <span>Next ({selectedUserIds.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center justify-center mb-2">
              <div className="w-20 h-20 rounded-full bg-[#f0f2f5] dark:bg-[#26262b] border-2 border-dashed border-slate-300 dark:border-[#383840] text-signal-600 dark:text-signal-400 flex items-center justify-center mb-3 relative overflow-hidden group">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Group Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Users className="w-9 h-9" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-[#a0a1a5]">
                {selectedUserIds.length} members will be added
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1.5">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Design Team, Family, Weekend Trip"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f0f2f5] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-dark-text placeholder:text-slate-400"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1.5">
                Group Avatar URL (optional)
              </label>
              <div className="relative">
                <Camera className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f0f2f5] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-dark-text placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || isSubmitting}
              className="w-full py-2.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-full transition-all shadow-xs flex items-center justify-center gap-2 mt-5"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" className="border-white" />
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
