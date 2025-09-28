# Chat Application UI Testing Guide

This guide explains how to run the automated UI tests to identify and document issues in the chat application interface.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Access to the chat application (running locally or deployed)

## Setup

The testing infrastructure uses Playwright, a powerful browser automation library that allows us to simulate user interactions and capture detailed information about the application's behavior.

To set up the testing environment:

1. Install dependencies:

   ```bash
   npm install @playwright/test --save-dev
   npx playwright install --with-deps chromium
   ```

2. Make sure the chat application is running (typically at `http://localhost:3000`)

   You can use our helper script to start all required services:

   ```bash
   # On Unix/Mac
   ./fix-ui-issues.sh

   # On Windows
   ./fix-ui-issues.bat
   ```

## Running Tests

We provide two convenient scripts to run the UI tests:

### On Linux/macOS

```bash
# Make the script executable
chmod +x scripts/run-ui-tests.sh

# Run the tests
./scripts/run-ui-tests.sh
```

### On Windows

```cmd
scripts\run-ui-tests.bat
```

## What the Tests Check

The automated tests check for several common issues in the chat application:

1. **"Always connecting" status issues**: Detects if the connection status is stuck in a "connecting" state
2. **Non-responsive UI elements**: Tests clickable elements to see if they respond properly
3. **User status inconsistencies**: Checks if user online/offline status is displayed correctly
4. **Message sending functionality**: Verifies if messages are sent and displayed correctly
5. **Chat with no user selected**: Tests behavior when attempting to send messages without selecting a recipient
6. **WebSocket connection issues**: Analyzes connection patterns and reconnection behavior

## Test Reports

After running the tests, you'll find detailed reports in the following locations:

1. **HTML Report**: A comprehensive interactive report will open automatically in your browser
2. **Screenshots**: Captured in `tests/reports` directory, showing UI state at various test stages
3. **Console Logs**: Errors and messages captured during testing, saved in `tests/reports/*-console.json`
4. **Network Requests**: Details of API calls and WebSocket connections in `tests/reports/*-network.json`
5. **Other Artifacts**: Additional information about specific issues found

## Interpreting Results

The tests are designed to highlight issues by:

1. **Visual indicators**: Elements with potential issues are highlighted with colored borders in screenshots
   - Red borders: Connection status issues
   - Orange borders: Non-responsive elements
   - Purple borders: User status inconsistencies

2. **Log files**: Detailed technical information about:
   - WebSocket connections and reconnection attempts
   - Console errors related to specific features
   - Network requests that fail or return unexpected responses

3. **Summary Report**: A comprehensive analysis of test results is available at `tests/reports/ui-issues-summary.md`
   - Run `node scripts/analyze-ui-test-results.js` to generate or update this report
   - The report includes identified issues and specific recommendations

## Troubleshooting Common Issues

If the tests identify issues, here are some common resolutions:

1. **"Always connecting" status**:
   - Check API Gateway configuration for Socket.IO routing
   - Verify WebSocket proxy settings have `ws: true` flag
   - Ensure presence service is running and accessible

2. **Non-responsive UI elements**:
   - Check event handlers in component code
   - Verify API endpoints are working correctly
   - Look for JavaScript console errors

3. **User status issues**:
   - Check presence service connections
   - Verify Socket.IO events for status updates
   - Look for race conditions in status updates

4. **Message sending problems**:
   - Verify message service is running
   - Check message routing in API Gateway
   - Ensure database connections are working

## Adding More Tests

To extend the test suite:

1. Edit `tests/ui-issues.test.js` to add new test cases
2. Follow the Playwright testing patterns shown in existing tests
3. Run the tests to verify your additions

## Continuous Integration

These tests can be integrated into CI/CD pipelines by:

1. Adding a job that runs `npx playwright test`
2. Configuring the job to capture and store test artifacts
3. Setting up notifications for test failures
