import json
import logging
from typing import Dict, Set, List, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger("websocket")


class ConnectionManager:
    def __init__(self):
        # Map: user_id -> Set of active WebSockets (supports multiple tabs per user)
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Map: conversation_id -> Set of user_ids currently typing
        self.typing_users: Dict[int, Set[int]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Accept and register a user's WebSocket connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket. Active sessions: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket) -> bool:
        """Remove a WebSocket connection. Returns True if user has no remaining connections (went offline)."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} went completely offline.")
                return True
        return False

    def is_user_online(self, user_id: int) -> bool:
        """Check if user has at least one active connection."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_user_ids(self) -> Set[int]:
        """Return the set of all currently connected user IDs."""
        return set(self.active_connections.keys())

    async def send_personal_message(self, user_id: int, message: Dict[str, Any]):
        """Send a message to all open sessions of a specific user."""
        if user_id not in self.active_connections:
            return

        payload = json.dumps(message)
        dead_sockets = set()
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                dead_sockets.add(ws)

        for dead in dead_sockets:
            self.active_connections[user_id].discard(dead)

    async def broadcast_to_conversation(
        self,
        conversation_id: int,
        message: Dict[str, Any],
        member_ids: List[int],
        exclude_user_id: Optional[int] = None
    ):
        """Broadcast an event to all connected members of a conversation."""
        for member_id in member_ids:
            if exclude_user_id and member_id == exclude_user_id:
                continue
            await self.send_personal_message(member_id, message)

    async def broadcast_status(
        self,
        user_id: int,
        is_online: bool,
        last_seen_iso: str,
        target_user_ids: List[int]
    ):
        """Notify relevant contacts/peers about a user's online or offline transition."""
        payload = {
            "type": "user_status",
            "data": {
                "user_id": user_id,
                "is_online": is_online,
                "last_seen": last_seen_iso
            }
        }
        for target_id in set(target_user_ids):
            await self.send_personal_message(target_id, payload)


# Singleton instance
manager = ConnectionManager()
