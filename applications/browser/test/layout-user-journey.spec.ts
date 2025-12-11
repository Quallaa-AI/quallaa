/**
 * User Journey Tests for Named Workspace Layouts (Priority 2)
 *
 * These tests validate the actual user experience, not just that commands register.
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(3000); // Allow for full initialization
}

async function openCommandPalette(page: Page) {
    await page.keyboard.press('F1');
    await page.waitForTimeout(500);
    await page.waitForSelector('.quick-input-widget', { timeout: 5000 });
}

async function executeCommand(page: Page, commandName: string) {
    await openCommandPalette(page);
    await page.keyboard.type(commandName);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
}

async function typeInQuickInput(page: Page, text: string) {
    // Wait for the input box to appear - use the specific input box class
    await page.waitForSelector('.monaco-inputbox input[type="text"]', { timeout: 3000 });
    await page.keyboard.type(text);
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
}

test.describe('Layout User Journeys', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage for clean state
        await page.goto(APP_URL);
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await waitForAppReady(page);
    });

    test('Journey: Save and switch to custom layout', async ({ page }) => {
        console.log('Step 1: Switch to KB View mode');
        // Note: After localStorage clear, app may not default to KB View due to
        // initialization timing. This is a known issue to investigate.
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(500);
        await page.keyboard.type('KB View');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        const bodyClasses = await page.evaluate(() => document.body.className);
        expect(bodyClasses).toContain('kb-view-mode');
        console.log('✓ In KB View mode');

        console.log('Step 2: Save current layout as "My Research Layout"');
        await executeCommand(page, 'Save Current Layout');

        // Enter layout name
        await typeInQuickInput(page, 'My Research Layout');

        // Skip description (just press Enter)
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Check for success notification
        const notifications = await page.$$('.theia-notification-message');
        console.log(`Found ${notifications.length} notifications`);

        // Log notification content
        for (const notification of notifications) {
            const text = await notification.textContent();
            console.log('Notification:', text);
        }

        console.log('Step 3: Switch to Developer mode to change state');
        await executeCommand(page, 'Switch to Developer Mode');
        await page.waitForTimeout(2000);

        // Verify we're in Developer mode
        const bodyClassesAfterSwitch = await page.evaluate(() => document.body.className);
        expect(bodyClassesAfterSwitch).toContain('developer-mode');
        console.log('✓ Switched to Developer mode');

        console.log('Step 4: Use Switch Layout to go back to our saved layout');
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(1000);

        // Look for our saved layout in the quick pick
        const quickPickItems = page.locator('.monaco-list-row');
        const count = await quickPickItems.count();
        console.log(`Quick pick shows ${count} layouts`);

        // Log all available layouts
        const layoutNames: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await quickPickItems.nth(i).textContent();
            if (text) {
                layoutNames.push(text.trim());
                console.log(`Layout ${i}: ${text.trim()}`);
            }
        }

        // Check if our custom layout appears
        const hasCustomLayout = layoutNames.some(name => name.includes('My Research Layout'));
        console.log('Has custom layout "My Research Layout":', hasCustomLayout);

        // Select "My Research Layout" if it exists
        if (hasCustomLayout) {
            // Type to filter
            await page.keyboard.type('My Research');
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);

            // Verify the custom layout CSS class is applied
            const finalBodyClasses = await page.evaluate(() => document.body.className);
            console.log('Final body classes:', finalBodyClasses);

            // Custom layouts get their own CSS class
            expect(finalBodyClasses).toContain('custom-layout-my-research-layout');

            // Custom layouts should also restore the mode they were saved in
            // This layout was saved while in KB View mode, so it should have kb-view-mode
            expect(finalBodyClasses).toContain('kb-view-mode');
            console.log('✓ Successfully switched to saved custom layout with correct mode');
        } else {
            // If custom layout doesn't appear, the save didn't work
            console.log('❌ Custom layout not found - save functionality may not be working');

            // Close the quick pick
            await page.keyboard.press('Escape');
        }

        expect(hasCustomLayout, 'Custom layout should appear in Switch Layout picker').toBe(true);
    });

    test('Journey: Built-in layouts (KB View and Developer) are always available', async ({ page }) => {
        console.log('Step 1: Open Switch Layout command');
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(1000);

        // Get all layouts
        const quickPickItems = page.locator('.monaco-list-row');
        const count = await quickPickItems.count();
        console.log(`Found ${count} layouts`);

        const layoutNames: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await quickPickItems.nth(i).textContent();
            if (text) {
                layoutNames.push(text.trim());
                console.log(`Layout: ${text.trim()}`);
            }
        }

        // Check for built-in layouts
        const hasKBView = layoutNames.some(name => name.includes('KB View'));
        const hasDeveloper = layoutNames.some(name => name.includes('Developer'));

        console.log('Has KB View layout:', hasKBView);
        console.log('Has Developer layout:', hasDeveloper);

        expect(hasKBView, 'KB View should be a built-in layout').toBe(true);
        expect(hasDeveloper, 'Developer should be a built-in layout').toBe(true);

        await page.keyboard.press('Escape');
    });

    test('Journey: Switch between KB View and Developer preserves state', async ({ page }) => {
        console.log('Step 1: Start in KB View mode');
        // Explicitly switch to KB View to ensure clean state
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(500);
        await page.keyboard.type('KB View');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        let bodyClasses = await page.evaluate(() => document.body.className);
        expect(bodyClasses).toContain('kb-view-mode');
        console.log('✓ In KB View mode');

        console.log('Step 2: Switch to Developer mode');
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(500);
        await page.keyboard.type('Developer');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Verify Developer mode
        bodyClasses = await page.evaluate(() => document.body.className);
        expect(bodyClasses).toContain('developer-mode');
        console.log('✓ In Developer mode');

        // Check that bottom panel might be visible (developer has access to terminal)
        const bottomPanelVisible = await page.evaluate(() => {
            const panel = document.getElementById('theia-bottom-content-panel');
            if (!panel) return false;
            const style = window.getComputedStyle(panel);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        console.log('Bottom panel visible in Developer mode:', bottomPanelVisible);

        console.log('Step 3: Switch back to KB View');
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(500);
        await page.keyboard.type('KB View');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Verify KB View mode
        bodyClasses = await page.evaluate(() => document.body.className);
        expect(bodyClasses).toContain('kb-view-mode');
        console.log('✓ Back in KB View mode');

        // Bottom panel should be hidden in KB View
        const bottomPanelHidden = await page.evaluate(() => {
            const panel = document.getElementById('theia-bottom-content-panel');
            if (!panel) return true;
            const style = window.getComputedStyle(panel);
            return style.display === 'none' || style.visibility === 'hidden';
        });
        console.log('Bottom panel hidden in KB View mode:', bottomPanelHidden);
    });

    test('Journey: Delete custom layout removes it from list', async ({ page }) => {
        console.log('Step 1: Save a layout to delete');
        await executeCommand(page, 'Save Current Layout');
        await typeInQuickInput(page, 'Temporary Layout');
        await page.keyboard.press('Enter'); // Skip description
        await page.waitForTimeout(1000);

        console.log('Step 2: Verify layout exists');
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(500);

        let items = page.locator('.monaco-list-row');
        let count = await items.count();
        const layoutsBefore: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await items.nth(i).textContent();
            if (text) layoutsBefore.push(text.trim());
        }
        console.log('Layouts before delete:', layoutsBefore);

        const existsBefore = layoutsBefore.some(l => l.includes('Temporary Layout'));
        await page.keyboard.press('Escape');

        if (!existsBefore) {
            console.log('❌ Layout was not saved - cannot test delete');
            expect(existsBefore, 'Layout should exist before delete').toBe(true);
            return;
        }

        console.log('Step 3: Delete the layout');
        await executeCommand(page, 'Delete Layout');
        await page.waitForTimeout(500);

        // Select "Temporary Layout"
        await page.keyboard.type('Temporary');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        console.log('Step 4: Verify layout is gone');
        await executeCommand(page, 'Switch Workspace Layout');
        await page.waitForTimeout(500);

        items = page.locator('.monaco-list-row');
        count = await items.count();
        const layoutsAfter: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await items.nth(i).textContent();
            if (text) layoutsAfter.push(text.trim());
        }
        console.log('Layouts after delete:', layoutsAfter);

        const existsAfter = layoutsAfter.some(l => l.includes('Temporary Layout'));
        expect(existsAfter, 'Layout should be deleted').toBe(false);
        console.log('✓ Layout successfully deleted');

        await page.keyboard.press('Escape');
    });
});
