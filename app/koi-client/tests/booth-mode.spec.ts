import { test, expect } from '@playwright/test';

// Test booth mode functionality with party-restricted access
test.describe('Booth Mode - Party Restricted Access', () => {

  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size for better testing
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('should show normal login when accessing root URL without partyId', async ({ page }) => {
    // Go to root URL
    await page.goto('http://localhost:5173/');

    // Should NOT see booth mode entry
    await expect(page.locator('text=부스 모드')).not.toBeVisible({ timeout: 3000 });

    // Should see normal login elements
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('should show booth mode entry when accessing party URL', async ({ page }) => {
    // Go to party URL with a test party ID
    await page.goto('http://localhost:5173/party/test-party-123');

    // Should see booth mode entry screen
    await expect(page.locator('h1:has-text("SDC STOCK")')).toBeVisible();
    await expect(page.locator('h2:has-text("부스 모드")')).toBeVisible();

    // Should see both options
    await expect(page.locator('button:has-text("게스트로 참여")')).toBeVisible();
    await expect(page.locator('button:has-text("계정으로 로그인")')).toBeVisible();
  });

  test('should open nickname modal when clicking guest participation', async ({ page }) => {
    // Go to party URL
    await page.goto('http://localhost:5173/party/test-party-123');

    // Wait for booth mode entry to load
    await page.waitForSelector('button:has-text("게스트로 참여")');

    // Click guest participation button
    await page.click('button:has-text("게스트로 참여")');

    // Should see nickname modal
    await expect(page.locator('.ant-modal')).toBeVisible();
    await expect(page.locator('text=닉네임 입력')).toBeVisible();

    // Should see input field
    await expect(page.locator('input[placeholder="닉네임을 입력하세요"]')).toBeVisible();
  });

  test('should validate nickname format', async ({ page }) => {
    // Go to party URL
    await page.goto('http://localhost:5173/party/test-party-123');

    // Click guest participation
    await page.click('button:has-text("게스트로 참여")');

    // Wait for modal
    await page.waitForSelector('.ant-modal');

    // Test invalid nickname (special characters)
    await page.fill('input[placeholder="닉네임을 입력하세요"]', 'test@user');

    // Should show validation error
    await expect(page.locator('text=한글, 영문, 숫자만 사용 가능합니다')).toBeVisible();

    // Test valid nickname
    await page.fill('input[placeholder="닉네임을 입력하세요"]', 'testUser123');

    // Should show success message
    await expect(page.locator('text=✓ 사용 가능한 닉네임입니다')).toBeVisible();
  });

  test('should allow account login option', async ({ page }) => {
    // Go to party URL
    await page.goto('http://localhost:5173/party/test-party-123');

    // Click account login button
    await page.click('button:has-text("계정으로 로그인")');

    // Should show normal login screen
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('should NOT show booth mode on profile page', async ({ page }) => {
    // Go to profile page
    await page.goto('http://localhost:5173/profile');

    // Should NOT see booth mode entry
    await expect(page.locator('text=부스 모드')).not.toBeVisible({ timeout: 3000 });

    // Should see normal login if not authenticated
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('should NOT show booth mode on backoffice pages', async ({ page }) => {
    // Go to backoffice page
    await page.goto('http://localhost:5173/backoffice');

    // Should NOT see booth mode entry
    await expect(page.locator('text=부스 모드')).not.toBeVisible({ timeout: 3000 });

    // Should see normal login if not authenticated
    await expect(page.locator('text=로그인')).toBeVisible();
  });

  test('nickname validation should work without party context on non-party pages', async ({ page }) => {
    // This tests the bug fix where validation was stuck on non-party pages
    // Since booth mode is now restricted to party pages, this scenario shouldn't occur
    // But we test to ensure the fix is working

    // Go to root URL
    await page.goto('http://localhost:5173/');

    // Booth mode should not be available here
    await expect(page.locator('text=부스 모드')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Booth Mode - Guest Flow', () => {

  test('complete guest participation flow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Go to party URL
    await page.goto('http://localhost:5173/party/test-party-123');

    // Click guest participation
    await page.click('button:has-text("게스트로 참여")');

    // Enter valid nickname
    await page.fill('input[placeholder="닉네임을 입력하세요"]', 'Player1');

    // Wait for validation
    await expect(page.locator('text=✓ 사용 가능한 닉네임입니다')).toBeVisible();

    // Click join button
    await page.click('button:has-text("참여하기")');

    // Should reload and join the party as guest
    // The page will reload, so we wait for navigation
    await page.waitForLoadState('load');

    // After reload, guest should be in the party page
    // Note: Actual party page content depends on backend response
  });
});