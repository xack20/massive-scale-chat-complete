# API Reference (Initial Draft)

This document enumerates currently implemented REST endpoints (observed in code) and planned additions. All routes are exposed to clients via the API Gateway under the `/api` prefix. Authentication uses JWT Bearer tokens unless stated otherwise.

## 1. Conventions

| Aspect | Convention |
|--------|------------|
| Authentication | `Authorization: Bearer <jwt>` header |
| User Context Propagation | Gateway injects `x-user-id`, `x-user-name` headers to downstream services (internal trust boundary) |
| Error Shape | `{ error: string, message?: string, [fieldErrors]? }` |
| Pagination Params | `page`, `limit` (defaults vary by service) |
| Date Format | ISO-8601 UTC strings |

## 2. User Service (`/api/users`)

| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | `/api/users/health`* | none | Liveness (direct service port) | Not proxied with `/api` in gateway (service local) |
| GET | `/api/users/profile` | required | Current user profile | Uses `x-user-id` header internally |
| PUT | `/api/users/profile` | required | Update profile fields | Validates username uniqueness |
| POST | `/api/users/avatar` | required | Upload avatar (multipart `avatar`) | Returns updated avatar URL |
| POST | `/api/users/change-password` | required | Change password | Verifies current password |
| DELETE | `/api/users/account` | required | Soft delete account | Obfuscates email/username |
| GET | `/api/users/search?query=term&limit=` | required | Search active users | Min length = 2 |
| GET | `/api/users?search=&page=&limit=` | required | Paginated user list | Returns pagination meta |
| GET | `/api/users/:id` | required | Fetch user by ID | 404 if not found |

> *Health endpoints generally reside at direct service root (`/health`). When accessed through gateway, use explicit service port or future aggregated health aggregator.

## 3. Message Service (`/api/messages`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/messages` | required | Create/send message (body: `conversationId`, `content`, optional `type`, `attachments`, `replyTo`) |
| GET | `/api/messages/conversation/:conversationId?page=&limit=` | required | Paginated fetch (reverse chronological) |
| PUT | `/api/messages/:id` | required | Edit own message (`content`) |
| DELETE | `/api/messages/:id` | required | Soft delete own message |

Emits Kafka events (topics currently named `message-sent`, `message-updated`, `message-deleted`). Future migration to dotted naming (`message.persisted`) planned.

## 4. Presence Service (`/api/presence`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/presence/online` | required | List of currently online users (Redis scan) |
| GET | `/api/presence/status/:userId` | required | Presence status for a user |
| PUT | `/api/presence/status` | required | Update current user status (body: `{ status }`) |

### WebSocket Events (proxied via `/ws` → Presence Service)

| Direction | Event | Payload | Notes |
|-----------|-------|---------|-------|
| client→server | `user-online` | `userId` | Marks user online & broadcasts update |
| client→server | `typing` | `{ userId, conversationId }` | Broadcasts `user-typing` to room |
| client→server | `stop-typing` | `{ userId, conversationId }` | Broadcasts `user-stop-typing` |
| server→client | `presence-update` | `{ userId, status }` | Online/offline transitions |
| server→client | `user-typing` | `{ userId }` | Typing indicator |

## 5. File Service (`/api/files`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/files`* | required | Upload file (multipart: `file`) → returns URL + metadata |
| GET | `/api/files/:fileName` | required | Streams file (future: optional public) |

> *Exact upload route filename pattern depends on `fileRoutes` (not shown here if additional paths exist). Adjust as code evolves.

## 6. Notification Service (`/api/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/notifications` | required | Send notification (email or push) |
| GET | `/api/notifications` | required | List current user notifications (Redis list) |
| PUT | `/api/notifications/:notificationId` | required | Mark as read (stub implementation) |

Consumes Kafka topics: `message-sent`, `user-activity` (logic placeholder).

## 7. Authentication & Gateway

Authentication endpoints (register/login) are implied but not present in inspected code segments—likely to be added in gateway or user-service (`/auth/*`). Once implemented they should:

- Return `{ token, user }` on success
- Set JWT expiry & include role claims

Gateway responsibilities:

- Rate limiting (middleware `rateLimiter`)
- Header injection (`x-user-id`, `x-user-name`) post-verify (implementation to confirm)
- WebSocket proxy `/ws` to presence-service

## 8. Error Handling

Standard error format recommendations (partially implemented):

```json
{
    "error": "Bad Request",
    "message": "Username is already taken",
    "details": [
        { "field": "username", "message": "Already exists" }
    ]
}
```

## 9. Versioning (Planned)

- Introduce `/v1/` prefix when first breaking change emerges.
- Maintain OpenAPI spec generation pipeline (future task).

## 10. Rate Limiting (Current State)

- Applied at gateway under `/api` – strategy & window config TBD (expand docs once configuration extracted to env).

## 11. Security Checklist (Implemented vs Planned)

| Area | Implemented | Planned |
|------|-------------|---------|
| JWT signature validation | ✅ | Rotate keys, add JWKs endpoint |
| Input validation (express-validator) | ✅ (users/messages) | Extend to all services |
| Rate limiting | ✅ gateway | Per-route classes / Redis backend |
| CORS explicit origins | ✅ | Dynamic tenant-level control |
| File type checks | Partial | MIME sniff + AV scan |
| Audit logging | Basic logger | Structured event audit log |

## 12. Change Log (API Scope)

| Date | Change | Notes |
|------|--------|-------|
| 2025-09-27 | Initial consolidated API draft | Based on code audit |

---
This file evolves with each new endpoint. Additions MUST update table sections above.
