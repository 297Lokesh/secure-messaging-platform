"use client";

import React from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { EmptyChatState } from "./EmptyChatState";
import { useChat } from "@/context/ChatContext";

interface ChatAreaProps {
  onBackMobile: () => void;
  onOpenDetails: () => void;
  onStartChat: () => void;
}

export function ChatArea({
  onBackMobile,
  onOpenDetails,
  onStartChat,
}: ChatAreaProps) {
  const {
    activeConversation,
    messages,
    loadingMessages,
    typingUsers,
    replyingTo,
    setReplyingTo,
    sendMessage,
    sendTyping,
  } = useChat();

  if (!activeConversation) {
    return <EmptyChatState onStartChat={onStartChat} />;
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-dark-bg min-w-0">
      <ChatHeader
        conversation={activeConversation}
        onBackMobile={onBackMobile}
        onOpenDetails={onOpenDetails}
      />
      <MessageList
        messages={messages}
        conversation={activeConversation}
        isLoading={loadingMessages}
        typingUsers={typingUsers}
        onReply={setReplyingTo}
      />
      <MessageComposer
        onSendMessage={sendMessage}
        onTyping={sendTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
