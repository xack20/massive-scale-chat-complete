# AGENTS.md

Authoritative reference for all autonomous or semi-autonomous runtime actors ("agents") in the Massive Scale Chat platform. This file is designed to be incrementally updated as new behavioral components, background processors, or AI-driven modules are introduced.

> Scope: In current codebase (as of 2025-09-27) there are no explicit AI/LLM agents; the system consists of microservices plus real-time session handlers. We model these runtime participants as "agents" to establish a consistent vocabulary and extension pathway for future intelligent components.

---

## 1. Terminology

| Term | Definition |
|------|------------|
| Agent | A long-lived or on-demand runtime actor with a focused responsibility, state boundaries, and defined communication interfaces. Can be a microservice instance, WebSocket session handler, or future AI reasoning module. |
| Service Agent | Containerized microservice deployment (message, presence, notification, user, file, api-gateway, frontend edge) owning a bounded context. |
| Session Agent | Ephemeral WebSocket (Socket.IO) connection handler representing an authenticated user session, responsible for transient event routing and presence signaling. |
| Event | A discrete, immutable notification (Kafka message, Redis Pub/Sub, WebSocket emission) conveying state change or intent. |
| Command | Intent-directed input that requests work (e.g., REST POST /messages). |
| Projection | Read-optimized materialization (e.g., cached presence map in Redis). |

---

## 2. Current Agent Taxonomy

### 2.1 Core Service Agents

| Agent | Primary Responsibilities | Persistence | External Interfaces |
|-------|--------------------------|-------------|---------------------|
| api-gateway | Edge routing, authentication pass-through, request fan-out (future), aggregation placeholder | None (stateless) | HTTP (clients → downstream), future WebSocket upgrade passthrough |
| message-service | Message ingestion, validation, persistence (future model placeholder), event publication | (Planned: MongoDB / PostgreSQL mix per README) | REST, Kafka (publish/consume), internal auth checks |
| presence-service | Real-time user presence, typing indicators, session lifecycle, WebSocket orchestration | Redis (ephemeral state) | Socket.IO, Redis, maybe Kafka (future events) |
| notification-service | Email / push / system notifications fan-out | Redis (queue/cache), outbound SMTP / push provider | Kafka (consume future), SMTP/Push APIs |
| user-service | User profiles, auth logic, credentials, profile enrichment | PostgreSQL (Prisma ORM) | REST, internal token verification |
| file-service | File metadata handling, upload orchestration to object storage (MinIO/S3) | MongoDB / S3-compatible storage | REST, storage SDK |
| frontend (Next.js) | UI composition, SSR/ISR delivery, WebSocket client bootstrap | N/A | HTTP(S), Socket.IO client |

### 2.2 Session Agents

One per active WebSocket (Socket.IO) connection. They:

1. Authenticate (token / session validation).
2. Join logical rooms (e.g., conversation, user, presence). *Rooms are implicit group channels — treat them as transient coordination fabrics — not durable topics.*
3. Emit presence/typing heartbeats → presence-service → Redis projection.
4. Forward user events (message typed, file upload initiated) to service REST endpoints or to future Kafka producers.

### 2.3 Future AI / Automation Agent Placeholders

These are NOT yet implemented; reserved identifiers to keep naming consistent:

| Planned Agent | Description | Trigger Mode |
|---------------|-------------|--------------|
| enrichment-agent | Post-processes messages for metadata extraction (language, sentiment) | Kafka consumer on `message.persisted` |
| moderation-agent | Real-time content policy filtering (before broadcast) | Synchronous hook in message-service pipeline |
| summarization-agent | Periodic thread summarization for long chats | Scheduled / on-demand user request |
| recommendation-agent | Suggest contacts / channels / file shares | Batch + real-time hybrid |
| retention-agent | Applies data retention / redaction policies | Scheduled scan |

---

## 3. Communication Model

| Channel | Technology | Usage Pattern | Reliability | Notes |
|---------|-----------|---------------|------------|-------|
| HTTP/REST | Express (services) | Command submission, CRUD | At-least once (client retries) | Gateway may add rate limiting later |
| WebSocket (Socket.IO) | presence-service (and potentially message broadcast) | Low-latency fan-out | Best-effort (transient) | Sticky sessions via HAProxy recommended |
| Kafka | Confluent broker | Event streaming, decoupling (future expansion) | Durable (replication factor intended >1 prod) | Auto-create topics enabled in dev compose |
| Redis | Redis 7 | Presence cache, ephemeral session data, potential pub/sub fanout | In-memory w/ optional AOF | Password-protected via env |
| Object Storage | MinIO/S3 | Binary file persistence | Strong (per backend) | Out of scope for agent semantics |

