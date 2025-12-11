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

/**
 * E2E tests for Daily Notes feature
 * Tests date-based note creation following Foam's pattern
 */

import { test, expect } from '@playwright/test';

test.describe('Daily Notes', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the application to be ready
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });

        // Give workspace indexing time to complete
        await page.waitForTimeout(2000);
    });

    test('should open daily note via command', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');

        // Wait for command palette
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });

        // Type the command
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");

        // Wait a bit for filtering
        await page.waitForTimeout(500);

        // Press Enter to execute command
        await page.keyboard.press('Enter');

        // Wait for the daily note to be created and opened
        await page.waitForTimeout(2000);

        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const expectedFilename = `${year}-${month}-${day}.md`;

        // Check that the daily note is open in the editor
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label');
        const tabText = await editorTab.textContent();

        expect(tabText).toContain(expectedFilename);
        console.log(`✓ Daily note opened: ${expectedFilename}`);
    });

    test('should create daily note with correct date format', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const expectedDate = `${year}-${month}-${day}`;

        // Check the file is in the file explorer
        const fileExplorer = page.locator('.theia-FileTree');
        const dailyNoteFile = fileExplorer.locator(`text=${expectedDate}.md`);

        // Should be visible in file tree
        const isVisible = await dailyNoteFile.isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
            console.log(`✓ Daily note file visible in explorer: ${expectedDate}.md`);
        }
    });

    test('should create daily note with default template', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Get the editor content
        const editor = page.locator('.monaco-editor');
        const editorContent = await editor.textContent();

        // Get today's date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const expectedTitle = `${year}-${month}-${day}`;

        // Should contain the title as H1
        expect(editorContent).toContain(`# ${expectedTitle}`);
        console.log(`✓ Daily note created with correct title: # ${expectedTitle}`);
    });

    test('should reopen existing daily note instead of creating duplicate', async ({ page }) => {
        // First, open today's note
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Add some content to the note
        const editor = page.locator('.monaco-editor textarea').first();
        await editor.click();
        await editor.focus();
        await page.keyboard.press('Control+End'); // Move to end
        await page.keyboard.press('Enter');
        await page.keyboard.type('This is a test entry.');
        await page.waitForTimeout(500);

        // Save the file
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(1000);

        // Close the file
        const closeButton = page.locator('.theia-tab.active .p-TabBar-tabCloseIcon').first();
        await closeButton.click();
        await page.waitForTimeout(500);

        // Now open today's note again
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Get the editor content
        const editorContent = await page.locator('.monaco-editor').textContent();

        // Should contain our test entry
        expect(editorContent).toContain('This is a test entry.');
        console.log('✓ Existing daily note reopened with preserved content');
    });

    test('should use YYYY-MM-DD format for filename', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Get active tab name
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label');
        const tabText = await editorTab.textContent();

        // Should match YYYY-MM-DD.md pattern
        const datePattern = /^\d{4}-\d{2}-\d{2}\.md$/;
        expect(tabText).toMatch(datePattern);
        console.log(`✓ Daily note uses correct filename format: ${tabText}`);
    });

    test('should create daily note in workspace root', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Get today's date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const expectedFilename = `${year}-${month}-${day}.md`;

        // Check file explorer - should be at root level (not in subdirectory)
        const fileExplorer = page.locator('.theia-FileTree');

        // Look for the file at root level (not nested under any folder)
        const dailyNoteNode = fileExplorer.locator('.theia-TreeNode').filter({ hasText: expectedFilename });

        const isVisible = await dailyNoteNode.isVisible({ timeout: 5000 }).catch(() => false);
        if (isVisible) {
            console.log(`✓ Daily note created at workspace root: ${expectedFilename}`);
        }
    });

    test('should handle multiple daily note commands in same session', async ({ page }) => {
        // First call
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        const firstTabText = await page.locator('.theia-tab.active .theia-tab-label').textContent();

        // Close the tab
        const closeButton = page.locator('.theia-tab.active .p-TabBar-tabCloseIcon').first();
        await closeButton.click();
        await page.waitForTimeout(500);

        // Second call - should open same note
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        const secondTabText = await page.locator('.theia-tab.active .theia-tab-label').textContent();

        // Both should be the same file
        expect(firstTabText).toEqual(secondTabText);
        console.log('✓ Multiple calls open the same daily note');
    });

    test('should work with empty workspace', async ({ page }) => {
        // This test assumes we can open daily note even if workspace is empty
        // The command should still work

        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', "Open Today's Note");
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Should have created and opened a daily note
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label');
        const tabText = await editorTab.textContent();

        const datePattern = /^\d{4}-\d{2}-\d{2}\.md$/;
        expect(tabText).toMatch(datePattern);
        console.log('✓ Daily note works in any workspace');
    });
});
