import { test, expect } from '@playwright/test';

test.describe('NgopiGak Basic Flow', () => {
  const username = `Tester_${Math.floor(Math.random() * 10000)}`;
  const pin = '1234';

  test('should login and start a session', async ({ page }) => {
    // 1. Navigate to home
    await page.goto('/');

    // 2. Login
    await page.getByPlaceholder('Masukkan nama kamu').fill(username);
    await page.getByPlaceholder('****').fill(pin);
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();

    // 3. Verify Dashboard
    await expect(page.getByText('Home').first()).toBeVisible();
    await expect(page.getByText(username).first()).toBeVisible();

    // 4. Start or Join a session
    await page.waitForTimeout(1000); // Wait for potential state sync
    const mulaiBaruBtn = page.getByRole('button', { name: 'Mulai Baru' });
    const joinSesiBtn = page.getByRole('button', { name: 'Join Sesi' });

    if (await mulaiBaruBtn.isVisible()) {
      await mulaiBaruBtn.click();
      // After starting, we should see the session view
      await expect(page.getByText('Tambah Pesanan').or(page.getByText('Tutup Sesi Sekarang'))).toBeVisible();
    } else {
      await joinSesiBtn.click();
      await expect(page.getByText('Tambah Pesanan')).toBeVisible();
    }

    // 5. Add an order
    await page.getByRole('button', { name: 'Tambah Pesanan' }).click();
    await page.getByPlaceholder('Cari kopi...').fill(''); // Show all
    const firstItem = page.locator('.search-item').first();
    await expect(firstItem).toBeVisible();
    const itemNameRaw = await firstItem.locator('span').first().textContent();
    // itemNameRaw might have emoji like "☕ Americano", we need just the name part or just match the visible text
    await firstItem.click();
    
    // Click the submit button to add order
    await page.getByRole('button', { name: 'Tambah Pesanan' }).click();

    // 6. Verify order in list (it should show up in the order list)
    // We search for the item name without emoji if possible, or just the raw text
    const cleanItemName = itemNameRaw.split(' ').slice(1).join(' '); // Basic emoji removal
    await expect(page.getByText(cleanItemName).first()).toBeVisible();

    // 7. Logout
    // Navigation is hidden in session view, go back to home first if needed
    if (await page.getByRole('button', { name: 'Kembali ke Home' }).isVisible()) {
       await page.getByRole('button', { name: 'Kembali ke Home' }).click();
    } else if (await page.getByRole('button', { name: 'Tutup Sesi Sekarang' }).isVisible()) {
       // If we can't go back, we might be the admin/payer. For simplicity in test, 
       // let's just try to find the Profile button in home.
       await page.goto('/'); 
    }
    
    await page.locator('.nav-item:has-text("Profile")').click();
    await page.getByRole('button', { name: 'Keluar Akun' }).click();

    // 8. Verify back to login
    await expect(page.getByPlaceholder('Masukkan nama kamu')).toBeVisible();
  });
});
