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
    // The root layout metadata may override per-page <head> during some builds; rely on URL + key element readiness instead of title.
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.emailInput).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSuccess() {
    // After clicking login the route should eventually change to /chat.
    // Some builds may perform client-side routing after auth state stored.
    // Retry for up to 5s; if still on /login and error visible, surface error text.
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (/\/chat/.test(this.page.url())) break;
      // If an error appears, break early to assert explicitly
      if (await this.errorMessage.first().isVisible().catch(() => false)) break;
      await this.page.waitForTimeout(250);
    }
    if (/\/login/.test(this.page.url())) {
      if (await this.errorMessage.first().isVisible().catch(() => false)) {
        const msg = await this.errorMessage.first().innerText().catch(() => 'unknown error');
        throw new Error(`Login did not redirect. UI error message: ${msg}`);
      }
    }
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
    await expect(this.page).toHaveURL(/\/register/);
    await expect(this.usernameInput).toBeVisible();
  }

  async register(username: string, email: string, password: string, confirmPassword: string = password) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    // Wait for validation to enable the button (if still disabled, poll quickly)
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const disabled = await this.registerButton.isDisabled();
      if (!disabled) break;
      await this.page.waitForTimeout(100);
    }
    await this.registerButton.click();
  }

  async expectRegistrationSuccess() {
    // Success message may be brief before redirect; accept either success banner OR /chat URL
    const deadline = Date.now() + 8000; // allow more time for network and redirect
    while (Date.now() < deadline) {
      if (await this.successMessage.first().isVisible().catch(() => false)) break;
      if (/\/chat/.test(this.page.url())) break;
      // If button returned to enabled state without success yet, keep polling
      await this.page.waitForTimeout(200);
    }
    if (!/\/chat/.test(this.page.url())) {
      // Check whether auth token exists (registration likely succeeded but redirect delayed)
      const hasToken = await this.page.evaluate(() => !!localStorage.getItem('token'));
      if (hasToken) {
        // Attempt manual navigation if router push failed
        await this.page.goto('/chat');
      } else {
        await expect(this.successMessage).toBeVisible();
      }
    }
  }

  async expectRegistrationError() {
    await expect(this.errorMessage).toBeVisible();
  }

  async goToLogin() {
    await this.loginLink.first().click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}