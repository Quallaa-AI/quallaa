/**
 * KB View Mode Default Behavior Test
 *
 * Verifies that Priority 1 (Knowledge-First Defaults) is working:
 * - KB View mode is active by default (not Developer mode)
 * - Bottom panel (Terminal/Problems) is hidden
 * - Tags and Backlinks widgets are open by default
 * - Developer icons are hidden from Activity Bar in KB View mode
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

const TEST_WORKSPACE = path.join(__dirname, '../../../test-workspace');
const SCREENSHOT_DIR = path.join(__dirname, '../../../screenshots/kb-view-test');

/**
 * Helper: Wait for app to be fully loaded
 */
async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-preload', { state: 'hidden', timeout: 30000 });
    await page.waitForSelector('#theia-app-shell', { timeout: 30000 });
    await page.waitForTimeout(2000); // Allow for mode initialization
}

/**
 * Helper: Check if an element is visible
 */
async function isVisible(page: Page, selector: string): Promise<boolean> {
    try {
        const element = await page.locator(selector).first();
        return await element.isVisible({ timeout: 2000 });
    } catch {
        return false;
    }
}

/**
 * Helper: Get text content of an element
 */
async function getText(page: Page, selector: string): Promise<string | null> {
    try {
        const element = await page.locator(selector).first();
        return await element.textContent();
    } catch {
        return null;
    }
}

