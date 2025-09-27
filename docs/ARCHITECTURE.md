# Architecture

This document provides a concrete, code-aligned view of the system architecture. It complements the high‑level overview in the README and the behavioral/agent model in `AGENTS.md`.

## 1. System Overview

Massive Scale Chat is a microservices-based real‑time communication platform. The design goals are:

- Horizontal scalability (stateless edges, shardable stateful services)
- Low‑latency bi‑directional messaging (WebSockets via Socket.IO)
- Polyglot persistence (PostgreSQL, MongoDB, Redis, Object Storage)
- Event-driven extensibility (Kafka event backbone)
- Operational transparency (health endpoints, planned metrics/tracing)

```text
Client (Web / Mobile)
	│ HTTP(S) / WebSocket
	▼
┌─────────────────────────────────────┐
│            API Gateway              │  Express + http-proxy-middleware
└────────────────┬────────────────────┘
				 │ (path-based proxy & auth)
 ┌───────────────┼───────────────┬───────────────┬───────────────┬──────────────┐
 │               │               │               │               │              │
 ▼               ▼               ▼               ▼               ▼              ▼
User Service  Message Service  File Service  Notification Svc  Presence Svc   (Future agents)
 (Postgres)     (MongoDB)        (MinIO+Mongo)   (Redis/Kafka)    (Redis+WS)     (Kafka driven)
```

## 2. Services & Responsibilities

