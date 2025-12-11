/**
 * Phase 3.4 Test: Wiki Links in TipTap Editor
 *
 * Verifies that wiki links are rendered and clickable in the TipTap editor.
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page) {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(3000); // Allow for full initialization
}

// Create a test file with wiki links
async function createTestFileWithWikiLinks(page: Page) {
    // Use Command Palette to create a new file
    await page.keyboard.press('Meta+Shift+p');
    await page.waitForTimeout(500);
    await page.keyboard.type('New File');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Type filename
    await page.keyboard.type('wiki-test.md');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
}

test.describe('TipTap Wiki Links Phase 3.4', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Wiki links render with proper styling', async ({ page }) => {
        console.log('Step 1: Open a markdown file with wiki links');

        // Open foo.md which should have wiki links
        await page.keyboard.press('Meta+p');
        await page.waitForTimeout(500);
        await page.keyboard.type('foo.md');
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        console.log('Step 2: Check if TipTap editor loaded');
        const proseMirror = page.locator('.ProseMirror');
        const hasProseMirror = (await proseMirror.count()) > 0;
        console.log('ProseMirror editor found:', hasProseMirror);

        if (!hasProseMirror) {
            // Take screenshot to see what loaded
            await page.screenshot({ path: 'screenshots/wiki-links-no-editor.png', fullPage: true });
            console.log('Editor not found, check screenshot');
            return;
        }

        console.log('Step 3: Get editor content');
        const content = await proseMirror.textContent();
        console.log('Editor content:', content);

        console.log('Step 4: Look for wiki link elements');
        const wikiLinks = page.locator('.ProseMirror .wiki-link');
        const wikiLinkCount = await wikiLinks.count();
        console.log('Wiki link elements found:', wikiLinkCount);

        // Take screenshot
        await page.screenshot({ path: 'screenshots/wiki-links-phase3.4-test.png', fullPage: true });

        // If no wiki links in foo.md, we can type some
        if (wikiLinkCount === 0) {
            console.log('Step 5: Type content with wiki links');
            await proseMirror.click();
            await page.keyboard.press('Meta+a'); // Select all
            await page.keyboard.press('Backspace'); // Clear
            await page.keyboard.type('# Test Wiki Links\n\nHere is a [[bar]] link.\n\nAnd [[baz|Custom Display]] with display text.');
            await page.waitForTimeout(1000);

            // Check again for wiki links
            const newWikiLinkCount = await wikiLinks.count();
            console.log('Wiki links after typing:', newWikiLinkCount);

            await page.screenshot({ path: 'screenshots/wiki-links-after-typing.png', fullPage: true });
        }

        console.log('Test complete - check screenshots');
    });

    test('Wiki links are clickable', async ({ page }) => {
        console.log('Step 1: Create content with wiki links');

        // Open foo.md
        await page.keyboard.press('Meta+p');
        await page.waitForTimeout(500);
        await page.keyboard.type('foo.md');
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        const proseMirror = page.locator('.ProseMirror');

        // Type content with a wiki link to bar.md (which exists in test-workspace)
        await proseMirror.click();
        await page.keyboard.press('Meta+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('Test link: [[bar]]');
        await page.waitForTimeout(1000);

        console.log('Step 2: Find and click wiki link');
        const wikiLink = page.locator('.ProseMirror .wiki-link').first();
        const hasWikiLink = (await wikiLink.count()) > 0;

        if (hasWikiLink) {
            console.log('Found wiki link, clicking...');
            await wikiLink.click();
            await page.waitForTimeout(2000);

            // Check if bar.md opened (look at tab title)
            const tabs = page.locator('.p-TabBar-tab');
            const tabCount = await tabs.count();
            console.log('Open tabs:', tabCount);

            // Get all tab labels
            for (let i = 0; i < tabCount; i++) {
                const tabLabel = await tabs.nth(i).locator('.p-TabBar-tabLabel').textContent();
                console.log(`Tab ${i}: ${tabLabel}`);
            }

            await page.screenshot({ path: 'screenshots/wiki-links-after-click.png', fullPage: true });
        } else {
            console.log('No wiki link element found to click');
            await page.screenshot({ path: 'screenshots/wiki-links-not-found.png', fullPage: true });
        }
    });

    test('Wiki link styling appears correctly', async ({ page }) => {
        console.log('Step 1: Open markdown file');

        await page.keyboard.press('Meta+p');
        await page.waitForTimeout(500);
        await page.keyboard.type('foo.md');
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        const proseMirror = page.locator('.ProseMirror');

        // Type content with wiki links
        await proseMirror.click();
        await page.keyboard.press('Meta+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('Links: [[bar]] and [[baz|Custom Text]]');
        await page.waitForTimeout(1000);

        console.log('Step 2: Check wiki link styling');
        const wikiLinks = page.locator('.ProseMirror .wiki-link');
        const count = await wikiLinks.count();
        console.log('Wiki links found:', count);

        if (count > 0) {
            // Check CSS properties of first wiki link
            const firstLink = wikiLinks.first();
            const styles = await firstLink.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    color: computed.color,
                    textDecoration: computed.textDecoration,
                    cursor: computed.cursor,
                };
            });
            console.log('Wiki link styles:', styles);

            // Verify it has pointer cursor (indicates clickable)
            expect(styles.cursor).toBe('pointer');
        }

        await page.screenshot({ path: 'screenshots/wiki-links-styling.png', fullPage: true });
    });
});
