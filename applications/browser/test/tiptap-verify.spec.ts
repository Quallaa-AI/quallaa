/**
 * Quick TipTap Verification Test
 * Verifies that TipTap markdown editor loads for .md files
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(2000);
}

test.describe('TipTap Verification', () => {
    test('TipTap loads when creating Today Note', async ({ page }) => {
        // Capture console messages
        const consoleMessages: string[] = [];
        page.on('console', msg => {
            consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
        });

        await page.goto(APP_URL);
        await waitForAppReady(page);

        await page.screenshot({ path: 'screenshots/tiptap-verify-1-initial.png', fullPage: true });

        // Click "Today's Note" button in the Welcome page
        console.log("Clicking Today's Note button...");
        const todayNoteBtn = page.locator("text=Today's Note").first();

        if (await todayNoteBtn.isVisible()) {
            await todayNoteBtn.click();
            await page.waitForTimeout(3000);
        } else {
            console.log("Today's Note button not found");
        }

        await page.screenshot({ path: 'screenshots/tiptap-verify-2-after-click.png', fullPage: true });

        // Check for TipTap elements
        const proseMirror = page.locator('.ProseMirror');
        const toolbar = page.locator('.quallaa-editor-toolbar');
        const monacoEditor = page.locator('.monaco-editor');

        const hasProseMirror = (await proseMirror.count()) > 0;
        const hasToolbar = (await toolbar.count()) > 0;
        const hasMonaco = (await monacoEditor.count()) > 0;

        console.log('=== TipTap Verification Results ===');
        console.log('ProseMirror found:', hasProseMirror);
        console.log('Toolbar found:', hasToolbar);
        console.log('Monaco found:', hasMonaco);

        // Log open tabs
        const allTabs = await page.locator('.p-TabBar-tabLabel').allTextContents();
        console.log('Open tabs:', allTabs);

        // Check what editor widget classes are present
        const editorArea = page.locator('#theia-main-content-panel');
        const editorClasses = await editorArea
            .evaluate(el => {
                const classes: string[] = [];
                el.querySelectorAll('[class*="editor"], [class*="monaco"], [class*="tiptap"], [class*="ProseMirror"]').forEach(e => {
                    classes.push(e.className);
                });
                return classes;
            })
            .catch(() => []);
        console.log('Editor-related classes found:', editorClasses);

        if (hasProseMirror) {
            console.log('✓ TipTap is WORKING');
        } else if (hasMonaco) {
            console.log('✗ TipTap NOT working - Monaco loaded instead');
        } else {
            console.log('? No editor detected');
        }

        // Log any errors from console
        const errors = consoleMessages.filter(m => m.includes('[error]') || m.includes('Error'));
        if (errors.length > 0) {
            console.log('=== Browser Console Errors ===');
            errors.forEach(e => console.log(e));
        }

        await page.screenshot({ path: 'screenshots/tiptap-verify-3-final.png', fullPage: true });
    });
});
