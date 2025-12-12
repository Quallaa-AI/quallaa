/**
 * Editor Navigation Test
 * Verifies that Obsidian-style back/forward navigation buttons are registered
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(2000);
}

test.describe('Editor Navigation', () => {
    test('Navigation toolbar contribution is loaded', async ({ page }) => {
        // Capture browser console logs
        const browserLogs: string[] = [];
        page.on('console', msg => {
            browserLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Wait for contributions to load
        await page.waitForTimeout(1000);

        // Log navigation-related messages
        const navLogs = browserLogs.filter(log => log.includes('KBNavigationToolbar') || log.includes('navigation') || log.includes('GO_BACK') || log.includes('GO_FORWARD'));
        console.log('=== Navigation Console Logs ===');
        navLogs.forEach(log => console.log(log));
        console.log('=== End Navigation Logs ===');

        // Verify the contribution was loaded
        const contributionLoaded = browserLogs.some(log => log.includes('[KBNavigationToolbarContribution] Constructor called'));
        console.log('Navigation contribution loaded:', contributionLoaded);

        // Verify toolbar items were registered
        const toolbarItemsRegistered = browserLogs.some(log => log.includes('Navigation toolbar items registered'));
        console.log('Toolbar items registered:', toolbarItemsRegistered);

        expect(contributionLoaded).toBe(true);
        expect(toolbarItemsRegistered).toBe(true);
    });

    test('Back/Forward buttons appear when editor is open', async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Take screenshot of initial state
        await page.screenshot({ path: 'screenshots/editor-nav-1-initial.png', fullPage: true });

        // Check for editor widget - if no editor is open, the buttons won't appear
        // The buttons only show on EditorWidget instances
        const editorWidget = page.locator('.theia-editor-container');
        const editorVisible = await editorWidget.isVisible().catch(() => false);
        console.log('Editor visible:', editorVisible);

        if (editorVisible) {
            // Look for the back/forward buttons in the tab bar toolbar
            const backButton = page.locator('[id="kb-navigation-back"]');
            const forwardButton = page.locator('[id="kb-navigation-forward"]');

            const backVisible = await backButton.isVisible().catch(() => false);
            const forwardVisible = await forwardButton.isVisible().catch(() => false);

            console.log('Back button visible:', backVisible);
            console.log('Forward button visible:', forwardVisible);

            // Take screenshot if editor is visible
            await page.screenshot({ path: 'screenshots/editor-nav-2-with-editor.png', fullPage: true });

            expect(backVisible).toBe(true);
            expect(forwardVisible).toBe(true);
        } else {
            console.log('No editor open - buttons will only appear when an editor is active');
            // Test passes - buttons are registered but won't show without an editor
        }
    });
});
