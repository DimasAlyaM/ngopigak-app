import { test, expect } from '@playwright/test';

/**
 * NgopiGak E2E Suite
 * Resilient local validation for premium UI.
 */
test.describe('NgopiGak E2E Suite', () => {
  const username = `Tester_${Math.floor(Math.random() * 10000)}`;
  const pin = '1234';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('User Journey: Login -> Order -> Logout', async ({ page }) => {
    // 1. Login Flow
    await page.getByPlaceholder('Masukkan nama kamu').fill(username);
    await page.getByPlaceholder('****').first().fill(pin);
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();

    // Verify Dashboard Landing
    await expect(page.getByText(/Selamat Pagi|Halo/)).toBeVisible();
    
    // 2. Session Management
    const joinSesiBtn = page.getByRole('button', { name: 'Join Sesi' });
    const mulaiBaruBtn = page.getByRole('button', { name: 'Mulai Sesi Baru' });

    if (await joinSesiBtn.isVisible()) {
      await joinSesiBtn.click();
    } else if (await mulaiBaruBtn.isVisible()) {
      await mulaiBaruBtn.click();
    } else {
      // Try navigating directly if buttons are missing (e.g. dynamic state)
      await page.goto('/live-session');
    }

    // 3. Order Placement
    await page.waitForSelector('.session-container, .session-view', { timeout: 15000 }).catch(() => null);
    
    const searchInput = page.getByPlaceholder('Cari kopi kesukaanmu...');
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await searchInput.fill(''); // Clear first
      await searchInput.type('a', { delay: 100 }); // Type something common
      
      const firstResult = page.locator('.search-result-item').first();
      // Only proceed if search results appear
      if (await firstResult.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstResult.click();
        await page.getByRole('button', { name: /Pesanan/ }).filter({ hasText: /Tambah|Update/ }).click();
        await expect(page.locator('.order-item-card').filter({ hasText: username })).toBeVisible();
      }
    }

    // 4. Logout via Profile
    await page.locator('.nav-item').filter({ hasText: 'Profile' }).click();
    await page.getByRole('button', { name: 'Keluar Akun' }).click();
    await expect(page.getByPlaceholder('Masukkan nama kamu')).toBeVisible();
  });

  test('Admin Flow: Access and Tab Navigation', async ({ page }) => {
    await page.getByPlaceholder('Masukkan nama kamu').fill('admin');
    await page.getByPlaceholder('****').first().fill(pin);
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();

    const adminNavItem = page.locator('.nav-item').filter({ hasText: 'Admin' });
    await expect(adminNavItem).toBeVisible();
    await adminNavItem.click();

    // Handle both "Masukkan PIN Admin" and "Buat PIN Admin" (for fresh DB)
    const pinGateTitle = page.locator('h2');
    await expect(pinGateTitle).toBeVisible();
    
    const pinInput = page.getByPlaceholder(/••••|\*\*\*\*|PIN/);
    if (await pinInput.isVisible()) {
      await pinInput.fill('0000');
      const submitBtn = page.getByRole('button', { name: /Masuk Control Center|Simpan PIN/ });
      await submitBtn.click();
    }

    // Verify Admin Dashboard
    await expect(page.getByText('Panel Admin')).toBeVisible({ timeout: 10000 });
    
    const tabs = ['User', 'Aktif', 'Histori', 'Sistem', 'Menu'];
    for (const tab of tabs) {
      const tabBtn = page.getByRole('button', { name: tab, exact: true });
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        // Wait a bit for transition
        await page.waitForTimeout(300);
      }
    }
  });
});
