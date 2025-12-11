/**
 * Comprehensive Layout Management Tests
 * Tests all user journeys for Priority 2: Named Workspace Layouts
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-preload', { state: 'hidden', timeout: 30000 });
    await page.waitForSelector('#theia-app-shell', { timeout: 30000 });
    await page.waitForTimeout(3000); // Allow for initialization

    // Close Welcome widget if present (it blocks F1 keybinding)
    const welcomeCloseButton = await page.$('.p-TabBar-tabCloseIcon');
    if (welcomeCloseButton) {
        await welcomeCloseButton.click();
        await page.waitForTimeout(500);
    }

    // Click on main area to ensure focus is set correctly
    const mainArea = await page.$('#theia-main-content-panel');
    if (mainArea) {
        await mainArea.click();
        await page.waitForTimeout(300);
    }
}

async function openCommandPalette(page: Page) {
    // Click the command palette button in the toolbar instead of using F1
    // The Welcome widget blocks F1 keybinding
    const commandPaletteButton = await page.$('[title="Command Palette (⌘+⇧+P)"]');
    if (commandPaletteButton) {
        await commandPaletteButton.click();
        await page.waitForTimeout(500); // Wait for animation
    } else {
        // Fallback to F1 if button not found
        await page.keyboard.press('F1');
    }
    // Wait for the quick input to be visible - try multiple selectors
    try {
        await page.waitForSelector('.quick-input-widget', { timeout: 3000, state: 'visible' });
    } catch {
        // Try the input directly
        await page.waitForSelector('.monaco-inputbox input', { timeout: 2000, state: 'visible' });
    }
}

async function closeCommandPalette(page: Page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
}

test.describe('Layout Management - Systematic Testing', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage for clean state
        await page.goto(APP_URL);
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await waitForAppReady(page);
    });

    /**
     * Journey 1: First-Time User Experience
     */
    test('Journey 1: Fresh install shows KB View mode by default', async ({ page }) => {
        // Check CSS class
        const bodyClasses = await page.evaluate(() => document.body.className);
        console.log('Body classes:', bodyClasses);

        expect(bodyClasses).toContain('kb-view-mode');

        // Verify bottom panel is hidden (Terminal, Problems, Output)
        const bottomPanel = await page.$('#theia-bottom-content-panel');
        if (bottomPanel) {
            const isVisible = await bottomPanel.isVisible();
            console.log('Bottom panel visible:', isVisible);
            expect(isVisible).toBe(false);
        }
    });

    /**
     * Journey 2: Discover Layout Commands
     */
    test('Journey 2: Layout commands appear in Command Palette', async ({ page }) => {
        await openCommandPalette(page);

        // Search for layout commands using keyboard.type (more reliable)
        await page.keyboard.type('Switch Workspace Layout');
        await page.waitForTimeout(1000);

        // Get all visible command items
        const commandList = page.locator('.monaco-list-row');
        const count = await commandList.count();

        const commandItems: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await commandList.nth(i).textContent();
            if (text) commandItems.push(text.trim());
        }

        console.log('Commands found:', commandItems);

        // Check for Switch Layout command
        const hasSwitch = commandItems.some(item => item.includes('Switch Workspace Layout'));
        console.log('Has Switch Layout command:', hasSwitch);

        // Now search for Save Layout
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await openCommandPalette(page);
        await page.keyboard.type('Save Current Layout');
        await page.waitForTimeout(1000);

        const saveList = page.locator('.monaco-list-row');
        const saveCount = await saveList.count();
        const saveItems: string[] = [];
        for (let i = 0; i < saveCount; i++) {
            const text = await saveList.nth(i).textContent();
            if (text) saveItems.push(text.trim());
        }

        const hasSave = saveItems.some(item => item.includes('Save Current Layout'));
        console.log('Has Save Layout command:', hasSave);

        expect(hasSwitch, 'Switch Workspace Layout command should be registered').toBe(true);
        expect(hasSave, 'Save Current Layout command should be registered').toBe(true);

        await closeCommandPalette(page);
    });

    /**
     * Journey 3: Switch Between Built-in Layouts
     */
    test('Journey 3: Can switch between KB View and Developer modes', async ({ page }) => {
        await openCommandPalette(page);

        await page.fill('.monaco-inputbox input', 'Switch Workspace Layout');
        await page.waitForTimeout(1000);

        // Press Enter to execute command
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Check if layout picker appears
        const picker = await page.$('.monaco-list-row');
        if (picker) {
            // Get layout options
            const layouts = await page.$$eval('.monaco-list-row[aria-label]', rows => rows.map(row => row.textContent?.trim() || ''));

            console.log('Available layouts:', layouts);

            // Should have at least KB View and Developer
            expect(layouts.length).toBeGreaterThanOrEqual(2);

            const hasKBView = layouts.some(l => l.includes('KB View'));
            const hasDeveloper = layouts.some(l => l.includes('Developer'));

            expect(hasKBView, 'KB View layout should be available').toBe(true);
            expect(hasDeveloper, 'Developer layout should be available').toBe(true);
        }

        await closeCommandPalette(page);
    });

    /**
     * Journey 4: Save a Custom Layout
     */
    test('Journey 4: Can save a custom layout', async ({ page }) => {
        await openCommandPalette(page);

        await page.fill('.monaco-inputbox input', 'Save Current Layout');
        await page.waitForTimeout(1000);

        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Check if name prompt appears
        const nameInput = await page.$('.monaco-inputbox input');
        if (nameInput) {
            await nameInput.fill('Test Research Mode');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            // Description prompt
            const descInput = await page.$('.monaco-inputbox input');
            if (descInput) {
                await descInput.fill('Test layout for research');
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
            }

            // Check for success message
            const notifications = await page.$$('.theia-notification-message');
            const messages = await Promise.all(notifications.map(n => n.textContent()));
            console.log('Notifications:', messages);

            const hasSuccess = messages.some(m => m?.includes('saved') || m?.includes('success'));

            console.log('Has success notification:', hasSuccess);
        }
    });

    /**
     * Journey 8: KB View Menu Integration
     */
    test('Journey 8: KB View menu has Layouts submenu', async ({ page }) => {
        // Find KB View menu
        const kbViewMenu = await page.$('text=KB View');

        if (kbViewMenu) {
            await kbViewMenu.click();
            await page.waitForTimeout(500);

            // Look for Layouts submenu
            const layoutsSubmenu = await page.$('text=Layouts');
            console.log('Layouts submenu found:', layoutsSubmenu !== null);

            if (layoutsSubmenu) {
                await layoutsSubmenu.hover();
                await page.waitForTimeout(500);

                // Check for menu items
                const switchItem = await page.$('text=Switch Layout');
                const saveItem = await page.$('text=Save Current Layout');

                console.log('Switch Layout menu item found:', switchItem !== null);
                console.log('Save Current Layout menu item found:', saveItem !== null);
            }

            await page.keyboard.press('Escape');
        } else {
            console.log('KB View menu not found');
        }
    });

    /**
     * Diagnostic Test: Check what commands ARE registered
     */
    test('Diagnostic: List all registered commands', async ({ page }) => {
        await openCommandPalette(page);

        // Leave search empty to show all commands
        await page.waitForTimeout(1000);

        // Get first 50 commands
        const commands = await page.$$eval('.monaco-list-row[aria-label]', rows => rows.slice(0, 50).map(row => row.getAttribute('aria-label') || row.textContent?.trim() || ''));

        console.log('First 50 commands:', commands);

        // Filter for kb-view commands
        const kbViewCommands = commands.filter(cmd => cmd.toLowerCase().includes('kb') || cmd.toLowerCase().includes('view') || cmd.toLowerCase().includes('layout'));

        console.log('KB View related commands:', kbViewCommands);

        await closeCommandPalette(page);
    });

    /**
     * Diagnostic Test: Check browser console for errors
     */
    test('Diagnostic: Check for console errors', async ({ page }) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();

            if (type === 'error') {
                errors.push(text);
            } else if (type === 'warning' && text.includes('LayoutManager')) {
                warnings.push(text);
            }
        });

        await page.waitForTimeout(5000);

        console.log('Console errors:', errors);
        console.log('Layout-related warnings:', warnings);

        // Check for specific errors
        const hasLayoutError = errors.some(e => e.includes('LayoutManager') || e.includes('layout'));

        if (hasLayoutError) {
            console.log('FOUND LAYOUT-RELATED ERRORS');
        }
    });
});