### 3.1 Event Naming Conventions (Proposed)

```text
<domain>.<entity>.<action>[.<qualifier>]
Examples:
message.thread.created
message.persisted
presence.user.joined
presence.user.left
notification.email.dispatched
file.upload.completed
```

All events SHOULD:

1. Be lowercase dot-delimited.
2. Contain ISO-8601 UTC timestamp in payload.
3. Include a correlationId (UUID v4) propagated from initial command when possible.

### 3.2 Correlation and Causation

Headers / metadata fields (proposed JSON keys):

| Field | Purpose |
|-------|---------|
| correlationId | Trace a logical user action across services |
| causationId | The immediate triggering event id (if event-sourced chaining) |
| requestId | Gateway-generated per inbound HTTP request |
| agentId | Logical agent identity (service name or session id) |

---

## 4. Agent Lifecycle States

### 4.1 Service Agent Lifecycle

```text
INIT → CONFIGURED → CONNECTED (deps healthy) → READY → DEGRADED (partial dep loss) → DRAINING → STOPPED
```

Recommended health endpoints (future): `/health/live`, `/health/ready`.

### 4.2 Session Agent Lifecycle

```text
HANDSHAKE → AUTHENTICATED → SUBSCRIBED (rooms joined) → ACTIVE (heartbeats) → IDLE (no activity > threshold) → TERMINATING → CLOSED
```

Heartbeats (typing/presence) act as liveness pings.

### 4.3 Failure Handling Principles

| Failure | Mitigation |
|---------|-----------|
| Redis unavailable | Fall back to in-memory presence (degraded), mark system DEGRADED |
| Kafka unavailable | Buffer critical events in memory (bounded) or switch to synchronous REST fallback |
| Downstream service 5xx | Circuit-breaker trip, exponential backoff |
| Slow consumer (WS client) | Apply backpressure: drop non-essential events (e.g., typing) |

---

## 5. Observability & Diagnostics

| Aspect | Strategy (Current / Planned) |
|--------|------------------------------|
| Logging | Per-service structured logs (add JSON logger baseline). Include correlationId. |
| Metrics | Prometheus scrape targets (k8s manifests present). Export counts: activeSessions, messagesPersisted, presenceUpdates. |
| Tracing | Planned: OpenTelemetry collector sidecar; propagate traceparent via gateway. |
| Profiling | On-demand (node --inspect) in non-prod. |
| Alerting | Prometheus Alertmanager config scaffold present (monitoring folder). |

### 5.1 Key Proposed Metrics

| Metric | Type | Description |
|--------|------|-------------|
| chat_active_sessions | gauge | Active WebSocket sessions |
| chat_messages_ingested_total | counter | Total messages accepted |
| chat_presence_heartbeats_total | counter | Presence heartbeat events processed |
| chat_notification_dispatch_failures_total | counter | Failed outbound notification attempts |
| chat_agent_state | gauge (labels: service,state) | Service agent lifecycle state numeric mapping |

---

## 6. Security & Trust Boundaries

| Boundary | Concern | Control (Current / Planned) |
|----------|---------|-----------------------------|
| Client ↔ Gateway | Auth token spoofing | JWT signature validation (user-service issuer) |
| WS Session | Session fixation / hijack | Token revalidation on reconnect, enforce origin checks |
| Inter-service | Impersonation | mTLS (planned) / shared network policy initially |
| Kafka topics | Unauthorized publish | SASL/ACL (planned) — dev is open |
| Redis | Data leakage | AUTH password (present) + network isolation |
| File uploads | Malware | Extension + MIME validation; AV scan hook (future) |

### 6.1 Secrets Handling

Environment variables via compose/k8s manifests. Future improvement: sealed secrets or external vault (HashiCorp Vault / AWS Secrets Manager) + rotating credentials.

---

## 7. Extension Points

