/**
 * Tests for Named Workspace Layouts (Priority 2)
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

/**
 * Helper: Wait for app to be fully loaded
 */
async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(2000); // Allow for mode initialization
}

/**
 * Helper: Open command palette
 */
async function openCommandPalette(page: Page) {
    await page.keyboard.press('F1');
    await page.waitForTimeout(500);
    // The quick input widget uses this class
    await page.waitForSelector('.quick-input-widget', { timeout: 5000 });
}

test.describe('Layout Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('should register layout management commands', async ({ page }) => {
        // Open command palette
        await openCommandPalette(page);

        // Search for "Switch Workspace Layout" command
        await page.keyboard.type('Switch Workspace Layout');
        await page.waitForTimeout(1000);

        // Get the quick pick items
        const commandList = page.locator('.monaco-list-row');
        const count = await commandList.count();
        console.log(`Found ${count} items for "Switch Workspace Layout"`);

        // Log found commands
        for (let i = 0; i < Math.min(count, 5); i++) {
            const text = await commandList.nth(i).textContent();
            console.log(`Command ${i}:`, text?.trim());
        }

        // Check if the command appears
        const commandExists = count > 0;

        if (!commandExists) {
            console.log('Command not found. Checking all kb-view commands...');

            // Close and reopen
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            await openCommandPalette(page);

            // Search for kb-view commands
            await page.keyboard.type('kb-view');
            await page.waitForTimeout(1000);

            // Get all kb-view commands
            const kbViewList = page.locator('.monaco-list-row');
            const kbCount = await kbViewList.count();
            console.log(`Found ${kbCount} kb-view commands`);

            for (let i = 0; i < Math.min(kbCount, 10); i++) {
                const text = await kbViewList.nth(i).textContent();
                console.log(`KB View command ${i}:`, text?.trim());
            }
        }

        expect(commandExists, 'Switch Workspace Layout command should be registered').toBe(true);
    });

    test.skip('should have KB View menu with Layouts submenu', async ({ page }) => {
        // This test is skipped for now - will implement menu testing later
    });

    test.skip('should list built-in layouts', async ({ page }) => {
        // This test is skipped for now - requires commands to be working first
    });

    test.skip('should save and switch to custom layout', async ({ page }) => {
        // This test is skipped for now - requires commands to be working first
    });
});
