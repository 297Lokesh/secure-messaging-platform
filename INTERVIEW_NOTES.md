# Full-Stack Engineering Interview Notes: Signal Secure Messaging Platform

This document is specifically structured to help you explain every technical detail, design trade-off, architectural decision, and future extension during an SDE Fullstack interview.

---

## 1. Why Next.js?
- **Modern React Paradigm**: Utilizes Next.js 14 App Router, React Server Components (where applicable), and client components for interactive real-time views.
- **Routing & Code Organization**: Built-in declarative routing (`/login`, `/register`, `/chat`) with route protection in `AuthContext`.
- **Ecosystem & Polish**: Out-of-the-box support for TypeScript, Tailwind CSS, image optimization, and rapid production bundling for Vercel.
- **Single-Page Application Feel**: Once loaded, transitions between conversations are instantaneous with zero full-page reloads, mirroring native desktop messaging clients like Signal Desktop.

---

## 2. Why FastAPI?
- **High Concurrency & Asynchronous I/O**: Built on Starlette and Uvicorn with native `async`/`await` support, making it exceptionally fast for concurrent WebSocket connections and I/O-bound database queries.
- **Automatic Schema Validation**: Pydantic v2 ensures strict typing and validation for incoming payloads and outgoing serialization.
- **Native WebSockets**: Supports persistent WebSocket connections (`/ws/{user_id}`) with bi-directional streaming alongside traditional REST endpoints in a single unified codebase.
- **Self-Documenting**: Auto-generates OpenAPI / Swagger interactive documentation (`/docs`) and ReDoc (`/redoc`).

---

## 3. Why SQLite?
- **Zero-Configuration & Portability**: Completely self-contained in a single file (`secure_chat.db`), requiring no external daemon or container setup for evaluation.
- **High Performance for Single-Node Workloads**: With WAL (Write-Ahead Logging) and proper indexing on foreign keys (`conversation_id`, `sender_id`, `user_id`), SQLite handles thousands of read/write operations per second with sub-millisecond latencies.
- **Thread Concurrency**: Configured with `check_same_thread=False` to safely operate with FastAPI's asynchronous threadpool.
- **Seamless ORM Abstraction**: SQLAlchemy 2.0 isolates dialect-specific code, allowing an effortless 1-line configuration migration to PostgreSQL in production.

---

## 4. Why WebSockets?
- **Full-Duplex Real-Time Communication**: Unlike HTTP polling or Server-Sent Events (SSE), WebSockets maintain an open TCP connection allowing instantaneous client-to-server and server-to-client message push without the overhead of HTTP headers on every packet.
- **Low Latency & High Frequency**: Essential for live typing indicators (sent on debounced keystrokes), real-time read receipts (`✓✓`), and immediate delivery ticks.
- **Connection State Awareness**: The server immediately detects disconnections via TCP disconnects or missed ping/pong heartbeats to update online/offline presence across peers.

---

## 5. Database Schema & Relationships Explained

```
users (1) ──────────< contacts (N)
  │
  ├──< conversation_members (N) >────────── conversations (1)
  │                                                │
  ├──< messages (N) >──────────────────────────────┘
  │        │
  │        ├──< message_reads (N)
  │        └── (self-referencing reply_to_id)
  │
  └── user_settings (1:1)
```

1. **`users`**:
   - Stores identity (`id`, `username`, `phone`, `password_hash`, `display_name`, `avatar_url`, `is_online`, `last_seen`).
2. **`contacts`**:
   - Represents a directional contact relationship (`user_id`, `contact_user_id`).
   - `UniqueConstraint("user_id", "contact_user_id")` prevents duplicates.
3. **`conversations`**:
   - Type is either `"direct"` (1-to-1) or `"group"`.
   - Indexed `updated_at` column allows sorting conversations by latest activity in `O(log N)` time.
4. **`conversation_members`**:
   - Join table between `conversations` and `users`.
   - Role column designates `"admin"` or `"member"`. Admins have privileges to add/remove members in groups.
   - Cascading deletes ensure cleanup if a conversation or user is deleted.