| Extension | Mechanism | Notes |
|-----------|-----------|-------|
| Pre-message moderation | Middleware hook in message-service before persist | Insert moderation-agent call (sync) |
| Post-persist enrichment | Kafka consumer on message.persisted | enrichment-agent workloads |
| Summarization | On-demand REST endpoint triggers summarization-agent task | Could enqueue Kafka command topic |
| Notification rules | Configurable rule engine | YAML or DB-driven rule evaluation |
| Presence scaling | Redis cluster or CRDT-based gossip layer | Evaluate for >1M sessions |

---

## 8. Versioning & Evolution

| Layer | Versioning Strategy |
|-------|---------------------|
| Events | Semantic evolution via additive fields, version header `eventSchemaVersion` |
| REST APIs | Path-based (`/v1/`) and OpenAPI spec generation (future) |
| Agent Contracts | Documented here; breaking changes require CHANGELOG entry + deprecation window |

### 8.1 Deprecation Workflow (Proposed)

1. Mark section in AGENTS.md with `:deprecated:` tag.
2. Add removal target release (e.g., `Removal: v2.0`).
3. Provide migration guidance.
4. Remove after at least one minor version cycle unless security critical.

---

## 9. Operational Runbooks (Skeleton)

| Scenario | Runbook Steps (High-Level) | SLO Impact |
|----------|---------------------------|-----------|
| Presence spikes | Scale presence-service replicas, verify Redis CPU < 70%, increase Node event loop concurrency | Latency < 500ms updates |
| Kafka backlog growth | Check consumer lag, scale consumer groups, consider partition increase | Event delivery < 5s |
| Notification failures | Inspect retry queue, escalate provider outage, disable non-critical channels | Critical alerts delivered |
| DB connection saturation | Pool introspection, raise max conns, add read replicas | API p95 latency |

Detailed per-service runbooks to be added as instrumentation matures.

---

## 10. Roadmap (Incremental Targets)

| Milestone | Goal | Agents Affected |
|-----------|------|-----------------|
| M1 | Baseline observability metrics emitted | All service agents |
| M2 | Introduce moderation-agent synchronous hook | message-service |
| M3 | Event enrichment pipeline (enrichment-agent + Kafka) | message-service, enrichment-agent |
| M4 | Summarization-agent asynchronous threads | summarization-agent, message-service |
| M5 | End-to-end distributed tracing | All |
| M6 | Intelligent routing (priority notifications) | notification-service, recommendation-agent |

---

## 11. Maintenance Guidelines

When adding a new agent-like component:

1. Pick a unique, hyphenated lowercase name.
2. Define its responsibility in one sentence (single reason to exist).
3. Specify inbound (commands/events) and outbound (events, side-effects) channels.
4. Add lifecycle specifics and failure modes.
5. Update Roadmap if introducing new capability area.
6. Append metrics and security considerations.
PR Checklist (add to description):

```text
[ ] AGENTS.md updated
[ ] Observability hooks added (logs/metrics)
[ ] Security review notes (authZ/authN, data exposure)
[ ] Backward compatibility evaluated
```

---

## 12. Change Log (AGENTS.md)

| Date | Change | Author |
|------|--------|--------|
| 2025-09-27 | Initial comprehensive agent model scaffold | system automation |

## 13. Open Questions

| Topic | Question | Placeholder Resolution Path |
|-------|----------|-----------------------------|
| Event schemas | Central registry needed? | Consider JSON Schema repo subdirectory |
| Multi-region presence | Will Redis suffice at >500k concurrent? | Evaluate CRDT or partitioned shards |
| Moderation latency | Acceptable added ms budget? | Budget decision in performance WG |
| Summarization cost | Frequency vs token spend tradeoffs | Cost model & sampling strategy |

---

## 14. Appendix

### 14.1 Suggested Directory Additions (Future)

```text
services/
  moderation-agent/
  enrichment-agent/
  summarization-agent/
```

### 14.2 Suggested Kafka Topics (Draft)

```text
message.persisted
message.thread.created
presence.user.joined
presence.user.left
notification.dispatch.requested
notification.dispatch.completed
file.upload.completed
```

### 14.3 Metrics Naming Prefix

Use `chat_` prefix for all Prometheus metrics to avoid clashes.

---
End of document. Keep this file authoritative; avoid duplicating agent intent in multiple places—link here instead.
