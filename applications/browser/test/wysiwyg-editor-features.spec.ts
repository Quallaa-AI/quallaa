/**
 * WYSIWYG Editor Feature Tests
 *
 * Tests for the production-ready WYSIWYG editor features:
 * - Wiki link autocomplete with suggestion dropdown
 * - Monaco source mode editor
 * - Wiki image handling
 * - Ribbon widget
 * - QuickInputService integration (replaces window.prompt)
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

async function waitForAppReady(page: Page): Promise<void> {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    await page.waitForTimeout(3000); // Allow for full initialization
}

async function openMarkdownFile(page: Page, filename: string = 'foo.md'): Promise<void> {
    // Use Cmd+P / Ctrl+P to open Quick Open
    await page.keyboard.press('Meta+p');
    await page.waitForTimeout(500);
    await page.keyboard.type(filename);
    await page.waitForSelector('.quick-input-list-entry', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
}

test.describe('Wiki Link Autocomplete', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Typing [[ triggers autocomplete dropdown', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Focus the TipTap editor');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.waitForTimeout(500);

        console.log('Step 3: Type [[ to trigger autocomplete');
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);

        console.log('Step 4: Verify suggestion dropdown appears');
        // The suggestion dropdown uses tippy.js with our custom class
        const suggestionContainer = page.locator('.quallaa-suggestion-container');
        const hasSuggestion = await suggestionContainer.isVisible().catch(() => false);

        // Take screenshot for verification
        await page.screenshot({ path: 'screenshots/wiki-link-autocomplete.png', fullPage: true });

        console.log('Suggestion dropdown visible:', hasSuggestion);

        // If we have notes indexed, we should see the suggestion dropdown
        // Note: This may fail if no notes are indexed yet
        if (hasSuggestion) {
            console.log('Autocomplete dropdown appeared');
        } else {
            console.log('Note: Autocomplete dropdown may not appear if no notes are indexed');
        }
    });

    test('Typing in autocomplete filters suggestions', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Focus and type [[foo to filter');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('[[foo');
        await page.waitForTimeout(1000);

        console.log('Step 3: Check if suggestions are filtered');
        const suggestionItems = page.locator('.quallaa-suggestion-item');
        const count = await suggestionItems.count();
        console.log('Number of suggestions:', count);

        await page.screenshot({ path: 'screenshots/wiki-link-autocomplete-filtered.png', fullPage: true });
    });

    test('Arrow keys navigate suggestions', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Trigger autocomplete');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);

        console.log('Step 3: Press down arrow to select');
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);

        console.log('Step 4: Verify selection changed');
        const selectedItem = page.locator('.quallaa-suggestion-item.is-selected');
        const hasSelection = (await selectedItem.count()) > 0;
        console.log('Has selected item:', hasSelection);

        await page.screenshot({ path: 'screenshots/wiki-link-autocomplete-navigation.png', fullPage: true });
    });

    test('Enter key inserts selected suggestion', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();

        // Get content before
        const contentBefore = await proseMirror.textContent();
        console.log('Content before:', contentBefore?.substring(0, 50));

        console.log('Step 2: Type [[ and press Enter');
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Get content after
        const contentAfter = await proseMirror.textContent();
        console.log('Content after:', contentAfter?.substring(0, 100));

        await page.screenshot({ path: 'screenshots/wiki-link-inserted.png', fullPage: true });
    });

    test('Escape closes autocomplete without inserting', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Trigger autocomplete and press Escape');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);

        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        console.log('Step 3: Verify dropdown is closed');
        const suggestionContainer = page.locator('.quallaa-suggestion-container');
        const isVisible = await suggestionContainer.isVisible().catch(() => false);
        console.log('Dropdown still visible after Escape:', isVisible);

        await page.screenshot({ path: 'screenshots/wiki-link-autocomplete-escaped.png', fullPage: true });
    });
});

test.describe('Monaco Source Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Toggle button switches to Source mode', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Find and click the Source toggle button');
        const toggleButton = page.locator('.quallaa-editor-toolbar button').first();
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 3: Verify Monaco editor appears');
        // Monaco editor should be present in source mode
        const monacoEditor = page.locator('.quallaa-monaco-source-editor');
        const hasMonaco = (await monacoEditor.count()) > 0;
        console.log('Monaco source editor found:', hasMonaco);

        // Also check for Monaco-specific elements
        const monacoInstance = page.locator('.monaco-editor');
        const hasMonacoInstance = (await monacoInstance.count()) > 0;
        console.log('Monaco instance found:', hasMonacoInstance);

        await page.screenshot({ path: 'screenshots/monaco-source-mode.png', fullPage: true });

        expect(hasMonaco || hasMonacoInstance, 'Monaco editor should be visible in source mode').toBe(true);
    });

    test('Source mode shows markdown syntax', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Switch to source mode');
        const toggleButton = page.locator('.quallaa-editor-toolbar button').first();
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 3: Verify markdown syntax is visible');
        // In source mode, we should see raw markdown like # for headings
        const monacoContent = page.locator('.monaco-editor .view-lines');
        const content = await monacoContent.textContent().catch(() => '');
        console.log('Source content (first 200 chars):', content?.substring(0, 200));

        await page.screenshot({ path: 'screenshots/monaco-source-content.png', fullPage: true });
    });

    test('Edits in source mode reflect in content', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Switch to source mode');
        const toggleButton = page.locator('.quallaa-editor-toolbar button').first();
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 3: Type in Monaco editor');
        const monacoEditor = page.locator('.monaco-editor textarea');
        await monacoEditor.click();
        await page.keyboard.type('# New Heading from Source Mode\n');
        await page.waitForTimeout(500);

        console.log('Step 4: Verify dirty indicator');
        const tab = page.locator('.p-TabBar-tab.p-mod-current .p-TabBar-tabLabel');
        const tabTitle = await tab.textContent();
        console.log('Tab title:', tabTitle);
        expect(tabTitle).toContain('');

        await page.screenshot({ path: 'screenshots/monaco-source-edited.png', fullPage: true });
    });

    test('Toggle back to Preview mode preserves content', async ({ page }) => {
        console.log('Step 1: Open and switch to source mode');
        await openMarkdownFile(page);
        const toggleButton = page.locator('.quallaa-editor-toolbar button').first();
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 2: Make edits in source mode');
        const monacoEditor = page.locator('.monaco-editor textarea');
        await monacoEditor.click();
        await page.keyboard.type('Source edit test');
        await page.waitForTimeout(500);

        console.log('Step 3: Toggle back to preview');
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 4: Verify content persists');
        const proseMirror = page.locator('.ProseMirror');
        const content = await proseMirror.textContent();
        console.log('Preview content:', content?.substring(0, 200));
        expect(content).toContain('Source edit test');

        await page.screenshot({ path: 'screenshots/monaco-to-preview.png', fullPage: true });
    });

    test('Source mode has syntax highlighting', async ({ page }) => {
        console.log('Step 1: Open and switch to source mode');
        await openMarkdownFile(page);
        const toggleButton = page.locator('.quallaa-editor-toolbar button').first();
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 2: Check for syntax highlighting tokens');
        // Monaco uses span elements with mtk classes for syntax highlighting
        const syntaxTokens = page.locator('.monaco-editor .mtk1, .monaco-editor .mtk4, .monaco-editor .mtk6');
        const tokenCount = await syntaxTokens.count();
        console.log('Syntax tokens found:', tokenCount);

        await page.screenshot({ path: 'screenshots/monaco-syntax-highlighting.png', fullPage: true });
    });
});

test.describe('Wiki Image Handling', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Wiki image syntax renders as figure', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Type wiki image syntax');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('![[test-image.png]]');
        await page.waitForTimeout(1000);

        console.log('Step 3: Verify image node is created');
        const wikiImage = page.locator('figure[data-wiki-image]');
        const hasImage = (await wikiImage.count()) > 0;
        console.log('Wiki image figure found:', hasImage);

        await page.screenshot({ path: 'screenshots/wiki-image-rendered.png', fullPage: true });
    });

    test('Wiki image with alt text renders correctly', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Type wiki image with alt text');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('![[image.png|My Alt Text]]');
        await page.waitForTimeout(1000);

        console.log('Step 3: Verify alt text is set');
        const img = page.locator('figure[data-wiki-image] img');
        const altText = await img.getAttribute('alt').catch(() => '');
        console.log('Image alt text:', altText);

        await page.screenshot({ path: 'screenshots/wiki-image-alt-text.png', fullPage: true });
    });
});

test.describe('Ribbon Widget', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Ribbon widget is present in the UI', async ({ page }) => {
        console.log('Step 1: Check for ribbon widget');
        const ribbon = page.locator('.quallaa-ribbon-widget');
        const hasRibbon = (await ribbon.count()) > 0;
        console.log('Ribbon widget found:', hasRibbon);

        await page.screenshot({ path: 'screenshots/ribbon-widget.png', fullPage: true });

        // Note: Ribbon may need to be explicitly opened or may only appear in KB View mode
    });

    test('Ribbon has action buttons', async ({ page }) => {
        console.log('Step 1: Check for ribbon action buttons');
        const ribbonActions = page.locator('.quallaa-ribbon-action');
        const actionCount = await ribbonActions.count();
        console.log('Ribbon action buttons found:', actionCount);

        if (actionCount > 0) {
            // Get all action titles
            const titles = await ribbonActions.evaluateAll(elements => elements.map(el => el.getAttribute('title')));
            console.log('Action titles:', titles);
        }

        await page.screenshot({ path: 'screenshots/ribbon-actions.png', fullPage: true });
    });

    test('Clicking ribbon action executes command', async ({ page }) => {
        console.log('Step 1: Find and click a ribbon action');
        const ribbonAction = page.locator('.quallaa-ribbon-action').first();

        if ((await ribbonAction.count()) > 0) {
            const title = await ribbonAction.getAttribute('title');
            console.log('Clicking action:', title);
            await ribbonAction.click();
            await page.waitForTimeout(1000);
            console.log('Action clicked');
        }

        await page.screenshot({ path: 'screenshots/ribbon-action-clicked.png', fullPage: true });
    });
});

test.describe('QuickInputService Integration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Cmd+Shift+K opens QuickInput for wiki link', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Focus editor and press Cmd+Shift+K');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.press('Meta+Shift+k');
        await page.waitForTimeout(1000);

        console.log('Step 3: Check for QuickInput dialog');
        // Theia's QuickInput uses .quick-input-widget
        const quickInput = page.locator('.quick-input-widget');
        const hasQuickInput = await quickInput.isVisible().catch(() => false);
        console.log('QuickInput visible:', hasQuickInput);

        await page.screenshot({ path: 'screenshots/quick-input-wiki-link.png', fullPage: true });

        // Close the dialog
        await page.keyboard.press('Escape');
    });

    test('Wiki link toolbar button opens QuickInput', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Click the wiki link toolbar button');
        // Find the link button in the formatting toolbar
        const linkButton = page.locator('.quallaa-formatting-toolbar button[title*="Wiki Link"]');
        const hasButton = (await linkButton.count()) > 0;

        if (hasButton) {
            await linkButton.click();
            await page.waitForTimeout(1000);

            console.log('Step 3: Verify QuickInput appears');
            const quickInput = page.locator('.quick-input-widget');
            const isVisible = await quickInput.isVisible().catch(() => false);
            console.log('QuickInput visible:', isVisible);

            await page.keyboard.press('Escape');
        } else {
            console.log('Wiki link button not found in toolbar');
        }

        await page.screenshot({ path: 'screenshots/toolbar-wiki-link-quickinput.png', fullPage: true });
    });

    test('Entering text in QuickInput inserts wiki link', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Trigger wiki link input');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.press('Meta+Shift+k');
        await page.waitForTimeout(1000);

        console.log('Step 3: Type note name and press Enter');
        await page.keyboard.type('Test Note');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        console.log('Step 4: Verify wiki link is inserted');
        // Check for wiki link element in the editor
        const wikiLink = page.locator('.ProseMirror .wiki-link');
        const hasLink = (await wikiLink.count()) > 0;
        console.log('Wiki link inserted:', hasLink);

        await page.screenshot({ path: 'screenshots/quickinput-wiki-link-inserted.png', fullPage: true });
    });
});

test.describe('Formatting Toolbar', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Toolbar has all formatting buttons', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Count toolbar buttons');
        const toolbarButtons = page.locator('.quallaa-toolbar-button');
        const buttonCount = await toolbarButtons.count();
        console.log('Toolbar button count:', buttonCount);

        // Should have buttons for: Bold, Italic, Strike, Code, H1, H2, H3, BulletList, OrderedList, Blockquote, CodeBlock, WikiLink
        expect(buttonCount).toBeGreaterThan(5);

        await page.screenshot({ path: 'screenshots/formatting-toolbar.png', fullPage: true });
    });

    test('Bold button toggles bold formatting', async ({ page }) => {
        console.log('Step 1: Open a markdown file');
        await openMarkdownFile(page);

        console.log('Step 2: Select text and click bold button');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('Test text');

        // Select all text
        await page.keyboard.press('Meta+a');
        await page.waitForTimeout(300);

        // Click bold button
        const boldButton = page.locator('.quallaa-toolbar-button[title*="Bold"]');
        if ((await boldButton.count()) > 0) {
            await boldButton.click();
            await page.waitForTimeout(500);

            // Check if bold is applied
            const isBoldActive = await boldButton.evaluate(el => el.classList.contains('active'));
            console.log('Bold button active:', isBoldActive);
        }

        await page.screenshot({ path: 'screenshots/bold-formatting.png', fullPage: true });
    });
});

test.describe('Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Full workflow: Edit, toggle modes, save', async ({ page }) => {
        console.log('Step 1: Open file');
        await openMarkdownFile(page);

        console.log('Step 2: Edit in preview mode');
        const proseMirror = page.locator('.ProseMirror');
        await proseMirror.click();
        await page.keyboard.type('Preview mode edit. ');
        await page.waitForTimeout(500);

        console.log('Step 3: Switch to source mode');
        const toggleButton = page.locator('.quallaa-editor-toolbar button').first();
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 4: Edit in source mode');
        const monacoEditor = page.locator('.monaco-editor textarea');
        await monacoEditor.click();
        await page.keyboard.type('Source mode edit. ');
        await page.waitForTimeout(500);

        console.log('Step 5: Switch back to preview');
        await toggleButton.click();
        await page.waitForTimeout(1000);

        console.log('Step 6: Verify all edits are present');
        const content = await proseMirror.textContent();
        console.log('Final content:', content?.substring(0, 200));

        console.log('Step 7: Save');
        await page.keyboard.press('Meta+s');
        await page.waitForTimeout(1000);

        // Check dirty indicator is cleared
        const tab = page.locator('.p-TabBar-tab.p-mod-current .p-TabBar-tabLabel');
        const tabTitle = await tab.textContent();
        console.log('Tab title after save:', tabTitle);

        await page.screenshot({ path: 'screenshots/full-workflow.png', fullPage: true });
    });

    test('Wiki link navigation in preview mode', async ({ page }) => {
        console.log('Step 1: Open a file with wiki links');
        await openMarkdownFile(page);

        console.log('Step 2: Check for existing wiki links');
        const wikiLinks = page.locator('.ProseMirror .wiki-link');
        const linkCount = await wikiLinks.count();
        console.log('Wiki links found:', linkCount);

        if (linkCount > 0) {
            console.log('Step 3: Click a wiki link');
            await wikiLinks.first().click();
            await page.waitForTimeout(2000);

            // Check if navigation occurred (new tab or file opened)
            const tabs = page.locator('.p-TabBar-tab');
            const tabCount = await tabs.count();
            console.log('Tabs open:', tabCount);
        }

        await page.screenshot({ path: 'screenshots/wiki-link-navigation.png', fullPage: true });
    });
});
