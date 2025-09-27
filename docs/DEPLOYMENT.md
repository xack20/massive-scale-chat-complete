# Deployment Guide (Draft)

This guide covers development, staging, and production deployment paths for the Massive Scale Chat platform.

## 1. Environments

| Environment | Purpose | Characteristics |
|-------------|---------|-----------------|
| Development | Local iteration | Docker Compose, hot reload, single replicas |
| Staging | Pre‑prod validation | Close to prod sizing, feature flags enabled |
| Production | Live traffic | Autoscaling, HA, observability fully enabled |

## 2. Images & Tagging

Recommended tagging scheme:
```
<service>:<semver>-<gitsha>
example: user-service:1.3.0-ab12cd3
```
Latest stable pointer tags (e.g. `user-service:1.3`) may supplement for rollout tools.

## 3. Build (Production Artifacts)

Each service has a `Dockerfile` (dev) and optionally `Dockerfile.prod`. For a lean prod image:
1. Install only production dependencies.
2. Copy compiled TypeScript (`dist/`).
3. Run as non-root user (add in future hardening step).

Example build (user-service):
```bash
docker build -f services/user-service/Dockerfile.prod -t chat-app/user-service:$(git rev-parse --short HEAD) services/user-service
```

## 4. Configuration Management

Configuration sources (precedence high→low):
1. Secrets manager (future) / Kubernetes Secrets
2. Kubernetes ConfigMaps / environment variables
3. Default values inside code

Avoid baking secrets into images. Keep `.env` only for local dev.

## 5. Docker Compose (Dev / Lightweight Staging)

Start full stack:
```bash
./setup.sh
./start-dev.sh
```
Stop:
```bash
./start-dev.sh stop
```
Cleanup:
```bash
./start-dev.sh cleanup
```

## 6. Kubernetes Deployment

Apply manifests:
```bash
kubectl apply -f infrastructure/kubernetes/
```

Namespace used: `chat-app` (ensure `namespace.yaml` applied first).

### 6.1 Minimal Hardening Checklist (Prod)

| Area | Action |
|------|--------|
| Resource Limits | Ensure CPU/memory limits present for all pods |
| Liveness/Readiness | Add `/health` → readiness, add liveness for fatal error detection |
| Probes Timeouts | Set `initialDelaySeconds`, `timeoutSeconds` tuned per service |
| Secrets | Move sensitive env (JWT, DB passwords) to `Secret` objects |
| Network Policies | Isolate database backends from public ingress |
| Pod Security | Run as non-root, drop NET_RAW, read-only rootfs where possible |
| Logging | Ship to central aggregator (ELK / Loki) |
| Metrics | Expose `/metrics` over cluster-internal HTTP |
| Tracing | Sidecar or OpenTelemetry collector deployment |

### 6.2 Horizontal Scaling

| Service | Primary Scaling Metric | Notes |
|---------|------------------------|-------|
| API Gateway | CPU / req latency | Maintain sticky WS sessions through LB |
| Presence Service | Active socket count | May require Redis cluster beyond ~250k connections |
| Message Service | Mongo ops / CPU | Partition or shard Mongo when write IOPS high |
| Notification Service | Kafka consumer lag | Scale consumer group replicas |

## 7. Zero-Downtime Strategy

| Concern | Approach |
|---------|----------|
| WebSockets | Use rolling deployment + LB draining (HAProxy stickiness) |
| DB Migrations (Prisma) | Backward-compatible additive changes first, then code switch |
| Canary Releases | Deploy new image subset (e.g., 1 of 5 replicas) watch metrics |
| Rollback | Keep previous image tag, use `kubectl rollout undo` or redeploy manifest |

## 8. Observability Enablement

1. Add Prometheus annotations to pod templates once `/metrics` implemented:
```yaml
annotations:
	prometheus.io/scrape: "true"
	prometheus.io/port: "3001"
	prometheus.io/path: "/metrics"
```
2. Configure Alertmanager routes (see `monitoring/alertmanager.yml`).
3. Add dashboards (sample JSON in `monitoring/grafana-dashboard.json`).

## 9. Secrets & Key Rotation

Short term: rotate JWT secret manually & restart pods.
Medium term: introduce external secret store (Vault / AWS Secrets Manager) and reload via sidecar or re‑deploy.

## 10. Backup & Retention

| Component | Backup Method | Frequency |
|-----------|---------------|-----------|
| PostgreSQL | pg_dump or WAL archiving | Daily + point-in-time (prod) |
| MongoDB | `mongodump` / snapshot | Daily |
| Redis (presence ephemeral) | None (not required) |
| MinIO | Object storage replication / snapshot | Depends on compliance |

## 11. Disaster Recovery (Outline)

| Failure | Action |
|---------|--------|
| Region outage | Restore from backups in secondary cluster |
| Data corruption (Postgres) | PITR using WAL + base backup |
| Kafka broker loss | Replace broker, reassign partitions (multi-broker prod only) |

## 12. Performance Testing

Run load tests before scaling decisions:
```bash
./scripts/load-test.sh   # (placeholder – implement tool e.g., k6 / artillery)
```
Collect baseline p95 latencies & active connection capacities.

## 13. Deployment Pipeline (Future CI/CD)

Stages:
1. Lint & Unit Tests
2. Build & Tag Images
3. Security Scan (Trivy or similar)
4. Push to Registry
5. Apply K8s Manifests (kubectl / Helm)
6. Run Smoke Tests
7. Progressive Rollout (Argo Rollouts / Flagger)

## 14. Change Management

| Step | Requirement |
|------|-------------|
| PR Merge | Green pipeline + review |
| Release Tag | Semantic version bump |
| Changelog | Update features/fixes/breaking |
| Post-Deploy | Verify health & key metrics |

## 15. Open Items

| Item | Status | Notes |
|------|--------|-------|
| Automated DB migrations on deploy | Pending | Add init container or job |
| Structured event schemas repo | Pending | Create `schemas/` directory |
| Multi-arch image builds | Pending | Use `docker buildx bake` |

---
Iterate this file as operational maturity increases; link new runbooks and ADRs as they are authored.
