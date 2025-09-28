import { expect, test } from './fixtures/test-fixtures';

test.describe('Room Management', () => {
  test.describe('Room Creation', () => {
    test('should create a public room', async ({ authenticatedUser, chatPage, roomManagePage }) => {
      await chatPage.goto();
      
      const roomName = `Public Room ${Date.now()}`;
      const roomDescription = 'A test public room';
      
      await roomManagePage.createRoom(roomName, roomDescription, false);
      await roomManagePage.expectRoomCreated(roomName);
    });

    test('should create a private room', async ({ authenticatedUser, chatPage, roomManagePage }) => {
      await chatPage.goto();
      
      const roomName = `Private Room ${Date.now()}`;
      const roomDescription = 'A test private room';
      
      await roomManagePage.createRoom(roomName, roomDescription, true);
      await roomManagePage.expectRoomCreated(roomName);
    });
  });

  test.describe('Room Settings', () => {
    test('should edit room settings', async ({ authenticatedUser, chatPage, roomManagePage }) => {
      await chatPage.goto();
      
      // First create a room
      const roomName = `Editable Room ${Date.now()}`;
      await roomManagePage.createRoom(roomName, 'Original description', false);
      
      // Then edit it (this would require additional page object methods)
      await chatPage.selectRoom(roomName);
      // Room editing functionality would be implemented here
    });

    test('should delete a room', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      
      // Room deletion functionality would be implemented here
      // This would require additional selectors and methods
    });
  });

  test.describe('Room Access Control', () => {
    test('should restrict access to private rooms', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      
      // Test that users cannot access private rooms they're not invited to
      // This would require creating multiple user contexts
    });

    test('should allow invited users to join private rooms', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      
      // Test invitation system for private rooms
      // This would require additional invitation functionality
    });
  });
});

test.describe('User Management', () => {
  test.describe('User Profile', () => {
    test('should update user profile', async ({ authenticatedUser, chatPage, page }) => {
      await chatPage.goto();
      
      // Open user menu and navigate to profile settings
      await chatPage.userMenu.click();
      await page.locator('[data-testid="profile-settings"]').click();
      
      // Update profile information
      const newDisplayName = `Updated Name ${Date.now()}`;
      await page.locator('[data-testid="display-name-input"]').fill(newDisplayName);
      await page.locator('[data-testid="save-profile"]').click();
      
      // Verify profile update
      await expect(page.locator('[data-testid="user-display-name"]')).toContainText(newDisplayName);
    });

    test('should upload profile picture', async ({ authenticatedUser, chatPage, page }) => {
      await chatPage.goto();
      
      await chatPage.userMenu.click();
      await page.locator('[data-testid="profile-settings"]').click();
      
      // Upload profile picture
      const fileInput = page.locator('input[type="file"][data-testid="profile-picture-input"]');
      await fileInput.setInputFiles('test-data/profile-pic.jpg');
      
      await page.locator('[data-testid="save-profile"]').click();
      
      // Verify profile picture updated
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    });
  });

  test.describe('User Settings', () => {
    test('should update notification preferences', async ({ authenticatedUser, chatPage, page }) => {
      await chatPage.goto();
      
      await chatPage.userMenu.click();
      await page.locator('[data-testid="user-settings"]').click();
      
      // Toggle notification settings
      await page.locator('[data-testid="email-notifications-toggle"]').click();
      await page.locator('[data-testid="push-notifications-toggle"]').click();
      
      await page.locator('[data-testid="save-settings"]').click();
      
      // Verify settings saved
      await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    });

    test('should change password', async ({ authenticatedUser, chatPage, page }) => {
      await chatPage.goto();
      
      await chatPage.userMenu.click();
      await page.locator('[data-testid="user-settings"]').click();
      
      // Change password
      await page.locator('[data-testid="current-password"]').fill('password123');
      await page.locator('[data-testid="new-password"]').fill('newpassword123');
      await page.locator('[data-testid="confirm-new-password"]').fill('newpassword123');
      
      await page.locator('[data-testid="change-password"]').click();
      
      // Verify password changed
      await expect(page.locator('[data-testid="password-changed-message"]')).toBeVisible();
    });
  });

  test.describe('User Status', () => {
    test('should update user status', async ({ authenticatedUser, chatPage, page }) => {
      await chatPage.goto();
      
      await chatPage.userMenu.click();
      
      // Set custom status
      await page.locator('[data-testid="status-input"]').fill('Working from home');
      await page.locator('[data-testid="status-emoji"]').click();
      await page.locator('[data-emoji="🏠"]').click();
      
      await page.locator('[data-testid="save-status"]').click();
      
      // Verify status displayed
      await expect(page.locator('[data-testid="user-status"]')).toContainText('Working from home');
    });

    test('should set presence status', async ({ authenticatedUser, chatPage, page }) => {
      await chatPage.goto();
      
      await chatPage.userMenu.click();
      
      // Set away status
      await page.locator('[data-testid="presence-away"]').click();
      
      // Verify presence status
      await expect(page.locator('[data-testid="user-presence"]')).toHaveClass(/away/);
    });
  });
});