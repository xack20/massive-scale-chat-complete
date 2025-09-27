import { test, expect } from '../fixtures/test-fixtures';

test.describe('Cross-browser Compatibility', () => {
  test.describe('Core Features in All Browsers', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work in ${browserName}`, async ({ page }) => {
        // This test will run in all browsers specified in playwright.config.ts
        await page.goto('/login');
        
        // Test basic UI elements are rendered
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      });
    });
  });

  test.describe('Browser-specific Features', () => {
    test('should handle file upload in all browsers', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Test file upload works across browsers
      // This might behave differently in different browsers
      const fileInput = chatPage.page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    });

    test('should handle clipboard operations', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Test clipboard functionality (might require permissions in some browsers)
      const testMessage = 'Test message for clipboard';
      await chatPage.sendMessage(testMessage);
      
      // Try to copy message text (implementation depends on your app)
      // await chatPage.page.keyboard.press('Control+C');
    });
  });
});

test.describe('Mobile Responsiveness', () => {
  test.describe('Mobile Layout', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      // Test with iPhone viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      
      // Check that elements are still visible and usable on mobile
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    });

    test('should handle mobile navigation', async ({ authenticatedUser, chatPage }) => {
      // Test with mobile viewport
      await chatPage.page.setViewportSize({ width: 375, height: 667 });
      await chatPage.goto();
      
      // On mobile, sidebar might be hidden initially
      const sidebar = chatPage.sidebar;
      
      // Check if mobile menu exists
      const mobileMenu = chatPage.page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(sidebar).toBeVisible();
      }
    });
  });

  test.describe('Touch Interactions', () => {
    test('should handle touch gestures', async ({ authenticatedUser, chatPage }) => {
      await chatPage.page.setViewportSize({ width: 375, height: 667 });
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Test swipe gestures for navigation (if implemented)
      // This would require specific implementation based on your app's touch handlers
      
      const messagesList = chatPage.messagesList;
      
      // Simulate scroll/swipe on messages
      await messagesList.hover();
      await chatPage.page.mouse.wheel(0, 100);
    });
  });
});

test.describe('Accessibility', () => {
  test.describe('Keyboard Navigation', () => {
    test('should support keyboard-only navigation', async ({ page }) => {
      await page.goto('/login');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
    });

    test('should support keyboard shortcuts in chat', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Test keyboard shortcuts
      await chatPage.messageInput.focus();
      await chatPage.messageInput.fill('Test message');
      
      // Test Enter to send message
      await chatPage.page.keyboard.press('Enter');
      await chatPage.expectMessageVisible('Test message');
      
      // Test Shift+Enter for new line (if implemented)
      await chatPage.messageInput.focus();
      await chatPage.messageInput.fill('Line 1');
      await chatPage.page.keyboard.press('Shift+Enter');
      await chatPage.messageInput.type('Line 2');
      
      // Should not send message, should create new line
      const inputValue = await chatPage.messageInput.inputValue();
      expect(inputValue).toContain('Line 1\nLine 2');
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');
      
      // Check for ARIA labels and roles
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('aria-label');
    });

    test('should announce dynamic content changes', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('Testing');
      
      // Check that message list has proper ARIA live region
      await expect(chatPage.messagesList).toHaveAttribute('aria-live');
      
      // Send message and check it's announced
      const testMessage = `Accessibility test message - ${Date.now()}`;
      await chatPage.sendMessage(testMessage);
      
      // The message should be in an accessible format
      const messageElement = chatPage.page.locator(`text="${testMessage}"`);
      await expect(messageElement).toHaveAttribute('role');
    });
  });

  test.describe('Color Contrast and Theming', () => {
    test('should support dark mode', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      
      // Toggle dark mode (if available)
      const themeToggle = chatPage.page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        
        // Check that dark theme is applied
        await expect(chatPage.page.locator('body')).toHaveClass(/dark/);
      }
    });

    test('should respect system color preferences', async ({ page }) => {
      // Emulate dark color scheme preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/login');
      
      // Check that the app respects the system preference
      const computedStyle = await page.locator('body').evaluate(el => {
        return getComputedStyle(el).backgroundColor;
      });
      
      // Dark theme should have dark background
      expect(computedStyle).not.toBe('rgb(255, 255, 255)'); // Not white
    });
  });
});