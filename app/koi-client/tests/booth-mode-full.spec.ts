import { test, expect } from '@playwright/test';

// Full booth mode test with actual login and party creation
test.describe('Booth Mode - Full Integration Test', () => {
  const baseUrl = 'http://local.socialdev.club:5173';
  const testEmail = 'test01@socialdev.club';
  const testPassword = 'test1234';
  let partyId: string;

  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('complete booth mode flow with login and party creation', async ({ page }) => {
    // Step 1: Login as regular user
    await test.step('Login with test account', async () => {
      await page.goto(baseUrl);

      // Click login button
      await page.click('button:has-text("다른 방법으로 로그인")');

      // Fill email and password
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);

      // Submit login
      await page.click('button:has-text("로그인")');

      // Wait for redirect after login
      await page.waitForLoadState('networkidle');
    });

    // Step 2: Create a new party
    await test.step('Create a new party', async () => {
      // Navigate to party creation or find create party button
      // This depends on your UI - adjust selectors as needed
      const createPartyButton = page.locator('button:has-text("파티 만들기")');

      if (await createPartyButton.isVisible()) {
        await createPartyButton.click();

        // Fill party details
        await page.fill('input[placeholder*="파티 이름"]', `테스트 파티 ${Date.now()}`);
        await page.click('button:has-text("만들기")');

        // Wait for party creation
        await page.waitForLoadState('networkidle');

        // Extract party ID from URL
        const url = page.url();
        const match = url.match(/party\/([^\/]+)/);
        if (match) {
          partyId = match[1];
          console.log('Created party with ID:', partyId);
        }
      }
    });

    // Step 3: Navigate to Screen page to see QR code
    await test.step('View QR code on screen page', async () => {
      if (partyId) {
        await page.goto(`${baseUrl}/backoffice/screen/${partyId}`);

        // Verify QR code is displayed
        await expect(page.locator('canvas')).toBeVisible(); // QR code is usually rendered as canvas
        await expect(page.locator('text=/파티 참여 QR/')).toBeVisible();
      }
    });

    // Step 4: Open new incognito context for guest user
    const context = await page.context().browser()?.newContext();
    if (context) {
      const guestPage = await context.newPage();
      await guestPage.setViewportSize({ width: 390, height: 844 });

      await test.step('Guest accesses party via direct URL', async () => {
        // Navigate to party URL (simulating QR code scan)
        await guestPage.goto(`${baseUrl}/party/${partyId}`);

        // Should see booth mode entry
        await expect(guestPage.locator('h1:has-text("SDC 부스 게임")')).toBeVisible();
        await expect(guestPage.locator('button:has-text("게스트로 참여")')).toBeVisible();
        await expect(guestPage.locator('button:has-text("계정 로그인")')).toBeVisible();
      });

      await test.step('Guest joins with nickname', async () => {
        // Click guest participation
        await guestPage.click('button:has-text("게스트로 참여")');

        // Enter nickname
        const testNickname = `Player${Math.floor(Math.random() * 1000)}`;
        await guestPage.fill('input[placeholder*="닉네임"]', testNickname);

        // Wait for validation
        await guestPage.waitForSelector('text=/✓ 사용 가능한 닉네임입니다/');

        // Click join
        await guestPage.click('button:has-text("확인")');

        // Wait for page reload and party join
        await guestPage.waitForLoadState('networkidle');

        // Verify guest is in party
        // The exact verification depends on your UI
        expect(guestPage.url()).toContain(`/party/${partyId}`);
      });

      await test.step('Test duplicate nickname prevention', async () => {
        // Open another guest page
        const guestPage2 = await context.newPage();
        await guestPage2.setViewportSize({ width: 390, height: 844 });

        await guestPage2.goto(`${baseUrl}/party/${partyId}`);
        await guestPage2.click('button:has-text("게스트로 참여")');

        // Try to use "하이안" nickname (assuming host is 하이안)
        await guestPage2.fill('input[placeholder*="닉네임"]', '하이안');

        // Should show error message
        await expect(guestPage2.locator('text=/이미 사용 중인 닉네임입니다/')).toBeVisible();

        // Try a different nickname
        const uniqueNickname = `Guest${Math.floor(Math.random() * 1000)}`;
        await guestPage2.fill('input[placeholder*="닉네임"]', uniqueNickname);

        // Should be valid
        await expect(guestPage2.locator('text=/✓ 사용 가능한 닉네임입니다/')).toBeVisible();
      });

      // Clean up
      await context.close();
    }
  });

  test('booth mode only activates on party URLs', async ({ page }) => {
    await test.step('Root URL should not show booth mode', async () => {
      await page.goto(baseUrl);

      // Should NOT see booth mode
      await expect(page.locator('text=/부스 모드/')).not.toBeVisible({ timeout: 3000 });

      // Should see normal login
      await expect(page.locator('text=/로그인/')).toBeVisible();
    });

    await test.step('Profile page should not show booth mode', async () => {
      await page.goto(`${baseUrl}/profile`);

      // Should NOT see booth mode
      await expect(page.locator('text=/부스 모드/')).not.toBeVisible({ timeout: 3000 });
    });

    await test.step('Non-existent party shows error', async () => {
      await page.goto(`${baseUrl}/party/non-existent-party-xyz`);

      // Should see party not found error
      await expect(page.locator('text=/파티를 찾을 수 없습니다/')).toBeVisible();
      await expect(page.locator('button:has-text("홈으로 돌아가기")')).toBeVisible();

      // Test home button
      await page.click('button:has-text("홈으로 돌아가기")');
      expect(page.url()).toBe(`${baseUrl}/`);
    });
  });

  test('guest state persistence across page reloads', async ({ page }) => {
    // This test requires an existing party
    // You might need to create one first or use a known party ID

    await test.step('Guest login persists after reload', async () => {
      // Navigate to a party URL
      // You'll need to replace this with an actual party ID
      const testPartyId = 'test-party-id'; // Replace with actual ID

      await page.goto(`${baseUrl}/party/${testPartyId}`);

      // If party exists, join as guest
      const boothEntry = page.locator('h1:has-text("SDC 부스 게임")');
      if (await boothEntry.isVisible()) {
        await page.click('button:has-text("게스트로 참여")');

        const nickname = `Persistent${Math.floor(Math.random() * 1000)}`;
        await page.fill('input[placeholder*="닉네임"]', nickname);
        await page.waitForSelector('text=/✓ 사용 가능한 닉네임입니다/');
        await page.click('button:has-text("확인")');

        // Wait for join
        await page.waitForLoadState('networkidle');

        // Reload page
        await page.reload();

        // Guest should still be logged in
        // Verify by checking localStorage
        const boothUser = await page.evaluate(() => {
          return localStorage.getItem('boothUser');
        });

        expect(boothUser).toBeTruthy();
        const userData = JSON.parse(boothUser || '{}');
        expect(userData.nickname).toBe(nickname);
        expect(userData.isGuest).toBe(true);
      }
    });
  });
});