| Service | Key Responsibilities | Persistence | External Interfaces |
|---------|----------------------|-------------|---------------------|
| API Gateway | Auth enforcement, request routing, rate limiting, WebSocket upgrade proxy (/ws) | Stateless | HTTP, WS proxy |
| User Service | Registration, authentication, profile mgmt, password lifecycle | PostgreSQL (Prisma) | REST (/api/users/*) |
| Message Service | Conversation & message persistence, message mutation events, Kafka publishing | MongoDB (Mongoose) | REST (/api/messages/*), Kafka producer, planned WS rooms |
| File Service | Direct upload, object storage abstraction, file retrieval | MinIO (S3 API), metadata (future MongoDB) | REST (/api/files/*) |
| Notification Service | Email & push dispatch, consuming domain events | Redis (lists), Kafka consumer | REST (/api/notifications/*), Kafka consumer |
| Presence Service | Online/offline tracking, typing indicators, transient presence cache | Redis | REST (/api/presence/*), native Socket.IO server |

## 3. Runtime Communication Flows

### 3.1 Synchronous (Request/Response)

- Clients invoke REST endpoints via API Gateway (`/api/...`).
- Gateway applies authentication (JWT header → `authMiddleware`) then proxies to downstream.
- Service responses pass back unchanged (no aggregation yet).

### 3.2 Real-Time (WebSocket / Socket.IO)

- WebSocket endpoint exposed at `/ws` (proxied to Presence Service by gateway).
- Presence Service manages session events (`user-online`, `typing`, `stop-typing`) and emits `presence-update` & typing broadcasts.
- Message Service currently sets up Socket.IO room join/leave semantics (future enhancement: message broadcast upon persistence).

### 3.3 Event Streaming (Kafka)

- Message Service publishes topics: `message-sent`, `message-updated`, `message-deleted` (actual names in code: `message-sent`, etc.).
- Notification Service subscribes to domain topics (`message-sent`, `user-activity`).
- Future agents (moderation, enrichment) will subscribe/emit additional events per `AGENTS.md` proposals.

### 3.4 Caching & Presence

- Presence states stored as ephemeral Redis keys: `presence:<userId>` (TTL 300s). Each entry: `{ status, socketId, lastSeen }`.
- Presence Service invalidates keys on disconnect by scanning keys (improvement opportunity: maintain reverse index or Redis set for O(1) lookup).

## 4. Data Models (Representative)

### 4.1 User (Prisma – simplified)

```text
id (UUID) | username | email | password | fullName | avatar | bio | role | isActive | isVerified | lastLogin | timestamps
```

### 4.2 Message (Mongoose)

Supports reactions, attachments, edits, soft delete (`deletedAt`), read receipts, threading (`replyTo`, `threadId`), sender metadata.

### 4.3 Conversation (Mongoose)

Tracks participants (roles + lastSeen), `lastMessage` projection, settings (privacy, invite policy), archival flags.

### 4.4 Notification (Redis list element – ephemeral)

Stored as JSON objects under `notifications:<userId>` (FIFO semantics). No persistence migration yet (future: durable store or TTL management).

## 5. Security Boundaries

| Vector | Current Control | Improvements |
|--------|-----------------|--------------|
| Auth | JWT validation in gateway & service middlewares | Centralize token introspection cache, add key rotation |
| Rate Limiting | Basic rateLimiter at gateway (`/api`) | Differentiate by route class (auth vs data), sliding window, Redis store |
| File Uploads | Size & type validation (middleware implied) | Antivirus hook, content scanning, MIME sniffing |
| WS Auth | Gateway proxy + service auth middleware (planned) | Token revalidation on heartbeat, origin allowlist |
| Secrets | Inline env vars in compose/manifests | External secret manager, sealed secrets for k8s |

## 6. Observability

Implemented:
- Per-service `/health` endpoints
- Structured logging (Winston-style `logger` helper)

Planned / To Implement (see roadmap):
- Prometheus metrics exporter (gauge/counter sets from `AGENTS.md`)
- Distributed tracing (OpenTelemetry collector)
- Structured correlation IDs (currently not propagated) – add middleware at gateway (requestId) + forward headers.

## 7. Scalability Considerations

| Layer | Strategy | Current State |
|-------|----------|---------------|
| HTTP Edge | Horizontal replicas behind HAProxy / k8s Service | Gateway k8s deployment (replicas=3) done |
| WebSockets | Sticky sessions (HAProxy) | Config present (needs verification) |
| Message Storage | MongoDB indexing on hot query fields | Indexes defined in schemas |
| Presence | Redis ephemeral keys w/ TTL | O(N) key scan on disconnect (optimize later) |
| Events | Kafka partition scaling | Single-broker dev; production multi-broker planned |
| Files | Object storage (MinIO) | Single node dev instance |

## 8. Failure Modes & Mitigations

| Failure | Impact | Mitigation (Implemented/Planned) |
|---------|--------|----------------------------------|
| Redis outage | Presence + notification queue loss | Degrade gracefully → offline; add circuit breaker |
| Kafka unavailable | Event propagation stalls | Buffer in-memory / fallback logs (future) |
| DB saturation | Latency spikes | Connection pooling, add read replicas (future) |
| Slow WS clients | Backpressure | Drop non-critical events (typing) – planned |

## 9. Deployment Artifacts

| Layer | Dev (Compose) | Prod (Kubernetes) |
|-------|---------------|-------------------|
| Infra | `docker-compose.yml` services for Postgres, Mongo, Redis, Kafka, MinIO, HAProxy | Manifests under `infrastructure/kubernetes/` (some pending completion) |
| Build | Per-service Dockerfiles (+ `.prod` variants) | Image push pipeline (CI not yet included) |
| Config | Env inline or `.env` root | ConfigMap + Secrets (placeholder configmap) |

## 10. Identified Gaps / Action Items

| Area | Gap | Recommended Action |
|------|-----|--------------------|
| Metrics | No `/metrics` endpoints | Introduce Prometheus client lib (Node) + register counters/gauges |
| Tracing | Not implemented | Add OpenTelemetry SDK + traceparent propagation in gateway |
| Docs | `API.md`, `DEPLOYMENT.md` placeholders | Populate (see PR scope) |
| WS Auth | Lack of per-connection token recheck | Add handshake middleware verifying JWT + periodically refresh |
| Presence Disconnect | O(N) scan for socket ID | Add Redis hash mapping socket → user or set membership |
| Event Naming | Mixed (`message-sent`) vs proposed (`message.persisted`) | Adopt canonical naming & alias transitional topics |
| Notification Persistence | Pure Redis lists | Introduce TTL or migration to durable store (Mongo/Postgres) |

### 11. Extension Path (Short-Term)

1. Implement metrics (user-service pilot) → replicate pattern.
2. Standardize event schema + envelope (correlationId, timestamp ISO8601).
3. Add gateway request correlation ID header pass-through (`x-correlation-id`).
4. Introduce moderation hook in message pipeline before persistence.
5. Add summarization async agent reading Kafka topic.

## 12. Architectural Decision Records (Seeds)

| ADR ID | Title | Status | Rationale (Summary) |
|--------|-------|--------|----------------------|
| ADR-001 | Polyglot persistence | Accepted | Optimize data models per domain (relational vs document vs key-value) |
| ADR-002 | Event backbone via Kafka | Accepted | Decoupled async workflows & future AI agents |
| ADR-003 | WebSockets (Socket.IO) vs raw WS | Accepted | Feature richness (rooms, fallbacks) |
| ADR-004 | Gateway path proxy | Accepted | Central auth, rate limiting, minimize client service awareness |
| ADR-005 | Redis TTL for presence | Trial | Simplifies stale session cleanup; revisit for scale >500k |

## 13. Future Considerations

- Multi-region presence (CRDT or regionally sharded Redis + eventual aggregation)
- End-to-end encryption (client-managed keys) implications on moderation
- Quota enforcement & rate shaping per workspace / channel
- Data retention executor (privacy compliance)

---
Maintained as living documentation. Update alongside structural or cross-cutting changes.
