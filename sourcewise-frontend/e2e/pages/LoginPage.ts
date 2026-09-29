import { type Page, type Locator, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Labels are unassociated siblings in LoginPage; placeholders are stable.
    this.emailInput = page.getByPlaceholder('you@university.edu');
    this.passwordInput = page.getByPlaceholder('••••••••');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async loginAsTestUser() {
    expect(EMAIL, 'E2E_EMAIL env is required').toBeTruthy();
    expect(PASSWORD, 'E2E_PASSWORD env is required').toBeTruthy();
    await this.emailInput.fill(EMAIL);
    await this.passwordInput.fill(PASSWORD);
    await this.submitButton.click();
    // Wait for the post-login landing so callers never race the auth guard.
    await this.page.waitForURL(/\/plan/, { timeout: 30000 });
  }
}
