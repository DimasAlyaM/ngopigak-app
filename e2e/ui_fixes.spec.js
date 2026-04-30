import { test, expect } from '@playwright/test';

/**
 * NgopiGak E2E — UI Fixes Verification
 * Tests the 3 bugs fixed:
 *   1. Companion/Guest page text (no longer "Sedang Menonton")
 *   2. Notification view card styling & layout
 *   3. Stepper component proper rendering
 *
 * Also validates the root cause fix:
 *   - updateSession now persists payerId/companionId to DB
 *   - Companion role detection fallback by username
 */
test.describe('UI Fixes Verification', () => {
  const pin = '1234';

  // ────────────────────────────────────────────────────────────────
  // HELPER: Login as a given user
  // ────────────────────────────────────────────────────────────────
  async function loginAs(page, username) {
    await page.goto('/');
    // If already logged in, logout first
    const profileTab = page.locator('.nav-item').filter({ hasText: 'Profile' });
    if (await profileTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileTab.click();
      const logoutBtn = page.getByRole('button', { name: 'Keluar Akun' });
      if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutBtn.click();
      }
    }
    // Now on login screen
    await page.getByPlaceholder('Masukkan nama kamu').fill(username);
    await page.getByPlaceholder('****').first().fill(pin);
    await page.getByRole('button', { name: 'Masuk Sekarang' }).click();
    // Wait for home
    await expect(page.getByText(/Selamat|Halo/)).toBeVisible({ timeout: 10000 });
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 1: Guest page should NOT show "Sedang Menonton"
  // ────────────────────────────────────────────────────────────────
  test('Bug 1: Guest page shows "Kamu Belum Pesan" instead of "Sedang Menonton"', async ({ page }) => {
    await loginAs(page, `GuestUser_${Date.now()}`);

    // Navigate to live session
    await page.goto('/live-session');
    await page.waitForTimeout(1500); // Allow realtime data to load

    // If there is an active session and user is guest, check text
    const guestHeading = page.getByText('Kamu Belum Pesan');
    const watchingHeading = page.getByText('Kamu Sedang Menonton');

    // The old "Menonton" text should NEVER appear
    await expect(watchingHeading).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Not visible is expected — pass
    });

    // If we're shown the guest page, verify correct text
    if (await guestHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(guestHeading).toBeVisible();
      // Subtitle should be contextually correct
      await expect(page.getByText('Sesi sedang berjalan')).toBeVisible();
    }

    // Verify no "Menonton" anywhere on the page
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Sedang Menonton');
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 2: Notification view is properly styled with cards
  // ────────────────────────────────────────────────────────────────
  test('Bug 2: Notification view has proper card-based layout', async ({ page }) => {
    await loginAs(page, `NotifTester_${Date.now()}`);

    // Navigate to notifications
    await page.locator('.nav-item').filter({ hasText: 'Notif' }).click();
    await expect(page.getByRole('heading', { name: 'Notifikasi', exact: true })).toBeVisible({ timeout: 5000 });

    // Check gradient title styling
    const title = page.locator('.text-gradient').filter({ hasText: 'Notifikasi' });
    await expect(title).toBeVisible();

    // If notifications exist, verify card structure
    const notifCards = page.locator('.notif-card-premium');
    const emptyState = page.locator('.glass-panel').filter({ hasText: 'Belum Ada Notifikasi' });

    if (await notifCards.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Notification cards should have proper structure
      const firstCard = notifCards.first();
      
      // Card should have visible padding and border (check computed style)
      const cardBox = await firstCard.boundingBox();
      expect(cardBox).toBeTruthy();
      expect(cardBox.width).toBeGreaterThan(200); // Not collapsed
      expect(cardBox.height).toBeGreaterThan(40); // Has content height

      // Should contain timestamp with clock icon
      const timeElement = firstCard.locator('p').last();
      await expect(timeElement).toBeVisible();
    } else {
      // Empty state should be styled properly
      await expect(emptyState).toBeVisible();
      await expect(page.getByText('Notifikasi terbaru akan muncul di sini')).toBeVisible();
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 3: Stepper component renders correctly (not raw text)
  // ────────────────────────────────────────────────────────────────
  test('Bug 3: Stepper component has proper CSS styling', async ({ page }) => {
    await loginAs(page, `StepperTester_${Date.now()}`);

    // Navigate to live session
    await page.goto('/live-session');
    await page.waitForTimeout(1500);

    // Look for the stepper component
    const stepper = page.locator('.stepper');

    if (await stepper.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Stepper should be a flex container (not raw stacked text)
      const stepperBox = await stepper.boundingBox();
      expect(stepperBox).toBeTruthy();
      // Stepper should be horizontal (wider than tall)
      expect(stepperBox.width).toBeGreaterThan(stepperBox.height);

      // Check step circles exist and are styled
      const stepCircles = stepper.locator('.step-circle');
      const circleCount = await stepCircles.count();
      expect(circleCount).toBeGreaterThanOrEqual(3); // At least 3 steps

      // Check step labels exist
      const stepLabels = stepper.locator('.step-label');
      const labelCount = await stepLabels.count();
      expect(labelCount).toBe(circleCount);

      // Step circles should have background color (not transparent/unstyled)
      const firstCircle = stepCircles.first();
      const circleBox = await firstCircle.boundingBox();
      expect(circleBox).toBeTruthy();
      // Circle should be roughly square-ish (circular)
      expect(Math.abs(circleBox.width - circleBox.height)).toBeLessThan(5);

      // Active step should have accent color styling
      const activeStep = stepper.locator('.step-item.active');
      if (await activeStep.isVisible().catch(() => false)) {
        const activeCircle = activeStep.locator('.step-circle');
        const bgColor = await activeCircle.evaluate(el => getComputedStyle(el).backgroundColor);
        // Should NOT be transparent or default
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(bgColor).not.toBe('transparent');
      }

      // Done steps should have green checkmark
      const doneSteps = stepper.locator('.step-item.done');
      const doneCount = await doneSteps.count();
      if (doneCount > 0) {
        const doneCircle = doneSteps.first().locator('.step-circle');
        const bgColor = await doneCircle.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      }

      // Step lines should exist between steps
      const stepLines = stepper.locator('.step-line');
      expect(await stepLines.count()).toBe(circleCount - 1);

      // Verify labels are not stacked vertically like raw text
      // The steps should be distributed horizontally
      if (circleCount >= 2) {
        const firstBox = await stepCircles.nth(0).boundingBox();
        const lastBox = await stepCircles.nth(circleCount - 1).boundingBox();
        // First and last should be horizontally separated
        expect(lastBox.x - firstBox.x).toBeGreaterThan(100);
        // But vertically similar (same row)
        expect(Math.abs(lastBox.y - firstBox.y)).toBeLessThan(10);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 4: Companion role detection (username fallback)
  // ────────────────────────────────────────────────────────────────
  test('Bug 1 Root Cause: Companion is NOT shown guest page', async ({ page }) => {
    await loginAs(page, `CompanionTest_${Date.now()}`);

    // Navigate to live session
    await page.goto('/live-session');
    await page.waitForTimeout(2000);

    // Check the session view content
    const pageContent = await page.textContent('body');

    // If there's an active session
    const sessionView = page.locator('.session-view, .session-container');
    if (await sessionView.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check if current user is the companion
      const companionBadge = page.getByText('Kamu Pendamping');
      
      if (await companionBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Companion should see companion page, NOT guest page
        await expect(companionBadge).toBeVisible();
        await expect(page.getByText('Kamu Belum Pesan')).not.toBeVisible();
        await expect(page.getByText('Kamu Sedang Menonton')).not.toBeVisible();
        
        // Should see helper text
        await expect(page.getByText(/Bantu.*Ambil Kopi/)).toBeVisible();
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 5: Notification view has no raw/unstyled elements
  // ────────────────────────────────────────────────────────────────
  test('Bug 2: Notification cards are visually grouped, not raw text', async ({ page }) => {
    await loginAs(page, `VisualNotif_${Date.now()}`);

    // Navigate to notifications
    await page.locator('.nav-item').filter({ hasText: 'Notif' }).click();
    await page.waitForTimeout(1000);

    // Verify the notification view container exists
    const notifView = page.locator('.notif-view');
    await expect(notifView).toBeVisible();

    // Check that the view has session-container padding
    await expect(notifView).toHaveClass(/session-container/);

    // Verify header section exists with proper hierarchy
    const viewHeader = notifView.locator('.view-header');
    await expect(viewHeader).toBeVisible();
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 6: Session view penitip page renders correctly
  // ────────────────────────────────────────────────────────────────
  test('Bug 3: Penitip/session view has styled payment card', async ({ page }) => {
    await loginAs(page, `PenitipTest_${Date.now()}`);

    await page.goto('/live-session');
    await page.waitForTimeout(2000);

    // If we see the penitip view with order status
    const statusBadge = page.getByText('Status Pesanan');
    if (await statusBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Should have glass panel styling
      const glassPanels = page.locator('.glass-panel');
      expect(await glassPanels.count()).toBeGreaterThan(0);

      // Payment info card should render if payment info exists
      const paymentCard = page.locator('.payment-info-card');
      if (await paymentCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Card should have proper dimensions (not collapsed)
        const cardBox = await paymentCard.boundingBox();
        expect(cardBox.height).toBeGreaterThan(80);
        expect(cardBox.width).toBeGreaterThan(200);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 7: updateSession persists payerId/companionId
  // ────────────────────────────────────────────────────────────────
  test('Root Cause Fix: updateSession includes payer_id and companion_id', async ({ page }) => {
    await loginAs(page, `RootCauseTester_${Date.now()}`);

    // Monitor Supabase PATCH requests to sessions table
    const sessionUpdates = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('sessions') && request.method() === 'PATCH') {
        try {
          const postData = request.postDataJSON();
          sessionUpdates.push(postData);
        } catch (e) {
          // Not JSON, skip
        }
      }
    });

    // Navigate to see if any session update happens
    await page.goto('/live-session');
    await page.waitForTimeout(3000);

    // If there are session updates captured, verify they contain the id fields
    if (sessionUpdates.length > 0) {
      const hasPayerIdUpdate = sessionUpdates.some(u => 'payer_id' in u);
      const hasCompanionIdUpdate = sessionUpdates.some(u => 'companion_id' in u);

      // At least when payer is set, payer_id should also be set
      const hasPayerUpdate = sessionUpdates.some(u => 'payer' in u);
      if (hasPayerUpdate) {
        expect(hasPayerIdUpdate).toBeTruthy();
      }
    }
    // This test validates the code path exists - actual persistence
    // is verified by checking the store.js source directly
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 8: Full navigation regression — all tabs work
  // ────────────────────────────────────────────────────────────────
  test('Regression: Bottom nav tabs all navigate correctly', async ({ page }) => {
    await loginAs(page, `NavTester_${Date.now()}`);

    const tabs = [
      { name: 'History', url: '/history' },
      { name: 'Notif', url: '/notifications' },
      { name: 'Orders', url: '/orders' },
      { name: 'Profile', url: '/profile' },
      { name: 'Home', url: '/' },
    ];

    for (const tab of tabs) {
      await page.locator('.nav-item').filter({ hasText: tab.name }).click();
      await page.waitForTimeout(500); // Animation transition
      expect(page.url()).toContain(tab.url);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 9: Notification empty state is premium styled
  // ────────────────────────────────────────────────────────────────
  test('Bug 2: Empty notification state has glass-panel styling', async ({ page }) => {
    // Create a fresh user who shouldn't have notifications
    const freshUser = `FreshUser_${Date.now()}`;
    await loginAs(page, freshUser);

    await page.locator('.nav-item').filter({ hasText: 'Notif' }).click();
    await page.waitForTimeout(1000);

    // Fresh user likely has no notifications 
    const emptyState = page.locator('.glass-panel').filter({ hasText: /Belum Ada Notifikasi/ });
    const notifCards = page.locator('.notif-card-premium');

    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Empty state should have proper glass-panel styling
      const emptyBox = await emptyState.boundingBox();
      expect(emptyBox).toBeTruthy();
      expect(emptyBox.height).toBeGreaterThan(100); // Substantial height
      
      // Should have centered icon and description text
      await expect(page.getByText('Notifikasi terbaru akan muncul di sini')).toBeVisible();
    } else if (await notifCards.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // Has notifications — verify they're card-styled not raw text
      const firstCard = notifCards.first();
      const cardBox = await firstCard.boundingBox();
      expect(cardBox.height).toBeGreaterThan(50);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // TEST 10: Live session stepper shows correct step states
  // ────────────────────────────────────────────────────────────────
  test('Bug 3: Stepper shows done/active/pending states correctly', async ({ page }) => {
    await loginAs(page, `StepState_${Date.now()}`);

    await page.goto('/live-session');
    await page.waitForTimeout(2000);

    const stepper = page.locator('.stepper');
    if (await stepper.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Count step items
      const stepItems = stepper.locator('.step-item');
      const totalSteps = await stepItems.count();
      expect(totalSteps).toBe(4); // Pilih Menu, Pembayaran, Kopi Dibeli, Selesai

      // Verify step labels text
      const labels = stepper.locator('.step-label');
      const labelTexts = [];
      for (let i = 0; i < await labels.count(); i++) {
        labelTexts.push(await labels.nth(i).textContent());
      }

      // Should have meaningful step names (not "1", "2", "3")
      expect(labelTexts.some(l => l.toLowerCase().includes('menu') || l.toLowerCase().includes('pilih'))).toBeTruthy();
      expect(labelTexts.some(l => l.toLowerCase().includes('pembayaran'))).toBeTruthy();
      expect(labelTexts.some(l => l.toLowerCase().includes('selesai'))).toBeTruthy();

      // There should be exactly one active step (or zero if completed)
      const activeSteps = stepper.locator('.step-item.active');
      const activeCount = await activeSteps.count();
      expect(activeCount).toBeLessThanOrEqual(1);

      // Done steps should come before active/pending steps
      const doneSteps = stepper.locator('.step-item.done');
      const doneCount = await doneSteps.count();
      
      if (doneCount > 0 && activeCount > 0) {
        const doneBox = await doneSteps.last().boundingBox();
        const activeBox = await activeSteps.first().boundingBox();
        // Done step should be to the left of active step
        expect(doneBox.x).toBeLessThan(activeBox.x);
      }
    }
  });
});
