import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('header', { timeout: 15000 });
  });

  // 1. Hero / Brand
  test('hero renders with SourceWise brand and CTAs', async ({ page }) => {
    await expect(page.getByText('SourceWise').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started Free' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  // 2. Nav 4 sections
  test('nav has Powers Journey Demo Codex', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav.getByText('Powers')).toBeVisible();
    await expect(nav.getByText('Journey')).toBeVisible();
    await expect(nav.getByText('Demo')).toBeVisible();
    await expect(nav.getByText('Codex')).toBeVisible();
  });

  // 3. Journey section heading visible after scroll
  test('journey section heading visible', async ({ page }) => {
    await page.locator('nav').first().getByText('Journey').click();
    await page.waitForTimeout(1200);
    await expect(page.getByText('How SourceWise Transforms Your Studies')).toBeVisible({ timeout: 10000 });
  });

  // 4. Journey gap: pt-12 class applied (not pt-28)
  test('journey gap: sticky has pt-12 not pt-28', async ({ page }) => {
    const sticky = page.locator('#nine-tails-grid .sticky').first();
    const cls = await sticky.getAttribute('class');
    expect(cls).toContain('pt-12');
    expect(cls).not.toContain('pt-28');
  });

  // 5. Journey orbit stage has mt-3 not mt-8
  test('journey orbit stage: mt-3 not mt-8', async ({ page }) => {
    // Orbit stage is the large w-[min(98vw,920px)] div inside sticky
    const orbitStage = page.locator('#nine-tails-grid .sticky').locator('[class*="w-\\[min\\(98vw"]').first();
    const cls = await orbitStage.getAttribute('class');
    expect(cls).toContain('mt-3');
    expect(cls).not.toContain('mt-8');
  });

  // 6. Journey section badge visible
  test('student transformation badge visible', async ({ page }) => {
    await page.locator('nav').first().getByText('Journey').click();
    await page.waitForTimeout(1200);
    await expect(page.getByText('The Student Transformation', { exact: false })).toBeVisible({ timeout: 10000 });
  });

  // 7. Login navigates to /login
  test('Log in navigates to /login', async ({ page }) => {
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  // 8. Get Started navigates to /signup
  test('Get Started Free navigates to /signup', async ({ page }) => {
    await page.getByRole('link', { name: 'Get Started Free' }).click();
    await expect(page).toHaveURL(/\/signup/, { timeout: 10000 });
  });
});
