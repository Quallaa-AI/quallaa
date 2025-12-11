import { test, expect } from '@playwright/test';
import { TheiaApp } from '@theia/playwright';

test.describe('Wiki Link Creation', () => {
    let app: TheiaApp;

    test.beforeAll(async ({ browser, playwright }) => {
        const ws = await playwright.request.newContext();
        app = await TheiaApp.loadApp({ browser }, ws, {
            waitForWorkspace: true,
        });
    });

    test.afterAll(async () => {
        await app.page.close();
    });

    test('should create a new note when clicking on a broken wiki link', async () => {
        // Create a test file with a broken wiki link
        const editor = await app.openEditor('test-wiki-creation.md');
        await editor.replaceLineWithLineNumber('# Test', 1);
        await editor.addLineToPosition('', 2);
        await editor.addLineToPosition('Click this link: [[BrandNewNote]]', 3);
        await editor.save();

        // Wait for wiki links to be processed
        await app.page.waitForTimeout(1000);

        // Find the wiki link - it should be underlined by Monaco's link provider
        // Try to click on the wiki link text
        const editorElement = app.page.locator('.monaco-editor');
        await editorElement.click();

        // Position cursor on the wiki link
        await app.page.keyboard.press('Control+f');
        await app.page.keyboard.type('BrandNewNote');
        await app.page.keyboard.press('Escape');

        // Cmd+Click or Ctrl+Click on the link
        const isMac = process.platform === 'darwin';
        if (isMac) {
            await app.page.keyboard.down('Meta');
        } else {
            await app.page.keyboard.down('Control');
        }

        // Click in the middle of the word
        const linkElement = editorElement.locator('text=BrandNewNote').first();
        await linkElement.click({ force: true });

        if (isMac) {
            await app.page.keyboard.up('Meta');
        } else {
            await app.page.keyboard.up('Control');
        }

        // Wait for the new note to be created and opened
        await app.page.waitForTimeout(2000);

        // Check if the new file was created and opened
        const activeTab = await app.page.locator('.theia-tab.active .theia-tab-label').textContent();
        expect(activeTab).toContain('BrandNewNote');

        // Verify the content has the default header
        const content = await editor.textContent();
        expect(content).toContain('# BrandNewNote');
    });
});
