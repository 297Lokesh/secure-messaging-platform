"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Conversation,
  Message,
  Contact,
  User,
} from "@/types";
import { conversationApi, messageApi, contactsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket, ConnectionStatus } from "@/hooks/useWebSocket";

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  contacts: Contact[];
  onlineUsers: Set<number>;
  typingUsers: { userId: number; displayName: string }[];
  connectionStatus: ConnectionStatus;
  loadingConversations: boolean;
  loadingMessages: boolean;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  selectConversation: (conv: Conversation | null) => void;
  sendMessage: (content: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  createDirectChat: (recipientUserId: number) => Promise<Conversation>;
  createGroupChat: (name: string, memberUserIds: number[]) => Promise<Conversation>;
  refreshConversations: () => Promise<void>;
  refreshContacts: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<number, Message[]>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [typingMap, setTypingMap] = useState<Record<number, { userId: number; displayName: string }[]>>({});
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // Load conversations and contacts on mount
  const refreshConversations = useCallback(async () => {
    if (!token) return;
    try {
      const list = await conversationApi.getConversations();
      setConversations(list);
    } catch {
      // Ignore
    }
  }, [token]);

  const refreshContacts = useCallback(async () => {
    if (!token) return;
    try {
      const list = await contactsApi.getContacts();
      setContacts(list);
    } catch {
      // Ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      setLoadingConversations(true);
      Promise.all([refreshConversations(), refreshContacts()]).finally(() => {
        setLoadingConversations(false);
      });
    }
  }, [token, refreshConversations, refreshContacts]);

  // WebSocket Handlers
  const handleConnectionEstablished = useCallback((serverOnlineUsers: number[]) => {
    setOnlineUsers(new Set(serverOnlineUsers));
  }, []);

  const handleNewMessage = useCallback((msg: Message) => {
    const convId = msg.conversation_id;

    // Append to messages list if conversation is loaded
    setMessagesMap((prev) => {
      const existing = prev[convId] || [];
      // Prevent duplicates
      if (existing.some((m) => m.id === msg.id)) return prev;
      return {
        ...prev,
        [convId]: [...existing, msg],
      };
    });

    // Update conversation in sidebar (bring to top, update last message, update unread count)
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) {
        // Conversation not yet loaded in sidebar, refresh
        refreshConversations();
        return prev;
      }
      const updatedConv = { ...prev[idx] };
      updatedConv.last_message = msg;
      updatedConv.updated_at = msg.created_at;

      const isCurrentActive = activeConvRef.current?.id === convId;
      if (!isCurrentActive && msg.sender_id !== user?.id) {
        updatedConv.unread_count = (updatedConv.unread_count || 0) + 1;
      }

      const rest = prev.filter((_, i) => i !== idx);
      return [updatedConv, ...rest];
    });

    // If active conversation, mark as read immediately
    if (activeConvRef.current?.id === convId && msg.sender_id !== user?.id) {
      sendWsReadReceipt(convId, [msg.id]);
    }
  }, [user?.id, refreshConversations]);

  const handleMessageSentAck = useCallback((msg: Message & { temp_id?: string }) => {
    const convId = msg.conversation_id;
    setMessagesMap((prev) => {
      const existing = prev[convId] || [];
      // Replace optimistic message if matching temp_id
      if (msg.temp_id) {
        const index = existing.findIndex((m) => m.temp_id === msg.temp_id);
        if (index !== -1) {
          const updated = [...existing];
          updated[index] = msg;
          return { ...prev, [convId]: updated };
        }
      }
      if (existing.some((m) => m.id === msg.id)) return prev;
      return { ...prev, [convId]: [...existing, msg] };
    });

    // Update conversation last_message in list
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], last_message: msg, updated_at: msg.created_at };
      const rest = prev.filter((_, i) => i !== idx);
      return [updated, ...rest];
    });
  }, []);

  const handleMessagesRead = useCallback(
    (data: { conversation_id: number; user_id: number; message_ids: number[]; read_at: string }) => {
      const { conversation_id, message_ids, user_id, read_at } = data;
      setMessagesMap((prev) => {
        const existing = prev[conversation_id];
        if (!existing) return prev;
        const updated = existing.map((m) => {
          if (message_ids.includes(m.id)) {
            const hasRead = m.reads.some((r) => r.user_id === user_id);
            const reads = hasRead
              ? m.reads
              : [...m.reads, { id: Date.now(), message_id: m.id, user_id, read_at }];
            return {
              ...m,
              status: "read" as const,
              reads,
            };
          }
          return m;
        });
        return { ...prev, [conversation_id]: updated };
      });
    },
    []
  );

  const handleUserTyping = useCallback(
    (data: { conversation_id: number; user_id: number; display_name: string; is_typing: boolean }) => {
      const { conversation_id, user_id, display_name, is_typing } = data;
      setTypingMap((prev) => {
        const current = prev[conversation_id] || [];
        if (is_typing) {
          if (current.some((u) => u.userId === user_id)) return prev;
          return {
            ...prev,
            [conversation_id]: [...current, { userId: user_id, displayName: display_name }],
          };
        } else {
          return {
            ...prev,
            [conversation_id]: current.filter((u) => u.userId !== user_id),
          };
        }
      });
    },
    []
  );

  const handleUserStatusChange = useCallback(
    (data: { user_id: number; is_online: boolean; last_seen: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.is_online) next.add(data.user_id);
        else next.delete(data.user_id);
        return next;
      });

      // Update contacts list status
      setContacts((prev) =>
        prev.map((c) => {
          if (c.contact_user.id === data.user_id) {
            return {
              ...c,
              contact_user: {
                ...c.contact_user,
                is_online: data.is_online,
                last_seen: data.last_seen,
              },
            };
          }
          return c;
        })
      );

      // Update conversations list other_user status
      setConversations((prev) =>
        prev.map((c) => {
          if (c.other_user?.id === data.user_id) {
            return {
              ...c,
              other_user: {
                ...c.other_user,
                is_online: data.is_online,
                last_seen: data.last_seen,
              },
            };
          }
          return c;
        })
      );
    },
    []
  );

  const handleMessageEdited = useCallback((msg: Message) => {
    setMessagesMap((prev) => {
      const existing = prev[msg.conversation_id];
      if (!existing) return prev;
      return {
        ...prev,
        [msg.conversation_id]: existing.map((m) => (m.id === msg.id ? msg : m)),
      };
    });
  }, []);

  const handleMessageDeleted = useCallback((data: { message_id: number; conversation_id: number }) => {
    setMessagesMap((prev) => {
      const existing = prev[data.conversation_id];
      if (!existing) return prev;
      return {
        ...prev,
        [data.conversation_id]: existing.filter((m) => m.id !== data.message_id),
      };
    });
  }, []);

  // Initialize WebSocket connection
  const { status: connectionStatus, sendWsMessage, sendWsTyping, sendWsReadReceipt } =
    useWebSocket(user?.id, token, {
      onConnectionEstablished: handleConnectionEstablished,
      onNewMessage: handleNewMessage,
      onMessageSentAck: handleMessageSentAck,
      onMessagesRead: handleMessagesRead,
      onUserTyping: handleUserTyping,
      onUserStatusChange: handleUserStatusChange,
      onMessageEdited: handleMessageEdited,
      onMessageDeleted: handleMessageDeleted,
    });

  // Select conversation and load messages
  const selectConversation = useCallback(
    async (conv: Conversation | null) => {
      setActiveConversation(conv);
      setReplyingTo(null);

      if (!conv) return;

      // Reset unread count in sidebar locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      );

      // Load messages if not already in memory or fetch fresh
      setLoadingMessages(true);
      try {
        const history = await messageApi.getMessages(conv.id, 0, 50);
        setMessagesMap((prev) => ({
          ...prev,
          [conv.id]: history,
        }));

        // Send read receipts for any unread incoming messages
        const unreadIds = history
          .filter((m) => m.sender_id !== user?.id && m.status !== "read")
          .map((m) => m.id);
        if (unreadIds.length > 0) {
          sendWsReadReceipt(conv.id, unreadIds);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.id, sendWsReadReceipt]
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversation || !user || !content.trim()) return;

      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();

      // Create optimistic message
      const optimisticMsg: Message = {
        id: -Date.now(),
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content: content.trim(),
        message_type: "text",
        status: "sending",
        reply_to_id: replyingTo?.id || null,
        reply_to: replyingTo
          ? {
              id: replyingTo.id,
              content: replyingTo.content,
              sender_id: replyingTo.sender_id,
              sender_name: replyingTo.sender.display_name,
            }
          : null,
        created_at: now,
        updated_at: now,
        sender: user,
        reads: [],
        temp_id: tempId,
      };

      // Add to messages list optimistically
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), optimisticMsg],
      }));

      setReplyingTo(null);

      // Attempt WebSocket transmission first
      const sentViaWs = sendWsMessage(
        activeConversation.id,
        content.trim(),
        tempId,
        replyingTo?.id
      );

      // Fallback to REST API if WebSocket is not open
      if (!sentViaWs) {
        try {
          const sent = await messageApi.sendMessage(
            activeConversation.id,
            content.trim(),
            replyingTo?.id
          );
          setMessagesMap((prev) => {
            const list = prev[activeConversation.id] || [];
            return {
              ...prev,
              [activeConversation.id]: list.map((m) => (m.temp_id === tempId ? sent : m)),
            };
          });
        } catch {
          // Mark failed
        }
      }
    },
    [activeConversation, user, replyingTo, sendWsMessage]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeConversation) return;
      sendWsTyping(activeConversation.id, isTyping);
    },
    [activeConversation, sendWsTyping]
  );

  const createDirectChat = useCallback(
    async (recipientUserId: number) => {
      const conv = await conversationApi.createDirectConversation(recipientUserId);
      await refreshConversations();
      selectConversation(conv);
      return conv;
    },
    [refreshConversations, selectConversation]
  );

  const createGroupChat = useCallback(
    async (name: string, memberUserIds: number[]) => {
      const conv = await conversationApi.createGroupConversation(name, memberUserIds);
      await refreshConversations();
      selectConversation(conv);
      return conv;
    },
    [refreshConversations, selectConversation]
  );

  const activeMessages = activeConversation ? messagesMap[activeConversation.id] || [] : [];
  const activeTyping = activeConversation ? typingMap[activeConversation.id] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages: activeMessages,
        contacts,
        onlineUsers,
        typingUsers: activeTyping,
        connectionStatus,
        loadingConversations,
        loadingMessages,
        replyingTo,
        setReplyingTo,
        selectConversation,
        sendMessage,
        sendTyping,
        createDirectChat,
        createGroupChat,
        refreshConversations,
        refreshContacts,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