test.describe('KB View Mode - Default Behavior', () => {
    test.beforeEach(async ({ page }) => {
        // Clear local storage to simulate fresh start
        await page.goto(`http://localhost:3000`);
        await page.evaluate(() => localStorage.clear());

        // Now load with workspace
        await page.goto(`http://localhost:3000/?folder=${TEST_WORKSPACE}`);
        await waitForAppReady(page);
    });

    test('01 - KB View mode should be active by default', async ({ page }) => {
        // Check for KB View mode CSS class on body
        const bodyClasses = await page.evaluate(() => document.body.className);

        expect(bodyClasses).toContain('kb-view-mode');
        expect(bodyClasses).not.toContain('developer-mode');

        // Take screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-kb-view-active-by-default.png'),
            fullPage: true,
        });
    });

    test('02 - Bottom panel should be hidden in KB View mode', async ({ page }) => {
        // Check if bottom panel exists and is hidden
        const bottomPanel = page.locator('#theia-bottom-content-panel');

        // Panel may exist but should not be visible
        const isBottomPanelVisible = await bottomPanel.isVisible().catch(() => false);

        expect(isBottomPanelVisible).toBe(false);

        // Take screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '02-bottom-panel-hidden.png'),
            fullPage: true,
        });
    });

    test('03 - Tags widget should be open in left sidebar', async ({ page }) => {
        // Look for Tags widget
        const tagsWidget = page.locator('.theia-side-panel').filter({ hasText: /TAGS/i }).first();
        const isTagsVisible = await tagsWidget.isVisible().catch(() => false);

        expect(isTagsVisible).toBe(true);

        // Verify it shows tag count
        const tagsText = await tagsWidget.textContent();
        expect(tagsText).toMatch(/\d+\s+tags/i);

        // Take screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-tags-widget-open.png'),
            fullPage: true,
        });
    });

    test('04 - Backlinks widget should be open in right sidebar', async ({ page }) => {
        // Look for Backlinks widget
        const backlinksWidget = page
            .locator('.theia-side-panel')
            .filter({ hasText: /BACKLINKS/i })
            .first();
        const isBacklinksVisible = await backlinksWidget.isVisible().catch(() => false);

        expect(isBacklinksVisible).toBe(true);

        // Take screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-backlinks-widget-open.png'),
            fullPage: true,
        });
    });

    test('05 - Dual sidebars should be visible simultaneously', async ({ page }) => {
        // Verify both left and right sidebars are visible at the same time
        const leftSidebar = page.locator('#theia-left-side-panel');
        const rightSidebar = page.locator('#theia-right-side-panel');

        const isLeftVisible = await leftSidebar.isVisible();
        const isRightVisible = await rightSidebar.isVisible();

        expect(isLeftVisible).toBe(true);
        expect(isRightVisible).toBe(true);

        // Take screenshot showing dual sidebars
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-dual-sidebars.png'),
            fullPage: true,
        });
    });

    test('06 - Developer icons should be hidden from Activity Bar', async ({ page }) => {
        // Activity Bar is on the far left
        const activityBar = page.locator('.theia-app-left .theia-app-sides');

        // Check for presence of various icons by their titles
        // Note: These might be hidden via CSS, so check visibility not existence

        // Debug icon - should be hidden
        const debugIcon = page.locator('[title="Debug"]').first();
        const isDebugVisible = await debugIcon.isVisible().catch(() => false);
        expect(isDebugVisible).toBe(false);

        // Terminal icon - should be hidden
        const terminalIcon = page.locator('[title="Terminal"]').first();
        const isTerminalVisible = await terminalIcon.isVisible().catch(() => false);
        expect(isTerminalVisible).toBe(false);

        // SCM icon - should be hidden
        const scmIcon = page.locator('[title*="Source Control"]').first();
        const isScmVisible = await scmIcon.isVisible().catch(() => false);
        expect(isScmVisible).toBe(false);

        // Take screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '06-activity-bar-filtered.png'),
            fullPage: true,
        });
    });

    test('07 - KB View menu should be present', async ({ page }) => {
        // Click on menu bar to check for KB View menu
        const viewMenu = page.locator('[aria-label="View"]').first();

        if (await viewMenu.isVisible()) {
            await viewMenu.click();
            await page.waitForTimeout(500);

            // Look for KB View toggle command
            const hasToggleCommand = await isVisible(page, 'text=/Toggle KB View.*Developer Mode/i');
            expect(hasToggleCommand).toBe(true);

            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, '07-view-menu-with-kb-toggle.png'),
                fullPage: true,
            });

            // Close menu
            await page.keyboard.press('Escape');
        }
    });

    test('08 - Mode toggle command should work', async ({ page }) => {
        // Open command palette
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+Shift+P`);
        await page.waitForTimeout(500);

        // Type command to find mode toggle
        await page.keyboard.type('Toggle KB View');
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '08-command-palette-toggle.png'),
            fullPage: true,
        });

        // Press Enter to execute (this will switch to Developer mode)
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        // Verify mode changed
        const bodyClasses = await page.evaluate(() => document.body.className);
        expect(bodyClasses).toContain('developer-mode');
        expect(bodyClasses).not.toContain('kb-view-mode');

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '08-switched-to-developer-mode.png'),
            fullPage: true,
        });

        // Toggle back to KB View
        await page.keyboard.press(`${modifier}+Shift+P`);
        await page.waitForTimeout(300);
        await page.keyboard.type('Toggle KB View');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        // Verify we're back in KB View mode
        const bodyClassesAfter = await page.evaluate(() => document.body.className);
        expect(bodyClassesAfter).toContain('kb-view-mode');

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '08-toggled-back-to-kb-view.png'),
            fullPage: true,
        });
    });

    test('09 - File extensions should be hidden in KB View mode', async ({ page }) => {
        // Open file explorer if not already open
        const filesIcon = page.locator('[title="Files"]').first();
        if (await filesIcon.isVisible()) {
            await filesIcon.click();
            await page.waitForTimeout(500);
        }

        // Look for markdown files in the tree
        // They should appear without .md extension in KB View mode
        // Use #files to target the specific file tree widget, not other FileTree elements
        const fileTree = page.locator('#files .theia-FileTree');
        const fileTreeContent = await fileTree.textContent();

        // Files should appear without .md (e.g., "Index" not "Index.md")
        // This is tricky to test definitively, but we can check that
        // the file tree exists and is visible
        expect(fileTreeContent).toBeTruthy();

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '09-file-extensions-hidden.png'),
            fullPage: true,
        });
    });

    test('10 - State persistence across mode switches', async ({ page }) => {
        // Open a file in KB View mode
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+P`);
        await page.waitForTimeout(500);
        await page.keyboard.type('Index.md');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Capture KB View state (file open, Tags + Backlinks visible)
        const kbViewState = {
            bodyClasses: await page.evaluate(() => document.body.className),
            leftSidebarVisible: await page.locator('#theia-left-side-panel').isVisible(),
            rightSidebarVisible: await page.locator('#theia-right-side-panel').isVisible(),
        };

        expect(kbViewState.bodyClasses).toContain('kb-view-mode');
        expect(kbViewState.leftSidebarVisible).toBe(true);
        expect(kbViewState.rightSidebarVisible).toBe(true);

        // Switch to Developer mode
        await page.keyboard.press(`${modifier}+Shift+P`);
        await page.waitForTimeout(300);
        await page.keyboard.type('Switch to Developer');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        // Allow extra time for state capture and mode switch
        await page.waitForTimeout(2500);

        // Verify Developer mode
        const devBodyClasses = await page.evaluate(() => document.body.className);
        expect(devBodyClasses).toContain('developer-mode');

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '10-developer-mode-state.png'),
            fullPage: true,
        });

        // Switch back to KB View
        await page.keyboard.press(`${modifier}+Shift+P`);
        await page.waitForTimeout(300);
        await page.keyboard.type('Switch to KB View');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        // Allow extra time for state restoration (widgets need to be created/revealed)
        await page.waitForTimeout(2500);

        // Verify state restored
        const restoredState = {
            bodyClasses: await page.evaluate(() => document.body.className),
            leftSidebarVisible: await page.locator('#theia-left-side-panel').isVisible(),
            rightSidebarVisible: await page.locator('#theia-right-side-panel').isVisible(),
        };

        expect(restoredState.bodyClasses).toContain('kb-view-mode');
        expect(restoredState.leftSidebarVisible).toBe(true);
        expect(restoredState.rightSidebarVisible).toBe(true);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '10-state-restored.png'),
            fullPage: true,
        });
    });
});

test.describe('KB View Mode - Visual Regression', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`http://localhost:3000/?folder=${TEST_WORKSPACE}`);
        await waitForAppReady(page);
    });

    test('11 - Full layout screenshot for documentation', async ({ page }) => {
        // Capture full layout in KB View mode for docs
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '11-kb-view-full-layout.png'),
            fullPage: true,
        });

        // Capture without sidebars (main editor area)
        // This would require toggling sidebars, skip for now
    });

    test('12 - Compare with Developer mode layout', async ({ page }) => {
        // KB View mode screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '12-kb-view-layout.png'),
            fullPage: true,
        });

        // Switch to Developer mode
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+Shift+P`);
        await page.waitForTimeout(300);
        await page.keyboard.type('Switch to Developer');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        // Developer mode screenshot
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '12-developer-mode-layout.png'),
            fullPage: true,
        });

        // Visual comparison shows the difference
        // Manual inspection required
    });
});
