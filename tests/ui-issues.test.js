// UI Issues Test Script using Playwright
// This script automates checking the issues identified in the screenshot

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

test.describe('Chat UI Issues', () => {
  let page;
  let consoleMessages = [];
  let networkRequests = [];

  test.beforeEach(async ({ browser }) => {
    // Start a new browser context for each test
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Collect console logs
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // Collect network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });
    
    page.on('response', response => {
      const request = response.request();
      const foundRequest = networkRequests.find(req => req.url === request.url());
      if (foundRequest) {
        foundRequest.response = {
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Determine base URL from Playwright config env or fallbacks
    const DEFAULT_BASE_URL = 'http://localhost:3006';
    const envBase = process.env.UI_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL;
    // Go to the chat application root using relative path to leverage baseURL if set
    try {
      await page.goto(envBase + '/');
    } catch (navErr) {
      console.log(`Navigation to ${envBase} failed:`, navErr.message);
    }
    
    // Try to login (but continue tests even if login fails)
    try {
      await loginUser(page, 'test@example.com', 'password123');
    } catch (err) {
      console.log('Login failed but continuing tests:', err.message);
      // Take screenshot of login issue
      await page.screenshot({ path: path.join(reportsDir, 'login-failed.png') });
    }
  });

  test.afterEach(async ({ }, testInfo) => {
    // Function to sanitize filenames
    const sanitizeFilename = (name) => {
      return name.replace(/[<>:"/\\|?*]/g, '_');
    };
    
    const safeTitle = sanitizeFilename(testInfo.title);
    
    // Save console logs to file
    fs.writeFileSync(
      path.join(reportsDir, `${safeTitle}-console.json`),
      JSON.stringify(consoleMessages, null, 2)
    );
    
    // Save network requests to file
    fs.writeFileSync(
      path.join(reportsDir, `${safeTitle}-network.json`),
      JSON.stringify(networkRequests, null, 2)
    );
    
    // Clear the collections for the next test
    consoleMessages = [];
    networkRequests = [];
  });

  test('Check "Always connecting" status issue', async () => {
    // Wait for chat UI elements regardless of login success
    await page.waitForSelector('body', { timeout: 10000 });
    await page.screenshot({ path: path.join(reportsDir, 'initial-page-load.png') });
    
    // Check for connection status indicators
    const connectionElements = await page.locator('*:has-text("connect"), .status, .connection-status').all();
    let connectingFound = false;
    
    for (const element of connectionElements) {
      const text = await element.textContent();
      if (text.toLowerCase().includes('connect')) {
        connectingFound = true;
        console.log(`Found connection element with text: "${text}"`);
        // Highlight element in screenshot
        await element.evaluate(node => {
          node.style.border = '3px solid red';
        });
      }
    }
    
    // Wait to see if connection status changes
    await page.waitForTimeout(8000);
    await page.screenshot({ path: path.join(reportsDir, 'connection-status-after-wait.png') });
    
    // Check for WebSocket connections in network logs
    const socketRequests = networkRequests.filter(r => 
      r.url.includes('socket.io') || 
      r.url.includes('ws') || 
      r.url.includes('websocket')
    );
    
    console.log(`Found ${socketRequests.length} WebSocket-related requests`);
    fs.writeFileSync(
      path.join(reportsDir, 'websocket-requests.json'),
      JSON.stringify(socketRequests, null, 2)
    );
    
    // Log socket.io specific errors from console
    const socketErrors = consoleMessages.filter(msg => 
      msg.text.includes('socket') || 
      msg.text.includes('connection') || 
      msg.text.includes('websocket')
    );
    
    if (socketErrors.length > 0) {
      console.log('Socket.io related errors found:', socketErrors);
    }
  });

  test('Check non-responsive UI elements', async () => {
    // Take screenshot of initial UI state
    await page.screenshot({ path: path.join(reportsDir, 'ui-initial-state.png') });
    
    // Identify all clickable elements
    const clickableElements = await page.locator('button, [role="button"], a, .clickable').all();
    console.log(`Found ${clickableElements.length} potentially clickable elements`);
    
    // Test each element for responsiveness
    const nonResponsiveElements = [];
    
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      if (await element.isVisible() && await element.isEnabled()) {
        const initialConsoleCount = consoleMessages.length;
        const initialNetworkCount = networkRequests.length;
        
        // Get element details for logging
        const tagName = await element.evaluate(node => node.tagName);
        const text = await element.textContent();
        const classes = await element.evaluate(node => node.className);
        
        try {
          // Try clicking the element
          await element.click({ timeout: 2000 });
          await page.waitForTimeout(1000); // Wait for any potential reactions
          
          // Check if there was any reaction (network or console)
          const hadNetworkActivity = networkRequests.length > initialNetworkCount;
          const hadConsoleActivity = consoleMessages.length > initialConsoleCount;
          
          if (!hadNetworkActivity && !hadConsoleActivity) {
            nonResponsiveElements.push({
              tagName,
              text,
              classes,
              index: i
            });
            
            // Highlight non-responsive element
            await element.evaluate(node => {
              node.style.border = '3px solid orange';
            });
          }
        } catch (err) {
          console.log(`Error clicking element ${tagName} with text "${text}": ${err.message}`);
        }
      }
    }
    
    // Take screenshot with highlighted non-responsive elements
    await page.screenshot({ path: path.join(reportsDir, 'non-responsive-elements.png') });
    
    // Save non-responsive elements to file
    fs.writeFileSync(
      path.join(reportsDir, 'non-responsive-elements.json'),
      JSON.stringify(nonResponsiveElements, null, 2)
    );
    
    console.log(`Found ${nonResponsiveElements.length} potentially non-responsive elements`);
  });

  test('Check user status inconsistencies', async () => {
    // Look for user status indicators
    const userElements = await page.locator('.user, .user-item, [data-user]').all();
    console.log(`Found ${userElements.length} user elements`);
    
    // Analyze user status displays
    const userStatuses = [];
    
    for (const userElement of userElements) {
      // Extract user info
      const username = await userElement.locator('.name, .username, [data-username]').textContent().catch(() => 'Unknown');
      const statusText = await userElement.locator('.status, .user-status').textContent().catch(() => 'Unknown');
      const hasOnlineIndicator = await userElement.locator('.online-indicator, .status-online').count() > 0;
      const hasOfflineIndicator = await userElement.locator('.offline-indicator, .status-offline').count() > 0;
      
      userStatuses.push({
        username,
        statusText,
        hasOnlineIndicator,
        hasOfflineIndicator,
        // Check for inconsistencies
        hasInconsistency: (statusText.includes('online') && hasOfflineIndicator) || 
                          (statusText.includes('offline') && hasOnlineIndicator) ||
                          (hasOnlineIndicator && hasOfflineIndicator)
      });
      
      // Highlight inconsistent status indicators
      if (userStatuses[userStatuses.length - 1].hasInconsistency) {
        await userElement.evaluate(node => {
          node.style.border = '3px solid purple';
        });
      }
    }
    
    // Take screenshot with highlighted inconsistent status indicators
    await page.screenshot({ path: path.join(reportsDir, 'user-status-inconsistencies.png') });
    
    // Save user statuses to file
    fs.writeFileSync(
      path.join(reportsDir, 'user-statuses.json'),
      JSON.stringify(userStatuses, null, 2)
    );
    
    console.log(`Found ${userStatuses.filter(u => u.hasInconsistency).length} users with status inconsistencies`);
    
    // Check presence service API calls
    const presenceRequests = networkRequests.filter(r => 
      r.url.includes('presence') || 
      r.url.includes('status')
    );
    
    fs.writeFileSync(
      path.join(reportsDir, 'presence-requests.json'),
      JSON.stringify(presenceRequests, null, 2)
    );
    // Wait for the chat interface to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Try to deselect any selected user (by clicking elsewhere or on a "close" button)
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    
    // Take screenshot of UI state with no user selected
    await page.screenshot({ path: path.join(reportsDir, 'no-user-selected.png') });
    
    // Check if message input is still accessible when it shouldn't be
    const messageInput = await page.locator('textarea, input[type="text"]').first();
    const isInputAccessible = await messageInput.isVisible() && await messageInput.isEnabled();
    
    if (isInputAccessible) {
      console.log('ISSUE: Message input is accessible even with no user selected');
      
      // Try sending a message to nowhere
      await messageInput.fill('Message with no recipient selected');
      
      // Find send button
      const sendButton = await page.locator('button:has-text("Send"), [aria-label="Send message"], .send-button').first();
      if (await sendButton.count() > 0) {
        await sendButton.click();
        
        // Check for errors related to sending with no recipient
        const recipientErrors = consoleMessages.filter(msg => 
          msg.type === 'error' && 
          (msg.text.includes('recipient') || msg.text.includes('user') || msg.text.includes('target'))
        );
        
        if (recipientErrors.length > 0) {
          console.log('Errors related to sending with no recipient:', recipientErrors);
        }
      }
    }
  });

  test('Check chat functionality with test messages', async () => {
    // Identify the message input area
    const messageInput = await page.locator('textarea, input[type="text"], [contenteditable="true"]')
      .filter({ hasText: '' })
      .first();
    
    if (await messageInput.count() === 0) {
      console.log('Could not find message input field');
      await page.screenshot({ path: path.join(reportsDir, 'no-message-input.png') });
      return;
    }
    
    // Try to send a test message
    await messageInput.fill('Test message from Playwright automation');
    
    // Look for a send button
    const sendButton = await page.locator('button:has-text("Send"), [aria-label="Send message"], .send-button').first();
    
    if (await sendButton.count() === 0) {
      console.log('Could not find send button');
      await page.screenshot({ path: path.join(reportsDir, 'no-send-button.png') });
      return;
    }
    
    // Click send button
    await sendButton.click();
    
    // Wait for message to appear in chat or timeout
    let messageAppeared = false;
    try {
      await page.waitForSelector(':has-text("Test message from Playwright automation")', { timeout: 5000 });
      messageAppeared = true;
    } catch (err) {
      console.log('Message did not appear in chat after sending');
    }
    
    // Take screenshot of chat after sending message
    await page.screenshot({ path: path.join(reportsDir, 'after-sending-message.png') });
    
    // Check for errors in console related to message sending
    const messagingErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('message') || msg.text.includes('send') || msg.text.includes('socket'))
    );
    
    if (messagingErrors.length > 0) {
      console.log('Errors related to message sending:', messagingErrors);
    }
    
    // Check network requests for message sending
    const messageRequests = networkRequests.filter(r => 
      r.method === 'POST' && 
      (r.url.includes('message') || r.url.includes('chat'))
    );
    
    fs.writeFileSync(
      path.join(reportsDir, 'message-requests.json'),
      JSON.stringify(messageRequests, null, 2)
    );
  });

  test('Validate WebSocket connections and reconnection behavior', async () => {
    // Look for WebSocket connections
    const wsConnections = networkRequests.filter(r => 
      r.url.includes('socket.io') || 
      r.url.includes('ws:') || 
      r.url.includes('wss:')
    );
    
    console.log(`Found ${wsConnections.length} WebSocket connection attempts`);
    
    // Check for reconnection patterns (multiple attempts)
    const reconnectionAttempts = {};
    wsConnections.forEach(conn => {
      const baseUrl = conn.url.split('?')[0];
      reconnectionAttempts[baseUrl] = (reconnectionAttempts[baseUrl] || 0) + 1;
    });
    
    const multipleAttemptUrls = Object.entries(reconnectionAttempts)
      .filter(([url, count]) => count > 1)
      .map(([url, count]) => ({ url, count }));
    
    if (multipleAttemptUrls.length > 0) {
      console.log('Found reconnection patterns:', multipleAttemptUrls);
    }
    
    // Check for Socket.IO related console messages
    const socketMessages = consoleMessages.filter(msg => 
      msg.text.includes('socket') || 
      msg.text.includes('io') || 
      msg.text.includes('connection')
    );
    
    fs.writeFileSync(
      path.join(reportsDir, 'socket-messages.json'),
      JSON.stringify(socketMessages, null, 2)
    );
    
    // Force a disconnect and check reconnection behavior
    await page.evaluate(() => {
      // Attempt to disconnect socket if it exists
      if (window.io && window.io.socket) {
        console.log('Manually disconnecting socket.io connection');
        window.io.socket.disconnect();
      } else if (window.socket) {
        console.log('Manually disconnecting socket connection');
        window.socket.disconnect();
      }
    });
    
    // Wait for potential reconnect
    await page.waitForTimeout(5000);
    
    // Take screenshot after disconnect attempt
    await page.screenshot({ path: path.join(reportsDir, 'after-disconnect.png') });
    
    // Check if new connection attempts were made
    const newWsConnections = networkRequests.filter(r => 
      (r.url.includes('socket.io') || r.url.includes('ws:') || r.url.includes('wss:')) &&
      new Date(r.timestamp) > new Date(Date.now() - 5000) // In the last 5 seconds
    );
    
    console.log(`Found ${newWsConnections.length} new WebSocket connection attempts after disconnect`);
  });
});

// Helper function for login
async function loginUser(page, email, password) {
  // Try to find login form elements with various potential selectors
  const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[id*="email"]').first();
  const passwordInput = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password"], input[id*="password"]').first();
  const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  
  // Check if we found all login elements
  if (await emailInput.count() === 0 || await passwordInput.count() === 0 || await loginButton.count() === 0) {
    throw new Error('Could not find all login form elements');
  }
  
  // Fill login form
  await emailInput.fill(email);
  await passwordInput.fill(password);
  
  // Click login button
  await loginButton.click();
  
  // Wait for navigation or UI change
  await page.waitForTimeout(3000);
}