"use client";

import React, { useState } from "react";
import { X, Save, Camera, User, Phone, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { profileApi } from "@/lib/api";
import { Avatar } from "@/components/common/Avatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await profileApi.updateProfile({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      updateUser(updated);
      setMessage("Profile updated successfully!");
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Error saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1b1b1e] rounded-2xl w-full max-w-sm shadow-2xl border border-light-border dark:border-[#2d2d34] overflow-hidden transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-light-border dark:border-[#26262b] flex items-center justify-between">
          <h2 className="font-semibold text-base text-light-text dark:text-[#f3f4f6]">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#26262b] text-slate-400 hover:text-slate-600 dark:hover:text-[#dedee3] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback notification */}
        {message && (
          <div className="bg-signal-50 dark:bg-signal-950/70 border-b border-signal-200 dark:border-signal-800 text-signal-700 dark:text-signal-300 text-xs px-4 py-2 font-medium text-center flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="relative">
              <Avatar
                src={avatarUrl || user.avatar_url}
                name={displayName || user.display_name}
                size="xl"
              />
              <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-signal-500 text-white shadow-md border-2 border-white dark:border-[#1b1b1e]">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-[#8e8e93] mt-2.5">
              @{user.username}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1.5">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f0f2f5] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1.5">
              Avatar Image URL
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f0f2f5] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6] placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#c4c4ca] mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-light-border dark:border-[#2d2d34] bg-[#f0f2f5] dark:bg-[#26262b] focus:outline-none focus:ring-2 focus:ring-signal-500/40 text-light-text dark:text-[#f3f4f6]"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !displayName.trim()}
            className="w-full py-2.5 bg-signal-500 hover:bg-signal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-full transition-all shadow-xs flex items-center justify-center gap-2 mt-4"
          >
            {isSaving ? (
              <LoadingSpinner size="sm" className="border-white" />
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
