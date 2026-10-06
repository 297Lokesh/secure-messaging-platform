"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { NewMessageModal } from "@/components/modals/NewMessageModal";
import { NewGroupModal } from "@/components/modals/NewGroupModal";
import { ContactModal } from "@/components/modals/ContactModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { GroupInfoModal } from "@/components/modals/GroupInfoModal";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { activeConversation, selectConversation, connectionStatus } = useChat();

  // Modals state
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // Authentication Route Guard: redirect unauthenticated users to /login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-dark-bg text-slate-500">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-xs font-medium tracking-wide text-slate-400">
          Loading Signal Secure Messaging...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white dark:bg-dark-bg">
      {/* Reconnection notification banner */}
      {connectionStatus !== "connected" && (
        <div className="bg-amber-500 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 select-none z-50 shadow-xs">
          {connectionStatus === "connecting" ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Connecting to Signal secure real-time server...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Connection lost. Automatically reconnecting...</span>
            </>
          )}
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar: Visible on desktop, or on mobile when no conversation is selected */}
        <div
          className={`h-full ${
            activeConversation ? "hidden md:flex" : "flex w-full md:w-auto"
          }`}
        >
          <Sidebar
            onOpenNewMessage={() => setIsNewMessageOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenContacts={() => setIsContactModalOpen(true)}
          />
        </div>

        {/* Chat Area: Visible on desktop, or on mobile when a conversation is selected */}
        <div
          className={`h-full flex-1 ${
            !activeConversation ? "hidden md:flex" : "flex w-full"
          }`}
        >
          <ChatArea
            onBackMobile={() => selectConversation(null)}
            onOpenDetails={() => setIsGroupInfoOpen(true)}
            onStartChat={() => setIsNewMessageOpen(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <NewMessageModal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
        onOpenNewGroup={() => setIsNewGroupOpen(true)}
        onOpenAddContact={() => setIsContactModalOpen(true)}
      />

      <NewGroupModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {activeConversation && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          conversation={activeConversation}
        />
      )}
    </div>
  );
}
