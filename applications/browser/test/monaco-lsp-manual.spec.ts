/**
 * Manual test for Monaco LSP integration
 * Opens an existing file to verify Source mode works with MonacoEditorProvider
 */

import { test, expect } from '@playwright/test';

test.describe('Monaco LSP Manual Test', () => {
    test('should load and edit file in Source mode with LSP', async ({ page }) => {
        console.log('📝 Starting manual LSP test...');

        // Navigate to the application
        await page.goto('http://localhost:3000');
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
        await page.waitForTimeout(4000);
        console.log('✅ App loaded');

        // Open File menu
        await page.click('text=File');
        await page.waitForTimeout(500);

        // Click "Open File..."
        await page.click('text=Open File...');
        await page.waitForTimeout(1000);

        // Type the file path in the quick input
        await page.keyboard.type('lsp-test.md');
        await page.waitForTimeout(500);

        // Press Enter to open
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check if editor opened - try both Preview and Source selectors
        const editorVisible = await page
            .locator('.quallaa-markdown-editor')
            .isVisible({ timeout: 5000 })
            .catch(() => false);

        if (!editorVisible) {
            console.log('⚠️  Editor not visible, taking screenshot for debugging');
            await page.screenshot({ path: 'test-results/debug-no-editor.png' });
            throw new Error('Editor did not open');
        }

        console.log('✅ Editor opened');

        // Toggle to Source mode if not already there
        const sourceButton = page.locator('.quallaa-editor-toolbar button:has-text("Source")');
        if (await sourceButton.isVisible({ timeout: 2000 })) {
            console.log('📝 Switching to Source mode...');
            await sourceButton.click();
            await page.waitForTimeout(1000);
        }

        // Wait for Monaco editor
        await page.waitForSelector('.monaco-editor', { timeout: 10000 });
        console.log('✅ Monaco editor loaded');

        // Check for console errors
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter out known benign errors
                if (!text.includes('punycode') && !text.includes('local plugin') && !text.includes('favicon')) {
                    errors.push(text);
                }
            }
        });

        // Wait for any async initialization
        await page.waitForTimeout(2000);

        // Check for critical errors
        if (errors.length > 0) {
            console.error('❌ Console errors detected:', errors);
            throw new Error(`Found ${errors.length} console errors`);
        }
        console.log('✅ No critical console errors');

        // Verify Monaco editor features
        const lineNumbers = page.locator('.line-numbers');
        await expect(lineNumbers).toBeVisible();
        console.log('✅ Line numbers visible');

        // Verify content is loaded
        const viewLines = page.locator('.view-line');
        const lineCount = await viewLines.count();
        expect(lineCount).toBeGreaterThan(0);
        console.log(`✅ Content loaded (${lineCount} lines)`);

        // Click at end of first line and add text
        await page.locator('.view-line').first().click();
        await page.keyboard.press('End');
        await page.keyboard.type('\n\nAdded in test!');
        await page.waitForTimeout(500);

        // Verify new content appears
        const content = await page.locator('.view-lines').textContent();
        expect(content).toContain('Added in test!');
        console.log('✅ Content successfully edited');

        // Toggle back to Preview mode
        const previewButton = page.locator('.quallaa-editor-toolbar button:has-text("Preview")');
        if (await previewButton.isVisible({ timeout: 2000 })) {
            await previewButton.click();
            await page.waitForTimeout(1000);

            // Verify content preserved
            const previewContent = await page.locator('.ProseMirror').textContent();
            expect(previewContent).toContain('Added in test!');
            console.log('✅ Content preserved in Preview mode');
        }

        console.log('✅ ✅ ✅ Monaco LSP manual test PASSED!');
    });
});
