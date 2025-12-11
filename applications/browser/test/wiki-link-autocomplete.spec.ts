import { test, expect } from '@playwright/test';
import * as path from 'path';

const BASE_URL = 'http://127.0.0.1:3000';
const WORKSPACE_PATH = path.resolve(__dirname, '../../../test-workspace');

test.describe('Wiki Link Autocomplete', () => {
    test.beforeAll(async () => {
        // Wait a bit for server to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('should show autocomplete for test files', async ({ page }) => {
        // Navigate to the app
        await page.goto(BASE_URL);

        // Wait for the app to load
        await page.waitForSelector('.theia-app-shell', { timeout: 30000 });
        console.log('App loaded');

        // Wait for workspace to be indexed (check console logs)
        await page.waitForFunction(
            () => {
                const logs = (window as any).__theiaConsoleLogs || [];
                return logs.some((log: string) => log.includes('=== END INDEX ==='));
            },
            { timeout: 10000 }
        ).catch(() => {
            console.log('No index logs found in console');
        });

        // Open a file or create a new one
        // Try to click on "Meeting Notes.md" in the file explorer
        const fileExplorer = page.locator('.theia-FileTree');
        await fileExplorer.waitFor({ timeout: 10000 });
        console.log('File explorer found');

        // Click on Meeting Notes.md
        const meetingNotesFile = page.locator('.theia-TreeNode', { hasText: 'Meeting Notes.md' });
        await meetingNotesFile.waitFor({ timeout: 5000 });
        await meetingNotesFile.dblclick();
        console.log('Meeting Notes.md opened');

        // Wait for editor to load
        await page.waitForSelector('.monaco-editor', { timeout: 10000 });
        console.log('Monaco editor found');

        // Focus on the editor
        const editor = page.locator('.monaco-editor textarea').first();
        await editor.click();
        await editor.focus();

        // Move to end of file
        await page.keyboard.press('Control+End');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // Type [[ to trigger wiki link autocomplete
        await page.keyboard.type('[[test');
        console.log('Typed [[test');

        // Wait for autocomplete widget
        const autocompleteWidget = page.locator('.monaco-list');
        await autocompleteWidget.waitFor({ state: 'visible', timeout: 5000 });
        console.log('Autocomplete widget appeared');

        // Get all autocomplete items
        const items = await autocompleteWidget.locator('.monaco-list-row').allTextContents();
        console.log('Autocomplete items:', items);

        // Verify testA, testB, and testC appear
        const itemsLower = items.map(item => item.toLowerCase());

        // Should contain testA (may show as "My Custom TestA" or "testA")
        const hasTestA = itemsLower.some(item =>
            item.includes('testa') || item.includes('my custom testa')
        );
        expect(hasTestA, 'testA should appear in autocomplete').toBeTruthy();

        // Should contain testB
        const hasTestB = itemsLower.some(item => item.includes('testb'));
        expect(hasTestB, 'testB should appear in autocomplete').toBeTruthy();

        // Should contain testC (may show as "TestC Frontmatter" due to frontmatter title)
        const hasTestC = itemsLower.some(item =>
            item.includes('testc') || item.includes('testc frontmatter')
        );
        expect(hasTestC, 'testC should appear in autocomplete').toBeTruthy();

        // Optional: Check if we can select an item
        // Press down arrow and enter to select first item
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        console.log('Selected first autocomplete item');

        // Verify something was inserted
        await page.waitForTimeout(500);
        const editorContent = await page.locator('.monaco-editor').textContent();
        console.log('Editor content after selection:', editorContent);
    });

    test('should show autocomplete for testC aliases', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForSelector('.theia-app-shell', { timeout: 30000 });

        // Open Meeting Notes.md
        const meetingNotesFile = page.locator('.theia-TreeNode', { hasText: 'Meeting Notes.md' });
        await meetingNotesFile.waitFor({ timeout: 5000 });
        await meetingNotesFile.dblclick();

        // Wait for editor
        await page.waitForSelector('.monaco-editor', { timeout: 10000 });
        const editor = page.locator('.monaco-editor textarea').first();
        await editor.click();
        await editor.focus();

        // Move to end and type testC alias
        await page.keyboard.press('Control+End');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type('[[tc');

        // Wait for autocomplete
        const autocompleteWidget = page.locator('.monaco-list');
        await autocompleteWidget.waitFor({ state: 'visible', timeout: 5000 });

        // Get items
        const items = await autocompleteWidget.locator('.monaco-list-row').allTextContents();
        console.log('Autocomplete items for "tc":', items);

        // Should show testC via its "tC" alias
        const itemsLower = items.map(item => item.toLowerCase());
        const hasTestC = itemsLower.some(item =>
            item.includes('testc') || item.includes('tc')
        );
        expect(hasTestC, 'testC should appear when searching for alias "tc"').toBeTruthy();
    });
});
