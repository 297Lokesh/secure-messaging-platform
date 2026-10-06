"use client";

import React, { useState } from "react";
import { SidebarHeader } from "./SidebarHeader";
import { SearchBar } from "./SearchBar";
import { ConversationList } from "./ConversationList";
import { useChat } from "@/context/ChatContext";

interface SidebarProps {
  onOpenNewMessage: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenContacts: () => void;
}

export function Sidebar({
  onOpenNewMessage,
  onOpenSettings,
  onOpenProfile,
  onOpenContacts,
}: SidebarProps) {
  const {
    conversations,
    activeConversation,
    selectConversation,
    loadingConversations,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState("");

  return (
    <aside className="w-full md:w-[340px] lg:w-[360px] h-full flex flex-col bg-white dark:bg-dark-panel border-r border-light-border dark:border-dark-border flex-shrink-0 select-none">
      <SidebarHeader
        onOpenNewMessage={onOpenNewMessage}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenProfile}
        onOpenContacts={onOpenContacts}
      />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        onSelectConversation={selectConversation}
        searchQuery={searchQuery}
        isLoading={loadingConversations}
        onStartNewChat={onOpenNewMessage}
      />
    </aside>
  );
}
