import { test, expect } from '@playwright/test';

/**
 * NgopiGak Session Expiry Test
 * Verifies that the user is logged out after 30 minutes of inactivity.
 */
test.describe('Session Expiry Flow', () => {
  const username = `Tester_${Math.floor(Math.random() * 10000)}`;
  const pin = '1234';

  test.beforeEach(async ({ page }) => {
    // Initialize clock before navigation to control time
    await page.clock.install();
    await page.goto('/');
  });

  test('User should be logged out after 30 minutes of inactivity', async ({ page }) => {
    // 1. Login
    await page.getByPlaceholder('Masukkan nama kamu').fill(username);
    await page.getByPlaceholder('****').first().fill(pin);
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();

    // Verify logged in
    await expect(page.getByText(/Selamat Pagi|Halo/)).toBeVisible();

    // 2. Advance time by 31 minutes
    await page.clock.fastForward(31 * 60 * 1000);

    // 3. The logout should have been triggered
    // Note: Alert might stop navigation until dismissed. 
    // Playwright dismisses alerts by default, but we can specifically handle it.
    
    // We expect to be back on the login screen
    await expect(page.getByPlaceholder('Masukkan nama kamu')).toBeVisible({ timeout: 15000 });
    
    // Check if localStorage is cleared
    const storedUser = await page.evaluate(() => localStorage.getItem('ngopi_current_v2'));
    expect(storedUser).toBeNull();
  });

  test('User activity should reset the 30-minute timer', async ({ page }) => {
    // 1. Login
    await page.getByPlaceholder('Masukkan nama kamu').fill(username);
    await page.getByPlaceholder('****').first().fill(pin);
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
    await expect(page.getByText(/Selamat Pagi|Halo/)).toBeVisible();

    // 2. Wait 20 minutes (T+20)
    await page.clock.fastForward(20 * 60 * 1000);
    
    // 3. Perform activity (mousemove) to reset timer to T+20 + 30 = T+50
    await page.mouse.move(10, 10);
    await page.mouse.move(20, 20);
    
    // 4. Wait another 20 minutes (Current: T+40). Should still be logged in.
    await page.clock.fastForward(20 * 60 * 1000);
    await expect(page.getByText(/Selamat Pagi|Halo/)).toBeVisible();
    
    // 5. Wait another 15 minutes (Current: T+55). Should be logged out (expired at T+50).
    await page.clock.fastForward(15 * 60 * 1000);
    
    // 6. Verify logout
    await expect(page.getByPlaceholder('Masukkan nama kamu')).toBeVisible({ timeout: 20000 });
  });
});
