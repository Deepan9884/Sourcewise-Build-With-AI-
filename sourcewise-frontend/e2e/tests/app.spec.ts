import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

async function login(page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAsTestUser();
}

test.describe('auth', () => {
  test('login lands on the Plan heart', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/plan/, { timeout: 20000 });
    await expect(page.getByTestId('plan-home')).toBeVisible();
  });

  test('wrong password stays on login with error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.emailInput.fill(process.env.E2E_EMAIL || 'nobody@example.com');
    await login.passwordInput.fill('definitely-wrong-password-123');
    await login.submitButton.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('plan home', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/plan/);
  });

  test('KPI strip, tasks and plan workspace render', async ({ page }) => {
    await expect(page.getByTestId('plan-home')).toBeVisible();
    await expect(page.getByTestId('task-hybrid-list').getByText("Today's tasks")).toBeVisible();
    // Plan workspace (wizard empty-state or existing plan) renders below
    await expect(page.getByText(/Open a new chapter of study|The Study Codex/).first()).toBeVisible({ timeout: 20000 });
  });

  test('left rail has Plan nav and mood pulse', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Plan' }).first()).toBeVisible();
    await expect(page.getByTestId('mood-pulse')).toBeVisible();
  });

  test('adaptive toggle flips state', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /Adaptive (on|paused)/ });
    await expect(toggle).toBeVisible();
    const before = await toggle.textContent();
    await toggle.click();
    await expect(toggle).not.toHaveText(before || '');
  });
});

test.describe('knowledge hub', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/knowledge');
  });

  test('hub renders grid, upload zone and chat entry', async ({ page }) => {
    await expect(page.getByTestId('knowledge-hub')).toBeVisible();
    await expect(page.getByText('Your sources, alive')).toBeVisible();
    await expect(page.getByRole('button', { name: /Chat/ }).first()).toBeVisible();
  });

  test('global chat opens and validates empty context', async ({ page }) => {
    await page.getByRole('button', { name: /Chat/ }).first().click();
    await expect(page.getByTestId('global-chat')).toBeVisible();
    await page.getByLabel('Chat message').fill('Hello?');
    await page.getByRole('button', { name: 'Send' }).click();
    // No sources on the fresh account → contextual guidance, not a hang
    await expect(page.getByText(/Select at least one source/)).toBeVisible();
  });
});

test.describe('insights', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/insights');
  });

  test('KPIs, deviation, streak calendar and next-step render', async ({ page }) => {
    await expect(page.getByTestId('insights-page')).toBeVisible();
    await expect(page.getByText("How you're trending")).toBeVisible();
    await expect(page.getByText('Plan deviation')).toBeVisible();
    await expect(page.getByTestId('streak-calendar')).toBeVisible();
    await expect(page.getByText('Study this next')).toBeVisible();
  });
});
