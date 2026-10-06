"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Shield,
  Bell,
  Sun,
  Moon,
  Laptop,
  PhoneCall,
  History,
  LogOut,
  Settings,
  Sliders,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { settingsApi } from "@/lib/api";
import { UserSettings } from "@/types";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState<
    "appearance" | "privacy" | "notifications" | "placeholders"
  >("appearance");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      settingsApi.getSettings().then((s) => setSettings(s)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSetting = async (key: keyof UserSettings) => {
    if (!settings) return;
    const updatedVal = !settings[key];
    const newSettings = { ...settings, [key]: updatedVal };
    setSettings(newSettings);
    setIsSaving(true);
    try {
      await settingsApi.updateSettings({ [key]: updatedVal });
    } catch {
      // rollback
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b1b1e] rounded-2xl w-full max-w-xl shadow-2xl border border-light-border dark:border-[#2d2d34] overflow-hidden flex flex-col max-h-[85vh] transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-light-border dark:border-[#26262b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-signal-500" />
            <h2 className="font-semibold text-base text-light-text dark:text-[#f3f4f6]">
              Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-400 hover:text-slate-600 dark:hover:text-[#dedee3] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with Signal vertical tab layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation */}
          <div className="w-44 border-r border-light-border dark:border-[#26262b] p-2 space-y-1 bg-[#f8f9fa] dark:bg-[#161618] text-xs font-medium">
            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === "appearance"
                  ? "bg-signal-50 dark:bg-[#26262b] text-signal-600 dark:text-signal-400 font-semibold"
                  : "text-slate-600 dark:text-[#a0a1a5] hover:bg-slate-100 dark:hover:bg-[#222226]"
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab("privacy")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === "privacy"
                  ? "bg-signal-50 dark:bg-[#26262b] text-signal-600 dark:text-signal-400 font-semibold"
                  : "text-slate-600 dark:text-[#a0a1a5] hover:bg-slate-100 dark:hover:bg-[#222226]"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy</span>
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === "notifications"
                  ? "bg-signal-50 dark:bg-[#26262b] text-signal-600 dark:text-signal-400 font-semibold"
                  : "text-slate-600 dark:text-[#a0a1a5] hover:bg-slate-100 dark:hover:bg-[#222226]"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => setActiveTab("placeholders")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === "placeholders"
                  ? "bg-signal-50 dark:bg-[#26262b] text-signal-600 dark:text-signal-400 font-semibold"
                  : "text-slate-600 dark:text-[#a0a1a5] hover:bg-slate-100 dark:hover:bg-[#222226]"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Features</span>
            </button>

            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-[#26262b]">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Pane */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-[#f3f4f6]">
                    Theme & Display
                  </h3>
                  <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                    Customize the look and feel of Signal desktop
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="w-5 h-5 text-signal-400" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        Dark Mode
                      </p>
                      <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                        Switch between Signal charcoal and light themes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      theme === "dark" ? "bg-signal-500" : "bg-slate-300 dark:bg-[#383840]"
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === "dark" ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-[#f3f4f6]">
                    Privacy & Security
                  </h3>
                  <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                    Control what metadata you share with other contacts
                  </p>
                </div>

                {/* Read Receipts */}
                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                      Read Receipts
                    </p>
                    <p className="text-xs text-light-muted dark:text-[#8e8e93] max-w-xs">
                      See and share when messages have been read (blue double checks)
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting("read_receipts")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.read_receipts ? "bg-signal-500" : "bg-slate-300 dark:bg-[#383840]"
                    }`}
                    aria-label="Toggle read receipts"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.read_receipts ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Typing Indicators */}
                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                      Typing Indicators
                    </p>
                    <p className="text-xs text-light-muted dark:text-[#8e8e93] max-w-xs">
                      Show when you are actively composing a message in real-time
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting("typing_indicator_privacy")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.typing_indicator_privacy ? "bg-signal-500" : "bg-slate-300 dark:bg-[#383840]"
                    }`}
                    aria-label="Toggle typing indicators"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.typing_indicator_privacy ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Last seen */}
                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                      Last Seen & Online
                    </p>
                    <p className="text-xs text-light-muted dark:text-[#8e8e93] max-w-xs">
                      Broadcast your active presence to your contacts
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting("last_seen_privacy")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.last_seen_privacy ? "bg-signal-500" : "bg-slate-300 dark:bg-[#383840]"
                    }`}
                    aria-label="Toggle last seen"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.last_seen_privacy ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-[#f3f4f6]">
                    Notification Preferences
                  </h3>
                  <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                    Configure alerts for new direct messages and group chats
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                      Desktop Alerts
                    </p>
                    <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                      Show badges and banners for incoming encrypted messages
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting("notifications_enabled")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.notifications_enabled ? "bg-signal-500" : "bg-slate-300 dark:bg-[#383840]"
                    }`}
                    aria-label="Toggle notifications"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.notifications_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                      Sound Effects
                    </p>
                    <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                      Play subtle Signal chime when receiving incoming chats
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleSetting("sound_enabled")}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.sound_enabled ? "bg-signal-500" : "bg-slate-300 dark:bg-[#383840]"
                    }`}
                    aria-label="Toggle sound"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.sound_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "placeholders" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-[#f3f4f6]">
                    Signal Extensions
                  </h3>
                  <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                    Next-generation encrypted communication features
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-slate-400 dark:text-[#8e8e93]" />
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        Linked Devices
                      </p>
                      <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                        Link iPad, macOS, Windows, and Linux instances
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#e4e6ea] dark:bg-[#2d2d34] text-slate-600 dark:text-[#a0a1a5]">
                    Coming Soon
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-5 h-5 text-slate-400 dark:text-[#8e8e93]" />
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        Voice & Video Calls
                      </p>
                      <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                        Encrypted 1-on-1 and group WebRTC calls
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#e4e6ea] dark:bg-[#2d2d34] text-slate-600 dark:text-[#a0a1a5]">
                    Coming Soon
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-light-border dark:border-[#26262b] bg-[#f8f9fa] dark:bg-[#202024] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-slate-400 dark:text-[#8e8e93]" />
                    <div>
                      <p className="text-sm font-medium text-light-text dark:text-[#f3f4f6]">
                        Stories
                      </p>
                      <p className="text-xs text-light-muted dark:text-[#8e8e93]">
                        Share 24-hour disappearing photo & text status updates
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#e4e6ea] dark:bg-[#2d2d34] text-slate-600 dark:text-[#a0a1a5]">
                    Coming Soon
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
