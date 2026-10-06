"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface WebSocketHandlers {
  onConnectionEstablished?: (onlineUsers: number[]) => void;
  onNewMessage?: (message: any) => void;
  onMessageSentAck?: (message: any) => void;
  onMessagesRead?: (data: { conversation_id: number; user_id: number; message_ids: number[]; read_at: string }) => void;
  onUserTyping?: (data: { conversation_id: number; user_id: number; display_name: string; is_typing: boolean }) => void;
  onUserStatusChange?: (data: { user_id: number; is_online: boolean; last_seen: string }) => void;
  onMessageEdited?: (message: any) => void;
  onMessageDeleted?: (data: { message_id: number; conversation_id: number }) => void;
}

export function useWebSocket(
  userId?: number,
  token?: string | null,
  handlers: WebSocketHandlers = {}
) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const handlersRef = useRef<WebSocketHandlers>(handlers);

  // Keep handlers up to date without triggering reconnection
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!userId || !token) {
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus("connecting");
    const wsUrl = `${WS_BASE_URL}/ws/${userId}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        retryCountRef.current = 0;

        // Start ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;
          const data = payload.data;

          switch (type) {
            case "connection_established":
              handlersRef.current.onConnectionEstablished?.(data?.online_users || []);
              break;
            case "new_message":
              handlersRef.current.onNewMessage?.(data);
              break;
            case "message_sent_ack":
              handlersRef.current.onMessageSentAck?.(data);
              break;
            case "messages_read":
              handlersRef.current.onMessagesRead?.(data);
              break;
            case "user_typing":
              handlersRef.current.onUserTyping?.(data);
              break;
            case "user_status":
              handlersRef.current.onUserStatusChange?.(data);
              break;
            case "message_edited":
              handlersRef.current.onMessageEdited?.(data);
              break;
            case "message_deleted":
              handlersRef.current.onMessageDeleted?.(data);
              break;
            case "pong":
              break;
            default:
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Exponential backoff auto-reconnect
        const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
        retryCountRef.current += 1;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setStatus("disconnected");
    }
  }, [userId, token]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Client actions
  const sendWsMessage = useCallback(
    (conversationId: number, content: string, tempId?: string, replyToId?: number) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "send_message",
            conversation_id: conversationId,
            content,
            temp_id: tempId,
            reply_to_id: replyToId,
            message_type: "text",
          })
        );
        return true;
      }
      return false;
    },
    []
  );

  const sendWsTyping = useCallback((conversationId: number, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          conversation_id: conversationId,
          is_typing: isTyping,
        })
      );
    }
  }, []);

  const sendWsReadReceipt = useCallback((conversationId: number, messageIds: number[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && messageIds.length > 0) {
      wsRef.current.send(
        JSON.stringify({
          type: "read_receipt",
          conversation_id: conversationId,
          message_ids: messageIds,
        })
      );
    }
  }, []);

  return {
    status,
    sendWsMessage,
    sendWsTyping,
    sendWsReadReceipt,
  };
}
