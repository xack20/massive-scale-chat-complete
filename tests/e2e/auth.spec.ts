import { test } from './fixtures/test-fixtures';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login with valid credentials', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('testuser1@example.com', 'password123');
      await loginPage.expectLoginSuccess();
    });

    test('should show error with invalid credentials', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login('invalid@example.com', 'wrongpassword');
      await loginPage.expectLoginError();
    });

    test('should navigate to registration page', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.goToRegister();
    });
  });

  test.describe('Registration', () => {
    test('should register a new user', async ({ registerPage }) => {
      const timestamp = Date.now();
      const userData = {
        username: `newuser_${timestamp}`,
        email: `newuser_${timestamp}@example.com`,
        password: 'password123',
      };

      await registerPage.goto();
      await registerPage.register(userData.username, userData.email, userData.password);
      await registerPage.expectRegistrationSuccess();
    });

    test('should show error when passwords do not match', async ({ registerPage }) => {
      const timestamp = Date.now();
      const userData = {
        username: `newuser_${timestamp}`,
        email: `newuser_${timestamp}@example.com`,
        password: 'password123',
      };

      await registerPage.goto();
      await registerPage.register(userData.username, userData.email, userData.password, 'differentpassword');
      await registerPage.expectRegistrationError();
    });

    test('should navigate to login page', async ({ registerPage }) => {
      await registerPage.goto();
      await registerPage.goToLogin();
    });

    test('should show error when email already exists', async ({ registerPage }) => {
      await registerPage.goto();
      await registerPage.register('testuser', 'testuser1@example.com', 'password123');
      await registerPage.expectRegistrationError();
    });
  });

  test('should complete full registration and login flow', async ({ loginPage, registerPage }) => {
    const timestamp = Date.now();
    const userData = {
      username: `flowuser_${timestamp}`,
      email: `flowuser_${timestamp}@example.com`,
      password: 'password123',
    };

    // Register new user
    await registerPage.goto();
    await registerPage.register(userData.username, userData.email, userData.password);
    await registerPage.expectRegistrationSuccess();

    // Navigate to login
    await registerPage.goToLogin();

    // Login with new user
    await loginPage.login(userData.email, userData.password);
    await loginPage.expectLoginSuccess();
  });
});