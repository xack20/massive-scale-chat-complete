import { expect, test } from './fixtures/test-fixtures';

test.describe('Performance Tests', () => {
  test.describe('Load Testing', () => {
    test('should handle multiple concurrent users', async ({ page, context }) => {
      const numberOfUsers = 5;
      const contexts: any[] = [];
      
      try {
        // Create multiple browser contexts to simulate concurrent users
        for (let i = 0; i < numberOfUsers; i++) {
          const newContext = await context.browser()?.newContext();
          if (newContext) {
            contexts.push(newContext);
          }
        }
        
        // Login all users concurrently
        const loginPromises = contexts.map(async (ctx, index) => {
          const page = await ctx.newPage();
          await page.goto('/login');
          await page.locator('[data-testid="email-input"]').fill(`testuser${index + 1}@example.com`);
          await page.locator('[data-testid="password-input"]').fill('password123');
          await page.locator('[data-testid="login-button"]').click();
          await expect(page).toHaveURL(/\/chat/);
          return page;
        });
        
        const pages = await Promise.all(loginPromises);
        
        // Send messages from all users simultaneously
        const messagePromises = pages.map(async (userPage, index) => {
          await userPage.locator('[data-testid="rooms-list"] >> text="General"').click();
          const message = `Concurrent message from user ${index + 1} - ${Date.now()}`;
          await userPage.locator('[data-testid="message-input"]').fill(message);
          await userPage.locator('[data-testid="send-button"]').click();
        });
        
        await Promise.all(messagePromises);
        
        // Verify all messages are visible to all users
        for (const userPage of pages) {
          for (let i = 0; i < numberOfUsers; i++) {
            await expect(userPage.locator(`text*="Concurrent message from user ${i + 1}"`)).toBeVisible();
          }
        }
        
      } finally {
        // Clean up contexts
        for (const ctx of contexts) {
          await ctx.close();
        }
      }
    });

    test('should handle rapid message sending', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      const messagesCount = 20;
      const startTime = Date.now();
      
      // Send messages rapidly
      for (let i = 0; i < messagesCount; i++) {
        const message = `Rapid message ${i + 1} - ${Date.now()}`;
        await chatPage.sendMessage(message);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Sent ${messagesCount} messages in ${duration}ms`);
      
      // Verify all messages are visible
      for (let i = 0; i < messagesCount; i++) {
  await expect(chatPage.page.locator(`text*="Rapid message ${i + 1}"`)).toBeVisible();
      }
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not leak memory with long chat sessions', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Get initial performance metrics
  const initialMetrics = await chatPage.page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        };
      });
      
      // Simulate long chat session with many messages
      for (let i = 0; i < 100; i++) {
        await chatPage.sendMessage(`Memory test message ${i + 1}`);
        
        // Every 10 messages, force garbage collection (if available)
        if (i % 10 === 0) {
          await chatPage.page.evaluate(() => {
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
        }
      }
      
      // Get final performance metrics
  const finalMetrics = await chatPage.page.evaluate(() => {
        return {
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
        };
      });
      
      // Memory usage shouldn't grow excessively
      const memoryGrowth = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      console.log(`Memory growth: ${memoryGrowth} bytes`);
      
      // This is a rough check - adjust threshold based on your app's behavior
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions', async ({ chatPage, authenticatedUser }) => {
      // Simulate slow network
  const client = await chatPage.page.context().newCDPSession(chatPage.page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50 KB/s
        uploadThroughput: 20 * 1024,   // 20 KB/s
        latency: 500, // 500ms latency
      });
      
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      const startTime = Date.now();
      await chatPage.sendMessage(`Slow network test message - ${Date.now()}`);
      const endTime = Date.now();
      
      const messageDelay = endTime - startTime;
      console.log(`Message sent in ${messageDelay}ms under slow network conditions`);
      
      // Restore normal network conditions
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
    });

    test('should handle network disconnection and reconnection', async ({ chatPage, authenticatedUser }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Send a message while online
      await chatPage.sendMessage('Message before disconnection');
      
      // Simulate network disconnection
  const client = await chatPage.page.context().newCDPSession(chatPage.page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });
      
      // Try to send message while offline (should be queued)
      await chatPage.sendMessage('Message while offline');
      
      // Restore network connection
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });
      
      // Verify messages are sent after reconnection
      await chatPage.expectMessageVisible('Message before disconnection');
      await chatPage.expectMessageVisible('Message while offline');
    });
  });
});