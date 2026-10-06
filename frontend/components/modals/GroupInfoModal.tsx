"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  ShieldCheck,
  UserMinus,
  UserPlus,
  LogOut,
  Phone,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Conversation, User } from "@/types";
import { conversationApi } from "@/lib/api";
import { Avatar } from "@/components/common/Avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatConversationTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
}

export function GroupInfoModal({
  isOpen,
  onClose,
  conversation,
}: GroupInfoModalProps) {
  const { user } = useAuth();
  const { refreshConversations, selectConversation } = useChat();

  const [addUserId, setAddUserId] = useState<string>("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isGroup = conversation.type === "group";
  const userMember = conversation.members?.find((m) => m.user_id === user?.id);
  const isAdmin = userMember?.role === "admin";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = parseInt(addUserId);
    if (!uid) return;

    setIsActionLoading(true);
    setMessage(null);
    try {
      await conversationApi.addMember(conversation.id, uid);
      await refreshConversations();
      setMessage("Member added to group!");
      setAddUserId("");
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Could not add member.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    setIsActionLoading(true);
    setMessage(null);
    try {
      await conversationApi.removeMember(conversation.id, targetUserId);
      await refreshConversations();
      setMessage("Member removed from group.");
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Could not remove member.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to leave this group?")) {
      setIsActionLoading(true);
      try {
        await conversationApi.removeMember(conversation.id, user.id);
        await refreshConversations();
        selectConversation(null);
        onClose();
      } catch (err: any) {
        setMessage(err.response?.data?.detail || "Could not leave group.");
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  // If Direct chat, show contact profile card
  if (!isGroup) {
    const other = conversation.other_user;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-[#1b1b1e] rounded-2xl w-full max-w-sm shadow-2xl border border-light-border dark:border-[#2d2d34] overflow-hidden transition-all">
          <div className="px-5 py-4 border-b border-light-border dark:border-[#26262b] flex items-center justify-between">
            <h2 className="font-semibold text-base text-light-text dark:text-[#f3f4f6]">
              Contact Info
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-400 hover:text-slate-600 dark:hover:text-[#dedee3] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center text-center">
            <Avatar
              src={other?.avatar_url}
              name={other?.display_name || "Contact"}
              size="xl"
              isOnline={other?.is_online}
            />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-[#f3f4f6] mt-3">
              {other?.display_name}
            </h3>
            <p className="text-xs text-slate-400 dark:text-[#8e8e93] mt-0.5">@{other?.username}</p>
            <p className="text-xs text-signal-600 dark:text-signal-400 font-medium mt-1">
              {other?.phone}
            </p>

            <div className="w-full mt-6 p-3.5 bg-[#f8f9fa] dark:bg-[#202024] rounded-xl text-left border border-light-border dark:border-[#26262b] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-[#8e8e93]">Status</span>
                <span className="font-medium text-slate-700 dark:text-[#dedee3]">
                  {other?.is_online
                    ? "Online"
                    : other?.last_seen
                    ? `Last seen ${formatConversationTime(other.last_seen)}`
                    : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-[#8e8e93]">Encryption</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Signal Protocol (Simulated)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-[#2b2b30]">
                <span className="text-slate-500 dark:text-[#8e8e93]">Safety Number</span>
                <span className="font-mono text-[11px] text-slate-600 dark:text-[#a0a1a5]">
                  48291 ··· 91024
                </span>
              </div>
            </div>

            <div className="w-full mt-6 space-y-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold bg-signal-500 hover:bg-signal-600 text-white rounded-full transition-colors shadow-xs"
              >
                Send Message
              </button>
              <button
                onClick={() => alert("Block contact is a security demonstration placeholder.")}
                className="w-full py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-colors"
              >
                Block Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b1b1e] rounded-2xl w-full max-w-md shadow-2xl border border-light-border dark:border-[#2d2d34] overflow-hidden flex flex-col max-h-[85vh] transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-light-border dark:border-[#26262b] flex items-center justify-between">
          <h2 className="font-semibold text-base text-light-text dark:text-[#f3f4f6]">
            Group Info
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-400 hover:text-slate-600 dark:hover:text-[#dedee3] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback */}
        {message && (
          <div className="bg-signal-50 dark:bg-signal-950/70 border-b border-signal-200 dark:border-signal-800 text-signal-700 dark:text-signal-300 text-xs px-4 py-2 font-medium text-center animate-in fade-in">
            {message}
          </div>
        )}

        {/* Group Hero banner */}
        <div className="p-6 flex flex-col items-center border-b border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#18181b]">
          <Avatar
            src={conversation.avatar_url}
            name={conversation.name || "Group"}
            size="xl"
          />
          <h3 className="font-semibold text-lg text-slate-900 dark:text-[#f3f4f6] mt-3">
            {conversation.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8e8e93] mt-0.5">
            Group • {conversation.members?.length || 0} participants
          </p>
        </div>

        {/* Add Member form (Admins only) */}
        {isAdmin && (
          <form
            onSubmit={handleAddMember}
            className="p-3 border-b border-light-border dark:border-[#26262b] flex gap-2"
          >
            <input
              type="number"
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              placeholder="Enter User ID to add..."
              className="flex-1 px-3.5 py-1.5 text-xs rounded-full border border-transparent focus:border-signal-500/40 bg-[#f0f2f5] dark:bg-[#26262b] outline-none text-light-text dark:text-[#f3f4f6]"
            />
            <button
              type="submit"
              disabled={isActionLoading || !addUserId.trim()}
              className="px-3.5 py-1.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-all flex items-center gap-1 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-[#26262b]/50">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-[#8e8e93] uppercase tracking-wider mb-2 px-1">
            Members ({conversation.members?.length || 0})
          </p>

          {conversation.members?.map((m) => {
            const isMe = m.user_id === user?.id;
            const canRemove = isAdmin && !isMe;

            return (
              <div
                key={m.id}
                className="flex items-center justify-between py-2.5 px-2 hover:bg-[#f0f2f5] dark:hover:bg-[#26262b] rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={m.user?.avatar_url}
                    name={m.user?.display_name || "Member"}
                    size="md"
                    isOnline={m.user?.is_online}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        {m.user?.display_name} {isMe && "(You)"}
                      </p>
                      {m.role === "admin" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                      @{m.user?.username}
                    </p>
                  </div>
                </div>

                {canRemove && (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Remove member from group"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Leave Group Button */}
        <div className="p-3 border-t border-light-border dark:border-[#26262b]">
          <button
            onClick={handleLeaveGroup}
            disabled={isActionLoading}
            className="w-full py-2.5 flex items-center justify-center gap-2 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
}
