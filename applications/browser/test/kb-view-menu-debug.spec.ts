import { test, expect } from '@playwright/test';

test.describe('KB View Menu Bar DEBUG', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
        await page.waitForTimeout(3000);
    });

    test('debug: inspect menu bar HTML structure', async ({ page }) => {
        // Wait for menu bar
        const menuBar = page.locator('#theia\\:menubar');
        await expect(menuBar).toBeVisible({ timeout: 10000 });

        // Get the entire menu bar HTML
        const html = await menuBar.innerHTML();
        console.log('=== MENU BAR HTML ===');
        console.log(html);

        // Try different selectors
        const selectors = [
            '.p-MenuBar-item',
            '.theia-menu-bar-item',
            '[role="menuitem"]',
            '.p-MenuBar .p-MenuBar-content > *',
            '#theia\\:menubar .p-MenuBar-content > *',
            '#theia\\:menubar [role="menuitem"]',
            '#theia\\:menubar li',
        ];

        for (const selector of selectors) {
            const count = await page.locator(selector).count();
            console.log(`Selector "${selector}": ${count} items`);
        }
    });

    test('debug: screenshot menu bar', async ({ page }) => {
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/menu-bar-debug.png', fullPage: true });
        console.log('Screenshot saved to test-results/menu-bar-debug.png');
    });
});
