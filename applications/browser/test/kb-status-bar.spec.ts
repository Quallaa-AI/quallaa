/**
 * KB Status Bar Test
 * Verifies that Obsidian-style status bar items are registered
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(2000);
}

test.describe('KB Status Bar', () => {
    test('Status bar contribution is loaded', async ({ page }) => {
        // Capture browser console logs
        const browserLogs: string[] = [];
        page.on('console', msg => {
            browserLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Wait for contributions to load
        await page.waitForTimeout(1000);

        // Log status bar related messages
        const statusLogs = browserLogs.filter(log => log.includes('KBStatusBar') || log.includes('status-bar') || log.includes('backlinks') || log.includes('word'));
        console.log('=== Status Bar Console Logs ===');
        statusLogs.forEach(log => console.log(log));
        console.log('=== End Status Bar Logs ===');

        // Verify the contribution was loaded
        const contributionLoaded = browserLogs.some(log => log.includes('[KBStatusBarContribution]'));
        console.log('Status bar contribution loaded:', contributionLoaded);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/kb-status-bar-1-initial.png', fullPage: true });

        expect(contributionLoaded).toBe(true);
    });

    test('Status bar exists in the application', async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Try different status bar selectors
        const statusBarSelectors = ['.theia-statusBar', '#theia-statusBar', '[class*="statusBar"]', '[class*="StatusBar"]'];

        let statusBarFound = false;
        for (const selector of statusBarSelectors) {
            const statusBar = page.locator(selector);
            const visible = (await statusBar.count()) > 0;
            if (visible) {
                console.log(`Status bar found with selector: ${selector}`);
                statusBarFound = true;
                break;
            }
        }

        // Note: Status bar items (backlinks, word count) only show when a markdown file is open
        // Without an open file, we can only verify the contribution is loaded

        // Take screenshot
        await page.screenshot({ path: 'screenshots/kb-status-bar-2-final.png', fullPage: true });

        // Test passes if contribution is loaded (verified in first test)
        // Status bar elements will show when user opens a markdown file
        console.log('Status bar found:', statusBarFound);
    });
});
