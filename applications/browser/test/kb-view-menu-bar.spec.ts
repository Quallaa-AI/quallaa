/********************************************************************************
 * Copyright (C) 2025 Jeff Toffoli
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/

import { test, expect } from '@playwright/test';

test.describe('KB View Menu Bar', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
        await page.waitForTimeout(2000);
    });

    test('menu bar should be visible', async ({ page }) => {
        const menuBar = page.locator('#theia\\:menubar');
        await expect(menuBar).toBeVisible({ timeout: 10000 });
    });

    test('should list all menu items', async ({ page }) => {
        const menuBar = page.locator('#theia\\:menubar');
        await expect(menuBar).toBeVisible();

        // Get all menu items
        const menuItems = menuBar.locator('.p-MenuBar-item');
        const count = await menuItems.count();

        console.log('Total menu items:', count);

        // Get text of each menu item
        for (let i = 0; i < count; i++) {
            const text = await menuItems.nth(i).textContent();
            console.log(`Menu item ${i}:`, text?.trim());
        }

        expect(count).toBeGreaterThan(0);
    });

    test('should be able to click File menu', async ({ page }) => {
        const menuBar = page.locator('#theia\\:menubar');
        await expect(menuBar).toBeVisible();

        const fileMenu = menuBar.locator('text=File').first();
        await expect(fileMenu).toBeVisible();

        // Try to click the File menu
        await fileMenu.click();
        await page.waitForTimeout(500);

        // Check if dropdown appeared
        const menuDropdown = page.locator('.p-Menu-content');
        const dropdownVisible = await menuDropdown.isVisible().catch(() => false);

        console.log('File menu dropdown visible:', dropdownVisible);
        expect(dropdownVisible).toBe(true);
    });
});

test.describe('KB View Mode Switching via Command Palette', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
        await page.waitForTimeout(2000);
    });

    test('should open command palette with F1', async ({ page }) => {
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);

        const commandPalette = page.locator('.monaco-quick-open-widget');
        await expect(commandPalette).toBeVisible({ timeout: 5000 });
    });

    test('should find KB View commands in command palette', async ({ page }) => {
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);

        const commandPalette = page.locator('.monaco-quick-open-widget');
        await expect(commandPalette).toBeVisible();

        // Type "KB View" to search for commands
        await page.keyboard.type('KB View');
        await page.waitForTimeout(1000);

        // Get command results
        const commandList = page.locator('.monaco-list-row');
        const count = await commandList.count();

        console.log('KB View commands found:', count);

        // Log all commands
        for (let i = 0; i < Math.min(count, 10); i++) {
            const text = await commandList.nth(i).textContent();
            console.log(`Command ${i}:`, text?.trim());
        }

        expect(count).toBeGreaterThan(0);
    });

    test('should switch to KB View mode via command palette', async ({ page }) => {
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);

        await page.keyboard.type('Switch to KB View');
        await page.waitForTimeout(1000);

        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check if body has kb-view-mode class
        const body = page.locator('body');
        const hasKBViewClass = await body.evaluate(el => el.classList.contains('kb-view-mode'));

        console.log('Has kb-view-mode class:', hasKBViewClass);
        expect(hasKBViewClass).toBe(true);
    });

    test('should switch to Developer mode via command palette', async ({ page }) => {
        // First switch to KB View
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);
        await page.keyboard.type('Switch to KB View');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Now switch back to Developer mode
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);
        await page.keyboard.type('Switch to Developer');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check if body has developer-mode class
        const body = page.locator('body');
        const hasDeveloperClass = await body.evaluate(el => el.classList.contains('developer-mode'));

        console.log('Has developer-mode class:', hasDeveloperClass);
        expect(hasDeveloperClass).toBe(true);
    });

    test('should display KB widgets in KB View mode', async ({ page }) => {
        // Switch to KB View mode
        await page.keyboard.press('F1');
        await page.waitForTimeout(500);
        await page.keyboard.type('Switch to KB View');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // Check for TAGS widget
        const tagsWidget = page.locator('text=TAGS').first();
        const tagsVisible = await tagsWidget.isVisible().catch(() => false);
        console.log('TAGS widget visible:', tagsVisible);

        // Check for BACKLINKS widget
        const backlinksWidget = page.locator('text=BACKLINKS').first();
        const backlinksVisible = await backlinksWidget.isVisible().catch(() => false);
        console.log('BACKLINKS widget visible:', backlinksVisible);

        expect(tagsVisible || backlinksVisible).toBe(true);
    });
});
