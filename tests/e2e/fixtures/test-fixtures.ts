import { test as base, expect } from '@playwright/test';
import { CREATED_TEST_USERS } from '../global-setup';
import { LoginPage, RegisterPage } from '../pages/auth-pages';
import { ChatPage, RoomManagePage } from '../pages/chat-pages';
import { loginUser, registerUser } from '../utils/api-helpers';

// Define custom fixtures
type TestFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  chatPage: ChatPage;
  roomManagePage: RoomManagePage;
  authenticatedUser: { email: string; password: string; username: string; token: string };
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page);
    await use(chatPage);
  },

  roomManagePage: async ({ page }, use) => {
    const roomManagePage = new RoomManagePage(page);
    await use(roomManagePage);
  },

  authenticatedUser: async ({ page }, use) => {
    // Prefer using a pre-created user from global setup to reduce extra registrations
    const fallbackPassword = 'password123';
    let reuse = CREATED_TEST_USERS['testuser1'];
    if (!reuse) {
      // If global setup not executed or user missing, create a scoped one
      const timestamp = Date.now();
      reuse = { username: `testuser_${timestamp}`, email: `testuser_${timestamp}@example.com`, password: fallbackPassword };
      try {
        await registerUser(reuse.username, reuse.email, reuse.password);
      } catch { /* ignore duplicate or transient errors */ }
    }
    const token = await loginUser(reuse.email, reuse.password);
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(reuse.email, reuse.password);
    await loginPage.expectLoginSuccess();
    await use({ ...reuse, token });
  },
});

export { expect };
