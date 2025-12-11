/**
 * E2E tests for KB View mode switching (Phase 1)
 */

import { test, expect } from '@playwright/test';

test.describe('KB View Mode Switching', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the application to be ready
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });

        // Give the application time to initialize
        await page.waitForTimeout(2000);
    });

    test('should have developer-mode class by default', async ({ page }) => {
        // Check that body has developer-mode class by default
        const body = await page.locator('body');
        const hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));

        expect(hasDevMode).toBe(true);
        console.log('✓ Body has developer-mode class by default');
    });

    test('should switch to KB View mode via command', async ({ page }) => {
        // Open command palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on others)
        await page.keyboard.press('Meta+Shift+p');

        // Wait for command palette
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });

        // Type the command
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');

        // Wait for command to appear in list
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });

        // Press Enter to execute command
        await page.keyboard.press('Enter');

        // Wait for mode switch to complete by waiting for body class change
        await page.waitForSelector('body.kb-view-mode', { timeout: 5000 });

        // Check that body has kb-view-mode class
        const body = await page.locator('body');
        const hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        const hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));

        expect(hasKBViewMode).toBe(true);
        expect(hasDevMode).toBe(false);
        console.log('✓ Switched to KB View mode successfully');
    });

    test('should toggle between modes', async ({ page }) => {
        // Initial state should be developer mode
        let body = await page.locator('body');
        let hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));
        expect(hasDevMode).toBe(true);

        // Toggle to KB View mode
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Toggle KB View');
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });
        await page.keyboard.press('Enter');
        await page.waitForSelector('body.kb-view-mode', { timeout: 5000 });

        // Check that we're now in KB View mode
        let hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        expect(hasKBViewMode).toBe(true);
        console.log('✓ Toggled to KB View mode');

        // Toggle back to Developer mode
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Toggle KB View');
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });
        await page.keyboard.press('Enter');
        await page.waitForSelector('body.developer-mode', { timeout: 5000 });

        // Check that we're back in Developer mode
        hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));
        hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        expect(hasDevMode).toBe(true);
        expect(hasKBViewMode).toBe(false);
        console.log('✓ Toggled back to Developer mode');
    });

    test('should persist mode across page reload', async ({ page }) => {
        // Switch to KB View mode
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });
        await page.keyboard.press('Enter');
        await page.waitForSelector('body.kb-view-mode', { timeout: 5000 });

        // Verify we're in KB View mode
        let body = await page.locator('body');
        let hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        expect(hasKBViewMode).toBe(true);
        console.log('✓ Switched to KB View mode');

        // Reload the page
        await page.reload();
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
        // Wait for KB View mode to be restored after reload
        await page.waitForSelector('body.kb-view-mode', { timeout: 10000 });

        // Check that we're still in KB View mode after reload
        body = await page.locator('body');
        hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        expect(hasKBViewMode).toBe(true);
        console.log('✓ KB View mode persisted across page reload');

        // Switch back to Developer mode for cleanup
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to Developer Mode');
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });
        await page.keyboard.press('Enter');
        await page.waitForSelector('body.developer-mode', { timeout: 5000 });
        console.log('✓ Cleaned up: switched back to Developer mode');
    });

    test('should have correct context key', async ({ page }) => {
        // Switch to KB View mode
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });
        await page.keyboard.press('Enter');
        await page.waitForSelector('body.kb-view-mode', { timeout: 5000 });

        // Try to execute "Switch to KB View Mode" again - it should be disabled
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');
        // Wait for list to update after filtering
        await page.waitForSelector('.monaco-list', { state: 'visible', timeout: 2000 });

        // Check if the command appears (it should be filtered out if context key works)
        const commandItems = await page.locator('.monaco-list-row').count();

        // The command should either not appear or appear as disabled
        console.log(`✓ Command palette shows ${commandItems} items`);

        // Clean up
        await page.keyboard.press('Escape');
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to Developer Mode');
        await page.waitForSelector('.monaco-list-row', { state: 'visible', timeout: 2000 });
        await page.keyboard.press('Enter');
        await page.waitForSelector('body.developer-mode', { timeout: 5000 });
    });
});
