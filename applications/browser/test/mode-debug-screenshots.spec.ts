import { test, expect } from '@playwright/test';

// Increase test timeout
test.setTimeout(120000);

/**
 * Debug test to capture screenshots of Activity Bar behavior in different modes
 */
test.describe('Mode Debug Screenshots', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        // Wait for Theia to fully load - use multiple possible selectors
        await page.waitForFunction(
            () => {
                return (
                    document.querySelector('#theia-app-shell') !== null ||
                    document.querySelector('.theia-app-shell') !== null ||
                    document.querySelector('.theia-ApplicationShell') !== null
                );
            },
            { timeout: 60000 }
        );
        await page.waitForTimeout(5000); // Extra time for widgets to initialize
    });

    test('capture initial state and mode toggles', async ({ page }) => {
        // Screenshot 1: Initial state
        await page.screenshot({
            path: 'test-results/debug-01-initial-state.png',
            fullPage: true,
        });

        // Log the body classes to see what mode we're in
        const bodyClasses = await page.evaluate(() => document.body.className);
        console.log('Initial body classes:', bodyClasses);

        // Log Activity Bar visibility
        const activityBarInfo = await page.evaluate(() => {
            const activityBar = document.querySelector('.lm-TabBar.theia-app-sides');
            if (!activityBar) return 'Activity Bar not found (lm-TabBar)';
            const style = window.getComputedStyle(activityBar);
            return {
                display: style.display,
                visibility: style.visibility,
                width: style.width,
                opacity: style.opacity,
                className: activityBar.className,
            };
        });
        console.log('Activity Bar info:', activityBarInfo);

        // Log all tabs in the Activity Bar
        const tabs = await page.evaluate(() => {
            const allTabs = document.querySelectorAll('.lm-TabBar-tab, .p-TabBar-tab');
            return Array.from(allTabs).map(tab => ({
                id: tab.id,
                dataId: tab.getAttribute('data-id'),
                display: window.getComputedStyle(tab).display,
                className: tab.className,
            }));
        });
        console.log('Activity Bar tabs:', JSON.stringify(tabs, null, 2));

        // Try to find and click the KB View toggle
        try {
            // Look for KB View menu or command
            await page.click('text=KB View', { timeout: 5000 });
            await page.waitForTimeout(1000);

            // Screenshot 2: After clicking KB View menu
            await page.screenshot({
                path: 'test-results/debug-02-kb-view-menu.png',
                fullPage: true,
            });

            // Try to click "Switch to KB View" if menu is open
            const switchOption = page.locator('text=Switch to KB View');
            if (await switchOption.isVisible()) {
                await switchOption.click();
                await page.waitForTimeout(2000);
            }
        } catch {
            console.log('KB View menu not found, trying command palette');
        }

        // Try command palette approach
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);
        await page.keyboard.type('Switch to KB View');
        await page.waitForTimeout(500);
        await page.screenshot({
            path: 'test-results/debug-03-command-palette.png',
            fullPage: true,
        });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Screenshot 4: After switching to KB View
        await page.screenshot({
            path: 'test-results/debug-04-kb-view-mode.png',
            fullPage: true,
        });

        // Log state after KB View switch
        const bodyClassesAfterKB = await page.evaluate(() => document.body.className);
        console.log('Body classes after KB View:', bodyClassesAfterKB);

        const activityBarAfterKB = await page.evaluate(() => {
            const activityBar = document.querySelector('.lm-TabBar.theia-app-sides');
            if (!activityBar) return 'Activity Bar not found';
            const style = window.getComputedStyle(activityBar);
            return {
                display: style.display,
                visibility: style.visibility,
                width: style.width,
                className: activityBar.className,
            };
        });
        console.log('Activity Bar after KB View:', activityBarAfterKB);

        // Switch to Developer mode
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);
        await page.keyboard.type('Switch to Developer');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Screenshot 5: After switching to Developer
        await page.screenshot({
            path: 'test-results/debug-05-developer-mode.png',
            fullPage: true,
        });

        // Log state after Developer switch
        const bodyClassesAfterDev = await page.evaluate(() => document.body.className);
        console.log('Body classes after Developer:', bodyClassesAfterDev);

        const activityBarAfterDev = await page.evaluate(() => {
            const activityBar = document.querySelector('.lm-TabBar.theia-app-sides');
            if (!activityBar) return 'Activity Bar not found';
            const style = window.getComputedStyle(activityBar);
            return {
                display: style.display,
                visibility: style.visibility,
                width: style.width,
                className: activityBar.className,
            };
        });
        console.log('Activity Bar after Developer:', activityBarAfterDev);

        // Verify that we have the expected state
        expect(bodyClassesAfterDev).toContain('developer-mode');
    });
});
