import { test as base, expect } from '@playwright/test';
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
    // Create a unique test user
    const timestamp = Date.now();
    const userData = {
      username: `testuser_${timestamp}`,
      email: `testuser_${timestamp}@example.com`,
      password: 'password123',
    };

    try {
      // Register the user
      await registerUser(userData.username, userData.email, userData.password);
    } catch (error) {
      // User might already exist, which is fine
    }

    // Login to get token
    const token = await loginUser(userData.email, userData.password);

    // Login through the UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(userData.email, userData.password);
    await loginPage.expectLoginSuccess();

    await use({
      ...userData,
      token,
    });
  },
});

export { expect };