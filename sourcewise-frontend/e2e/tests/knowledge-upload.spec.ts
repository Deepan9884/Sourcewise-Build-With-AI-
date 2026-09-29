import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000';

test.describe('knowledge upload tile', () => {
  test.beforeEach(async ({ page, request }) => {
    const email = `tile_${Date.now()}_${Math.floor(Math.random() * 1e6)}@e2e.test`;
    const reg = await request.post(`${API}/auth/register`, { data: { email, password: 'e2e-test-password-123', name: 'Tile Test' } });
    expect(reg.ok()).toBeTruthy();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('you@university.edu').fill(email);
    await page.getByPlaceholder('••••••••').fill('e2e-test-password-123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/plan/, { timeout: 30000 });
    await page.goto('/knowledge');
    await expect(page.getByTestId('knowledge-hub')).toBeVisible({ timeout: 15000 });
  });

  test('dropped file shows tile immediately without reload', async ({ page }) => {
    await page.locator('[data-testid="knowledge-hub"] input[type="file"]').setInputFiles({
      name: 'tile-repro.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('repro content for tile appearance'),
    });
    const tile = page.locator('[data-testid^="source-panel-"]');
    await expect(tile.first()).toBeVisible({ timeout: 10000 });
    await expect(tile.first()).toContainText('tile-repro.txt');
  });

  test('slow ingest keeps tile visible through remap', async ({ page }) => {
    await page.route('http://localhost:8000/ingest', (r) => new Promise((res) => {
      setTimeout(() => r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ source_id: 'x', source_name: 'tile-slow.txt', chunks_indexed: 3, status: 'ready' }),
      }).then(res), 3000);
    }));
    await page.route('http://localhost:4000/sources', (r) => {
      if (r.request().method() === 'POST') {
        return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 77777, name: 'tile-slow.txt', type: 'txt', size: 10, status: 'ready', chunks_indexed: 3 }) });
      }
      return r.continue();
    });
    await page.locator('[data-testid="knowledge-hub"] input[type="file"]').setInputFiles({
      name: 'tile-slow.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('slow content'),
    });
    const tile = page.locator('[data-testid^="source-panel-"]');
    await expect(tile.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="source-panel-77777"]')).toBeVisible({ timeout: 15000 });
    const opacity = await page.locator('[data-testid="source-panel-77777"]').evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);
  });
});