5. **`messages`**:
   - Normalized message records (`conversation_id`, `sender_id`, `content`, `status`, `reply_to_id`).
   - `reply_to_id` is a self-referencing foreign key linking to a previous message.
6. **`message_reads`**:
   - Tracks granular per-user read events (`message_id`, `user_id`, `read_at`).
   - `UniqueConstraint("message_id", "user_id")` ensures idempotent read receipts.
7. **`user_settings`**:
   - 1:1 relationship with `users` storing privacy toggles (`read_receipts`, `last_seen_privacy`, `theme`).

---

## 6. Authentication Architecture
1. **Password Security**:
   - Bcrypt hashing using salt rounds (work factor 12). Plaintext passwords are never stored or logged.
2. **Mock OTP Flow**:
   - Registration requires phone number verification. For testing and assignment reproducibility, OTP is verified against `123456`.
3. **JWT Bearer Tokens**:
   - On successful login or OTP verification, the backend signs a JWT with the user's ID as the `sub` claim using `HS256`.
4. **WebSocket Authentication**:
   - WebSockets cannot send custom HTTP headers during the initial browser handshake. The token is passed as a query parameter (`/ws/{user_id}?token=...`), validated before connection acceptance, and verified to ensure `sub == user_id` to prevent spoofing.

---

## 7. Real-Time Message Flow

```
[User A] (Frontend)
   │ 1. User types message & hits Enter
   │ 2. Optimistic UI update (displays message with 'sending' status)
   │ 3. WebSocket send_message event
   ▼
[FastAPI WebSocket Endpoint]
   │ 4. Validate JWT & conversation membership
   │ 5. Save message to SQLite (status: 'delivered' if recipient online, else 'sent')
   │ 6. Send 'message_sent_ack' back to User A
   │ 7. Broadcast 'new_message' to all online conversation members
   ▼
[User B] (Frontend)
   │ 8. Receives 'new_message' via WebSocket
   │ 9. UI appends message immediately to chat stream
   │ 10. Automatically sends 'read_receipt' back if conversation is open
   ▼
[FastAPI]
   │ 11. Records read in DB & broadcasts 'messages_read' to User A
   ▼
[User A]
   │ 12. Message status checks update to blue double-check (✓✓ read) in real time
```

---

## 8. Delivery & Read Receipts Explained
- **Sending (`Clock` icon)**: Optimistic message added to local state before server acknowledgement.
- **Sent (`✓` single gray check)**: Server persisted the message to the database, but no other conversation members are currently connected to WebSockets.
- **Delivered (`✓✓` double gray check)**: Server verified that at least one recipient is actively connected to the WebSocket manager when the message was processed.
- **Read (`✓✓` double blue check)**: Recipient opened the conversation; client dispatches a `read_receipt` event; server logs `message_reads` and broadcasts `messages_read` to the sender.

---

## 9. Debounced Typing Indicator
- **Problem**: Emitting an event on every single keystroke causes WebSocket network flooding and unnecessary UI re-renders.
- **Solution**:
  - Frontend triggers `sendTyping(true)` on the first keystroke.
  - A 2000ms timer resets on consecutive keystrokes.
  - When the user stops typing for 2000ms or presses Enter to send, `sendTyping(false)` is dispatched.
  - The recipient UI displays an animated 3-dot bouncing bubble with "Sarah is typing..." that automatically disappears when typing ceases.

---

## 10. Group Messaging Logic
- **Creation**: Creator selects multiple contacts, provides a group name, and is assigned the `"admin"` role.
- **Broadcasting**: The WebSocket manager queries all conversation members and iterates over their active socket connections, distributing the payload only to active members.
- **Role Permissions**: Only `"admin"` members can add or remove other participants. Any member can voluntarily leave the group.
- **UI Differentiation**: Incoming group bubbles display the sender's display name above the message in distinctive colors.

---

