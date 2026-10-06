"use client";

import React from "react";
import { Edit3, Settings, ShieldCheck, UserPlus } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/context/AuthContext";

interface SidebarHeaderProps {
  onOpenNewMessage: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenContacts: () => void;
}

export function SidebarHeader({
  onOpenNewMessage,
  onOpenSettings,
  onOpenProfile,
  onOpenContacts,
}: SidebarHeaderProps) {
  const { user } = useAuth();

  return (
    <div className="h-14 px-3.5 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-panel flex items-center justify-between flex-shrink-0 select-none">
      {/* Current User Area */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenProfile}
          className="relative group transition-opacity hover:opacity-90 focus:outline-none flex-shrink-0"
          title="Edit Profile"
          aria-label="Profile settings"
        >
          <Avatar
            src={user?.avatar_url}
            name={user?.display_name || "User"}
            size="sm"
            isOnline={true}
          />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-light-text dark:text-dark-text tracking-tight truncate">
              {user?.display_name || "Signal"}
            </span>
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
              title="Verified Secure (Simulated E2E)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-light-muted dark:text-dark-muted truncate">
            @{user?.username}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 text-slate-500 dark:text-zinc-400">
        <button
          onClick={onOpenContacts}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title="Contacts"
          aria-label="Manage Contacts"
        >
          <UserPlus className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenNewMessage}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover text-signal-500 dark:text-signal-400 transition-colors"
          title="New Message"
          aria-label="New Message"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title="Settings"
          aria-label="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
