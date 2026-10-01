import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000';

test.describe('Study Chat in Knowledge Hub', () => {
  test('opens chat drawer, sends message, and receives streaming assistant response without error', async ({ page, request }) => {
    // 1. Create a temporary user and authenticate
    const email = `chat_${Date.now()}_${Math.floor(Math.random() * 1e6)}@e2e.test`;
    const reg = await request.post(`${API}/auth/register`, {
      data: { email, password: 'e2e-test-password-123', name: 'Chat Tester' },
    });
    expect(reg.ok()).toBeTruthy();

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByPlaceholder('you@university.edu').fill(email);
    await page.getByPlaceholder('••••••••').fill('e2e-test-password-123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/plan/, { timeout: 30000 });

    // 2. Navigate to Knowledge Hub
    await page.goto('/knowledge');
    await expect(page.getByTestId('knowledge-hub')).toBeVisible({ timeout: 15000 });

    // 3. Open Study Chat panel
    const chatBtn = page.getByTestId('knowledge-hub').getByRole('button', { name: /Chat/i });
    await expect(chatBtn).toBeVisible();
    await chatBtn.click();

    // 4. Verify Study Chat drawer is open
    await expect(page.getByText('Study chat')).toBeVisible({ timeout: 10000 });

    // 5. Ask question "hola"
    const input = page.getByLabel('Chat message');
    await expect(input).toBeVisible();
    await input.fill('hola');
    await input.press('Enter');

    // 6. Verify user message appears in chat
    await expect(page.locator('div').filter({ hasText: /^hola$/ }).last()).toBeVisible({ timeout: 5000 });

    // 7. Verify assistant response streams and finishes without any "Failed to fetch" error
    await expect(page.getByText(/¡Hola!|Welcome|SourceWise/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Failed to fetch')).not.toBeVisible();
  });
});
