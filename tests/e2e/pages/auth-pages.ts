import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // Selectors
  get emailInput() { return this.page.locator('[data-testid="email-input"]'); }
  get passwordInput() { return this.page.locator('[data-testid="password-input"]'); }
  get loginButton() { return this.page.locator('[data-testid="login-button"]'); }
  get registerLink() { return this.page.locator('[data-testid="register-link"]'); }
  get errorMessage() { return this.page.locator('[data-testid="error-message"]'); }

  // Actions
  async goto() {
    await this.page.goto('/login');
    await expect(this.page).toHaveTitle(/Login/);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL(/\/chat/);
  }

  async expectLoginError() {
    await expect(this.errorMessage).toBeVisible();
  }

  async goToRegister() {
    await this.registerLink.click();
    await expect(this.page).toHaveURL(/\/register/);
  }
}

export class RegisterPage {
  constructor(private page: Page) {}

  // Selectors
  get usernameInput() { return this.page.locator('[data-testid="username-input"]'); }
  get emailInput() { return this.page.locator('[data-testid="email-input"]'); }
  get passwordInput() { return this.page.locator('[data-testid="password-input"]'); }
  get confirmPasswordInput() { return this.page.locator('[data-testid="confirm-password-input"]'); }
  get registerButton() { return this.page.locator('[data-testid="register-button"]'); }
  get loginLink() { return this.page.locator('[data-testid="login-link"]'); }
  get errorMessage() { return this.page.locator('[data-testid="error-message"]'); }
  get successMessage() { return this.page.locator('[data-testid="success-message"]'); }

  // Actions
  async goto() {
    await this.page.goto('/register');
    await expect(this.page).toHaveTitle(/Register/);
  }

  async register(username: string, email: string, password: string, confirmPassword: string = password) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.registerButton.click();
  }

  async expectRegistrationSuccess() {
    await expect(this.successMessage).toBeVisible();
  }

  async expectRegistrationError() {
    await expect(this.errorMessage).toBeVisible();
  }

  async goToLogin() {
    await this.loginLink.click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}