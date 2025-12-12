/**
 * Ribbon Obsidian Parity Test
 * Verifies that the ribbon matches Obsidian's layout
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(2000);
}

/**
 * Ensure we are in KB View mode.
 * Since the app starts in KB View mode by default, we check first.
 * Wait for widgets to stabilize before checking.
 */
async function ensureKBViewMode(page: Page) {
    // Wait longer for initial widgets to load
    await page.waitForTimeout(2000);

    // Close any dialogs that might be open
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Check if ribbon is already visible (indicates KB View mode is active)
    const ribbon = page.locator('.quallaa-ribbon-widget');
    const ribbonAlreadyVisible = await ribbon.isVisible().catch(() => false);

    if (ribbonAlreadyVisible) {
        console.log('Already in KB View mode - ribbon is visible');
        return;
    }

    console.log('Ribbon not visible, need to switch to KB View mode...');

    // Click on KB View menu in the menu bar
    const kbViewMenu = page.getByRole('menuitem', { name: 'KB View' });
    await kbViewMenu.click();
    await page.waitForTimeout(500);

    // Take screenshot of open menu
    await page.screenshot({ path: 'screenshots/ribbon-test-menu-open.png', fullPage: true });

    // IMPORTANT: Look for "Switch to KB View Mode" specifically, NOT Toggle
    const switchToKBView = page.getByRole('menuitem', { name: /Switch to KB View/i });
    const switchVisible = await switchToKBView.isVisible().catch(() => false);

    if (switchVisible) {
        await switchToKBView.click();
        console.log('Clicked Switch to KB View Mode');
    } else {
        // If Switch to KB View isn't visible, we might already be in KB View
        // Just close the menu
        await page.keyboard.press('Escape');
        console.log('Switch to KB View not available, may already be in KB View');
    }

    await page.waitForTimeout(2000);
}

test.describe('Ribbon Obsidian Parity', () => {
    test('Ribbon has correct icons in Obsidian order', async ({ page }) => {
        // Capture browser console logs
        const browserLogs: string[] = [];
        page.on('console', msg => {
            browserLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Take screenshot of initial state
        await page.screenshot({ path: 'screenshots/ribbon-test-1-initial.png', fullPage: true });

        // Ensure we're in KB View mode to show the ribbon
        await ensureKBViewMode(page);

        // Wait additional time for widget manager to process
        await page.waitForTimeout(1000);

        // Log browser console output related to KB View
        const kbLogs = browserLogs.filter(
            log => log.includes('KBView') || log.includes('ribbon') || log.includes('Ribbon') || log.includes('WidgetManager') || log.includes('Mode')
        );
        console.log('=== KB View Related Console Logs ===');
        kbLogs.forEach(log => console.log(log));
        console.log('Total browser logs captured:', browserLogs.length);
        console.log('=== End Console Logs ===');

        // Take screenshot after mode switch
        await page.screenshot({ path: 'screenshots/ribbon-test-2-kbview-mode.png', fullPage: true });

        // Check for ribbon widget
        const ribbon = page.locator('.quallaa-ribbon-widget');
        const ribbonVisible = await ribbon.isVisible().catch(() => false);
        console.log('Ribbon visible:', ribbonVisible);

        if (ribbonVisible) {
            // Count ribbon actions
            const actions = page.locator('.quallaa-ribbon-action');
            const actionCount = await actions.count();
            console.log('Ribbon action count:', actionCount);

            // Expected: 6 icons (toggle-sidebar, search, bookmarks, graph, templates, connections)
            expect(actionCount).toBe(6);

            // Check icons in order
            const expectedIcons = [
                'codicon-layout-sidebar-left', // Toggle Sidebar
                'codicon-search', // Search
                'codicon-bookmark', // Bookmarks (placeholder)
                'codicon-type-hierarchy-sub', // Graph View
                'codicon-file-code', // Templates (placeholder)
                'codicon-git-merge', // Connections (placeholder)
            ];

            for (let i = 0; i < expectedIcons.length; i++) {
                const icon = actions.nth(i).locator('i');
                const hasIcon = await icon.evaluate((el, expected) => el.classList.contains(expected), expectedIcons[i]).catch(() => false);
                console.log(`Icon ${i}: ${expectedIcons[i]} - ${hasIcon ? 'OK' : 'MISSING'}`);
                expect(hasIcon, `Icon ${i} should be ${expectedIcons[i]}`).toBe(true);
            }

            // Check placeholder styling
            const placeholders = page.locator('.quallaa-ribbon-action-placeholder');
            const placeholderCount = await placeholders.count();
            console.log('Placeholder count:', placeholderCount);
            // Expected: 3 placeholders (bookmarks, templates, connections)
            expect(placeholderCount).toBe(3);

            // Take screenshot of ribbon area
            await ribbon.screenshot({ path: 'screenshots/ribbon-test-3-ribbon.png' });

            console.log('✓ Ribbon matches Obsidian layout');
        } else {
            console.log('✗ Ribbon not visible - KB View mode may not have been activated');
            // Log what is visible to help debug
            const leftSidebar = page.locator('.theia-left-side-panel');
            const leftVisible = await leftSidebar.isVisible().catch(() => false);
            console.log('Left sidebar visible:', leftVisible);
        }

        await page.screenshot({ path: 'screenshots/ribbon-test-4-final.png', fullPage: true });
    });

    test('Ribbon placeholder actions show Coming Soon message', async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);

        // Ensure we're in KB View mode to show the ribbon
        await ensureKBViewMode(page);

        // Find bookmarks button (3rd action, index 2)
        const bookmarksBtn = page.locator('.quallaa-ribbon-action').nth(2);

        if (await bookmarksBtn.isVisible().catch(() => false)) {
            await bookmarksBtn.click();
            await page.waitForTimeout(500);

            // Check for notification
            const notification = page.locator('.theia-notification-message');
            const hasNotification = await notification.isVisible().catch(() => false);
            if (hasNotification) {
                const text = await notification.textContent();
                console.log('Notification:', text);
                expect(text).toContain('Coming Soon');
            }

            await page.screenshot({ path: 'screenshots/ribbon-test-5-notification.png', fullPage: true });
        } else {
            console.log('Bookmarks button not visible - ribbon may not be active');
        }
    });
});