## 11. Frontend/Backend Communication Architecture
- **REST APIs**: Used for resource lifecycle operations, authentication, profile updates, and historical message pagination (`GET /api/conversations/{id}/messages?skip=0&limit=50`).
- **WebSockets**: Used exclusively for volatile, real-time events (incoming messages, delivery/read updates, typing indicators, user presence).
- **Graceful Fallback**: If the WebSocket is disconnected, `ChatContext` transparently falls back to sending messages via `POST /api/conversations/{id}/messages`.

---

## 12. Scaling Beyond SQLite (Production Evolution)
To scale this platform to millions of active users:
1. **Database Migration**:
   - Replace SQLite with **PostgreSQL** or **CockroachDB**.
   - Use connection pooling via **PgBouncer** or SQLAlchemy AsyncEngine pool.
2. **Distributed WebSocket Pub/Sub**:
   - In a multi-node backend cluster (e.g., Kubernetes), client sockets reside on different machines.
   - Introduce **Redis Pub/Sub** or **Redis Streams** to broadcast events across worker nodes.
3. **Database Sharding & Partitioning**:
   - Partition the `messages` table by `conversation_id` and time ranges.
4. **Caching Layer**:
   - Cache recent conversations, user online status, and session tokens in **Redis** with TTLs.

---

## 13. How Real Signal Protocol Encryption Works
*Note: This assignment simulates E2E encryption for interview evaluation.*

If integrating production Signal Protocol:
1. **Key Generation**:
   - Every client generates:
     - Identity Key Pair (long-term Curve25519)
     - Signed Prekey (medium-term, signed by Identity Key)
     - One-Time Prekeys (batch of Curve25519 ephemeral keys uploaded to server)
2. **X3DH (Extended Triple Diffie-Hellman)**:
   - When User A wants to message User B for the first time, User A fetches User B's prekey bundle from the server and performs 3 or 4 Diffie-Hellman agreements to establish a shared master secret.
3. **Double Ratchet Algorithm**:
   - Combines a symmetric-key KDF ratchet with a Diffie-Hellman ratchet for every message.
   - **Forward Secrecy**: If a current session key is compromised, previous messages cannot be decrypted.
   - **Post-Compromise Security**: A compromised ratchet recovers secrecy after one round-trip exchange.
4. **Zero-Knowledge Server**:
   - The server only relays encrypted ciphertext payloads (`bytes`) and prekey bundles; the server never possesses private keys and cannot decrypt any message content.

---

## 14. Deployment Architecture
- **Frontend**: Deployed to **Vercel** with automatic global CDN edge caching. Environment variables set: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.
- **Backend**: Containerized via Docker or deployed on **Railway** / **Render** using `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **CORS Configuration**: Configured in FastAPI to whitelist production domain URLs alongside localhost.

---

## 15. Likely Interviewer Questions & Model Answers

### Q: "Why did you separate REST endpoints and WebSockets?"
> *"REST provides idempotent, cacheable, and easily debuggable CRUD operations for resources like profiles, settings, and historical pagination. WebSockets are reserved for high-frequency, low-latency, bidirectional events like typing indicators, read receipts, and live message broadcasts. If the socket temporarily drops, the application can still fall back to REST to submit messages."*

### Q: "How do you handle race conditions when two users message each other at the same time?"
> *"Database transactions in SQLite/SQLAlchemy ensure atomic writes for each message with auto-incrementing IDs and UTC timestamps. The client uses optimistic UI rendering with temporary IDs (`temp_id`), which are subsequently reconciled when the server returns the authoritative message record with its database ID."*

### Q: "How did you prevent duplicate contacts or duplicate direct chats?"
> *"At the database level, composite unique constraints (`UniqueConstraint('user_id', 'contact_user_id')`) prevent duplicate contact entries. For direct conversations, the backend performs a join query on `conversation_members` to verify if a 1-to-1 conversation already exists between the two users before instantiating a new one."*

### Q: "What happens if a user opens the app in multiple browser tabs?"
> *"Our `ConnectionManager` maps each `user_id` to a `Set[WebSocket]`. When a message is sent to that user, the manager iterates over all open sockets in that set. When a tab closes, only that specific socket is discarded; the user is only marked offline when their socket set is empty."*
