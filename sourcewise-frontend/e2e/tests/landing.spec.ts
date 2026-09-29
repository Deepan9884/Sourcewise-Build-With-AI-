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

  // 4. Journey gap: sticky packs header+orbit centered with gap-4
  test('journey gap: sticky justify-center gap-4', async ({ page }) => {
    const sticky = page.locator('#nine-tails-grid .sticky').first();
    const cls = await sticky.getAttribute('class');
    expect(cls).toContain('justify-center');
    expect(cls).toContain('gap-4');
  });

  // 5. Journey header and orbit stage: tight, no overlap
  test('journey header-orbit gap tight no overlap', async ({ page }) => {
    await page.locator('nav').first().getByText('Journey').click();
    await page.waitForTimeout(1500);
    const heading = page.getByText('How SourceWise Transforms Your Studies');
    const hBox = await heading.boundingBox();
    const stage = page.locator('#nine-tails-grid .sticky > div').nth(2);
    const sBox = await stage.boundingBox();
    expect(hBox && sBox ? sBox.y - (hBox.y + hBox.height) : -1).toBeGreaterThanOrEqual(0);
    expect(hBox && sBox ? sBox.y - (hBox.y + hBox.height) : 9999).toBeLessThanOrEqual(80);
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
