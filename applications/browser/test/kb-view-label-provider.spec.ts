/********************************************************************************
 * Copyright (C) 2025 Jeff Toffoli
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/

import { test, expect } from '@playwright/test';

test.describe('KB View Label Provider (Phase 2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    });

    test('should hide .md extensions in KB View mode', async ({ page }) => {
        // First switch to KB View mode
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');
        await page.keyboard.press('Enter');

        // Wait for mode to change
        await page.waitForTimeout(1000);

        // Verify body has kb-view-mode class
        const body = await page.locator('body');
        const hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        expect(hasKBViewMode).toBe(true);

        // TODO: Create a test markdown file and verify its label doesn't show .md extension
        // This requires workspace setup which we don't have currently
    });

    test('should show .md extensions in Developer mode', async ({ page }) => {
        // Developer mode is the default
        const body = await page.locator('body');
        const hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));
        expect(hasDevMode).toBe(true);

        // TODO: Create a test markdown file and verify its label shows .md extension
        // This requires workspace setup which we don't have currently
    });

    test('should refresh labels when mode changes', async ({ page }) => {
        // Switch to KB View
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Switch back to Developer
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to Developer Mode');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Verify we're back in Developer mode
        const body = await page.locator('body');
        const hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));
        expect(hasDevMode).toBe(true);
    });

    test('should toggle between modes', async ({ page }) => {
        // Use toggle command
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Toggle KB View / Developer Mode');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should be in KB View now
        let body = await page.locator('body');
        let hasKBViewMode = await body.evaluate(el => el.classList.contains('kb-view-mode'));
        expect(hasKBViewMode).toBe(true);

        // Toggle again
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Toggle KB View / Developer Mode');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should be back in Developer mode
        body = await page.locator('body');
        const hasDevMode = await body.evaluate(el => el.classList.contains('developer-mode'));
        expect(hasDevMode).toBe(true);
    });

    test('should use note icon for markdown files in KB View mode', async ({ page }) => {
        // Switch to KB View
        await page.keyboard.press('Meta+Shift+p');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Switch to KB View Mode');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // TODO: Verify markdown files show codicon-note icon
        // This requires workspace setup with markdown files
    });
});
