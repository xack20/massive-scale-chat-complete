# End-to-End (E2E) Testing with Playwright

This project includes automated browser tests using Playwright to validate core chat functionality and basic service health.

## What Is Covered

1. User auth bootstrap (register or login via API)
2. Navigating to /chat with an injected authenticated session
3. Sending a chat message through the UI form
4. Verifying the message appears (websocket round-trip)
5. Basic health endpoint sweep (optional – best effort)

## Directory Structure

```text
playwright.config.ts        # Global Playwright configuration
tests/e2e/chat.spec.ts      # Chat messaging flow test
tests/e2e/health.spec.ts    # Health endpoint checks
```

## Prerequisites

- Full stack running via Docker Compose.
- Frontend reachable through HAProxy at <http://localhost> (port 80).
- Websocket endpoint available at ws://localhost/ws.

## Start the Stack

```bash
docker-compose up -d --build
```

Wait until all containers pass their health checks (or inspect with `docker ps` / `docker logs`).

## Run Tests

Install root dependencies (includes Playwright test runner):

```bash
npm install
```

Execute the E2E suite:

```bash
npm run test:e2e
```

To open the HTML report after a run:

```bash
npx playwright show-report
```

## Environment Overrides

By default tests assume frontend is at `http://localhost`. To target a different host/port:

```bash
BASE_URL=http://localhost:3006 npm run test:e2e
```

## How Auth Bootstraps

The test first attempts to register a deterministic user (`e2e-user@example.com`). If already registered it falls back to login. The token and user payload are injected into `localStorage` **before** navigation, mimicking an already authenticated session.

## Extending Tests

- Add assertions for metrics by fetching `/api/messages/metrics` (if exposed via gateway) and parsing counters.
- Add file upload flows once file-service endpoints are stable.
- Add multi-user concurrency tests by spawning multiple workers and distinct test users.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Test hangs on navigation | Frontend not ready | Check container logs, ensure `frontend` healthy |
| Message assertion fails | Websocket not connected or backend handler issue | Confirm presence of `send-message` handler in message-service and socket connection logs |
| 401 errors on API calls | JWT secret mismatch or gateway routing | Ensure all services share same `JWT_SECRET` and HAProxy routes `/api` -> api-gateway |

## CI Integration Notes

In CI, set `CI=1` so retries and reduced workers apply. Artifacts (traces, videos, screenshots) are retained for failing tests.

---

Maintained as part of the observability & QA initiative.
