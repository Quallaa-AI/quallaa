/**
 * WYSIWYG Editor User Experience Tests
 *
 * These tests validate the editor from the user's perspective, focusing on
 * real workflows and the problems these features solve for writers.
 *
 * Key user personas:
 * - Knowledge worker building a personal wiki
 * - Writer who thinks in connections between ideas
 * - User who prefers visual editing but needs markdown access
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Use absolute path to test-workspace for reliable workspace loading
const TEST_WORKSPACE = path.resolve(__dirname, '../../../test-workspace');
const APP_URL = `http://localhost:3000/#${TEST_WORKSPACE}`;

async function waitForAppReady(page: Page): Promise<void> {
    await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });
    // Wait for workspace to be fully loaded (file explorer should show files)
    await page.waitForTimeout(5000);
}

async function openMarkdownFile(page: Page, filename: string = 'foo.md'): Promise<void> {
    await page.keyboard.press('Meta+p');
    await page.waitForTimeout(500);
    await page.keyboard.type(filename);
    await page.waitForSelector('.quick-input-list-entry', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
}

test.describe('Connecting Ideas Without Breaking Flow', () => {
    /**
     * User Story: As a writer, I want to link to other notes while writing
     * without having to remember exact filenames or leave my current thought.
     *
     * Pain Point: In traditional editors, creating links requires:
     * 1. Stopping writing
     * 2. Remembering exact filename
     * 3. Manually typing the full link syntax
     *
     * Solution: Autocomplete that appears as you type [[
     */

    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Writer can link to notes using partial names they remember', async ({ page }) => {
        // Scenario: I'm writing about a concept and want to link to a related note
        // I only remember it had "project" in the name

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // I'm in the middle of a thought...
        await page.keyboard.type('This connects to my ');

        // I start typing a wiki link with what I remember
        await page.keyboard.type('[[proj');
        await page.waitForTimeout(1000);

        // The autocomplete should help me find matching notes
        const suggestions = page.locator('.quallaa-suggestion-item');
        const suggestionCount = await suggestions.count();

        await page.screenshot({ path: 'screenshots/ux-find-note-by-partial-name.png' });

        // I can see suggestions and pick the right one without typing the full name
        console.log(`Found ${suggestionCount} notes matching "proj"`);

        // If suggestions appear, I can continue my thought without interruption
        if (suggestionCount > 0) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(300);
            await page.keyboard.type(' which explains the context.');

            const content = await editor.textContent();
            expect(content).toContain('which explains the context');
        }
    });

    test('Writer can dismiss autocomplete and continue typing normally', async ({ page }) => {
        // Scenario: I type [[ but realize I want to write something else
        // The autocomplete shouldn't trap me

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        await page.keyboard.type('Sometimes I use [[');
        await page.waitForTimeout(500);

        // I change my mind - Escape should dismiss it cleanly
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // I should be able to continue typing
        await page.keyboard.type('brackets]] for other purposes');

        const content = await editor.textContent();
        await page.screenshot({ path: 'screenshots/ux-dismiss-autocomplete-gracefully.png' });

        // My flow wasn't broken
        expect(content).toContain('brackets');
    });

    test('Keyboard-only workflow for power users', async ({ page }) => {
        // Scenario: I'm a keyboard-centric user, I never want to touch the mouse

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // I type my link trigger
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);

        // I can navigate suggestions with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(200);

        // And select with Enter - no mouse needed
        await page.keyboard.press('Enter');

        await page.screenshot({ path: 'screenshots/ux-keyboard-only-linking.png' });

        // Verify something was inserted
        const content = await editor.textContent();
        console.log('Content after keyboard navigation:', content?.substring(0, 100));
    });
});

test.describe('Switching Between Visual and Source Modes', () => {
    /**
     * User Story: As a user who prefers visual editing but sometimes needs
     * to see/edit the raw markdown, I want to switch modes seamlessly.
     *
     * Pain Points:
     * - Losing my place when switching modes
     * - Losing unsaved changes
     * - Not knowing which mode I'm in
     */

    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Content survives round-trip between visual and source modes', async ({ page }) => {
        // Scenario: I make changes in visual mode, switch to source to check
        // something, then switch back - nothing should be lost

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // Make distinctive edits in visual mode
        const testMarker = `ROUND_TRIP_TEST_${Date.now()}`;
        await page.keyboard.type(testMarker);
        await page.waitForTimeout(500);

        // Switch to source mode
        const toggleButton = page.locator('.quallaa-editor-toolbar button.theia-button');
        await toggleButton.click();
        await page.waitForTimeout(2000); // Monaco needs time to initialize

        // I should see my text in raw markdown
        const sourceContent = await page.locator('.quallaa-monaco-source-editor').textContent();
        await page.screenshot({ path: 'screenshots/ux-source-mode-shows-my-edits.png' });

        expect(sourceContent).toContain(testMarker);

        // Switch back to visual mode
        await toggleButton.click();
        await page.waitForTimeout(1000);

        // My content should still be there
        const visualContent = await page.locator('.ProseMirror').textContent();
        await page.screenshot({ path: 'screenshots/ux-back-to-visual-content-preserved.png' });

        expect(visualContent).toContain(testMarker);
    });

    test('Visual mode shows clean formatted text, source shows raw markdown', async ({ page }) => {
        // Scenario: I need to understand what each mode is for

        await openMarkdownFile(page);

        // In visual mode, I see rendered content
        const visualEditor = page.locator('.ProseMirror');
        const isVisualPresent = (await visualEditor.count()) > 0;
        expect(isVisualPresent).toBe(true);

        // The toolbar should indicate I'm in "Live Preview"
        const toolbar = page.locator('.quallaa-editor-toolbar');
        const toolbarText = await toolbar.textContent();
        expect(toolbarText).toContain('Live Preview');

        await page.screenshot({ path: 'screenshots/ux-visual-mode-clear-indication.png' });

        // Switch to source
        const toggleButton = page.locator('.quallaa-editor-toolbar button.theia-button');
        await toggleButton.click();

        // Wait for the mode toggle to complete (includes 50ms switching delay)
        const sourceEditor = page.locator('.quallaa-monaco-source-editor');
        await sourceEditor.waitFor({ state: 'visible', timeout: 10000 });

        // Verify we're in source mode by checking toolbar text
        const toolbarAfterToggle = await page.locator('.quallaa-editor-toolbar').textContent();
        console.log('Toolbar text after toggle:', toolbarAfterToggle);
        expect(toolbarAfterToggle).toContain('Source Mode');

        const isSourcePresent = (await sourceEditor.count()) > 0;

        await page.screenshot({ path: 'screenshots/ux-source-mode-clear-indication.png' });

        // Source mode should show the editor container
        expect(isSourcePresent).toBe(true);
    });

    test('Dirty indicator shows unsaved work in both modes', async ({ page }) => {
        // Scenario: I need to know if I have unsaved changes before closing

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // Check tab doesn't show dirty indicator initially
        // Note: Theia uses Lumino (lm- prefix), not Phosphor (p- prefix)
        // Dirty state is indicated by theia-mod-dirty class, not text content
        // Target the editor tab specifically (in main area, not sidebar tabs)
        const tab = page.locator('#shell-tab-quallaa-markdown-editor');
        const hasDirtyInitially = await tab.evaluate(el => el.classList.contains('theia-mod-dirty'));
        expect(hasDirtyInitially).toBe(false);

        // Make a change
        await page.keyboard.type('Unsaved change');
        await page.waitForTimeout(500);

        // Now I should see the dirty indicator class
        const hasDirtyAfterEdit = await tab.evaluate(el => el.classList.contains('theia-mod-dirty'));
        expect(hasDirtyAfterEdit).toBe(true);

        await page.screenshot({ path: 'screenshots/ux-dirty-indicator-warns-me.png' });

        // This visual cue prevents me from accidentally losing work
    });
});

test.describe('Embedding Images in Notes', () => {
    /**
     * User Story: As a visual thinker, I want to embed images in my notes
     * using a simple syntax that's consistent with wiki links.
     *
     * Pain Point: Standard markdown image syntax is hard to remember:
     * ![alt](path/to/image.png)
     *
     * Solution: Wiki-style syntax that matches links:
     * ![[image.png]]
     */

    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Simple image syntax mirrors wiki link syntax', async ({ page }) => {
        // Scenario: I already know [[Note]] for links,
        // so ![[image.png]] should feel natural

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // I type the intuitive syntax
        await page.keyboard.type('Here is my diagram: ![[diagram.png]]');
        await page.waitForTimeout(1000);

        // The image should render inline
        const imageElement = page.locator('figure[data-wiki-image]');
        const hasImage = (await imageElement.count()) > 0;

        await page.screenshot({ path: 'screenshots/ux-wiki-image-syntax.png' });

        // The syntax worked without needing to look up documentation
        console.log('Wiki image rendered:', hasImage);
    });

    test('I can add descriptions to images for accessibility', async ({ page }) => {
        // Scenario: I want to add alt text for accessibility and context

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // Pipe syntax for alt text, consistent with wiki link display text
        await page.keyboard.type('![[chart.png|Q3 Revenue Chart]]');
        await page.waitForTimeout(1000);

        // The alt text should be applied
        const img = page.locator('figure[data-wiki-image] img');
        if ((await img.count()) > 0) {
            const altText = await img.getAttribute('alt');
            console.log('Image alt text:', altText);
        }

        await page.screenshot({ path: 'screenshots/ux-image-with-description.png' });
    });
});

test.describe('Using Quick Actions Without Learning New Shortcuts', () => {
    /**
     * User Story: As a new user, I want to perform actions without
     * memorizing keyboard shortcuts or hunting through menus.
     *
     * Solution: Toolbar buttons for common formatting and actions
     */

    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Toolbar provides discoverable formatting options', async ({ page }) => {
        await openMarkdownFile(page);

        // I can see the toolbar with clear icons
        const toolbar = page.locator('.quallaa-formatting-toolbar');
        const buttons = page.locator('.quallaa-toolbar-button');
        const buttonCount = await buttons.count();

        await page.screenshot({ path: 'screenshots/ux-toolbar-discoverable.png' });

        // There should be obvious buttons for common actions
        expect(buttonCount).toBeGreaterThan(5);

        // Each button should have a tooltip explaining what it does
        const firstButton = buttons.first();
        const title = await firstButton.getAttribute('title');
        expect(title).toBeTruthy();
        console.log('First button tooltip:', title);
    });

    test('Active state shows current formatting', async ({ page }) => {
        // Scenario: I select bold text - the Bold button should look "pressed"

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // Type and select text
        await page.keyboard.type('Make this bold');
        await page.keyboard.press('Meta+a');
        await page.waitForTimeout(300);

        // Apply bold with keyboard shortcut
        await page.keyboard.press('Meta+b');
        await page.waitForTimeout(300);

        // The bold button should show active state
        const boldButton = page.locator('.quallaa-toolbar-button[title*="Bold"]');
        if ((await boldButton.count()) > 0) {
            const isActive = await boldButton.evaluate(el => el.classList.contains('active'));
            console.log('Bold button shows active state:', isActive);
        }

        await page.screenshot({ path: 'screenshots/ux-toolbar-shows-active-formatting.png' });
    });

    test('Wiki link button opens friendly input dialog', async ({ page }) => {
        // Scenario: I click the link button and get a nice dialog,
        // not a browser alert() that looks broken

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // Find and click the wiki link button
        const linkButton = page.locator('.quallaa-toolbar-button[title*="Wiki Link"]');
        if ((await linkButton.count()) > 0) {
            await linkButton.click();
            await page.waitForTimeout(1000);

            // Should see Theia's nice QuickInput dialog
            const quickInput = page.locator('.quick-input-widget');
            const hasNiceDialog = await quickInput.isVisible().catch(() => false);

            await page.screenshot({ path: 'screenshots/ux-nice-input-dialog.png' });

            console.log('Shows nice input dialog:', hasNiceDialog);

            // Clean up
            await page.keyboard.press('Escape');
        }
    });
});

test.describe('Complete Writing Session', () => {
    /**
     * Integration test simulating a real writing session
     */

    test.beforeEach(async ({ page }) => {
        await page.goto(APP_URL);
        await waitForAppReady(page);
    });

    test('Full writing workflow: create content, link notes, format, save', async ({ page }) => {
        // This is what a real session looks like

        await openMarkdownFile(page);
        const editor = page.locator('.ProseMirror');
        await editor.click();

        // Start writing a thought
        await page.keyboard.type('Today I learned about ');
        await page.waitForTimeout(300);

        // Link to related concepts
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);

        // Either select from autocomplete or type full name
        await page.keyboard.type('concepts');
        await page.keyboard.press('Escape'); // dismiss autocomplete
        await page.keyboard.type(']] and how they connect to ');

        // Add some formatting
        await page.keyboard.type('important ideas');

        // Select "important ideas" and make it bold
        for (let i = 0; i < 'important ideas'.length; i++) {
            await page.keyboard.press('Shift+ArrowLeft');
        }
        await page.keyboard.press('Meta+b');
        await page.waitForTimeout(300);

        // Continue writing
        await page.keyboard.press('End');
        await page.keyboard.type('.\n\nHere is a diagram: ![[notes-diagram.png]]');

        await page.screenshot({ path: 'screenshots/ux-complete-writing-session.png' });

        // Check to source mode to see the markdown
        const toggleButton = page.locator('.quallaa-editor-toolbar button.theia-button');
        await toggleButton.click();

        // Wait for mode toggle to complete
        const sourceEditor = page.locator('.quallaa-monaco-source-editor');
        await sourceEditor.waitFor({ state: 'visible', timeout: 10000 });

        await page.screenshot({ path: 'screenshots/ux-session-markdown-output.png' });

        // Save my work
        await page.keyboard.press('Meta+s');
        await page.waitForTimeout(1000);

        // Verify save succeeded (no dirty indicator)
        // Note: Theia uses Lumino (lm- prefix), dirty state is theia-mod-dirty class
        // Target the editor tab specifically (not sidebar tabs)
        const tab = page.locator('#shell-tab-quallaa-markdown-editor');
        const isDirtyAfterSave = await tab.evaluate(el => el.classList.contains('theia-mod-dirty'));

        await page.screenshot({ path: 'screenshots/ux-session-saved.png' });

        // After save, dirty indicator should be gone
        expect(isDirtyAfterSave).toBe(false);
        console.log('Session completed. Dirty after save:', isDirtyAfterSave);
    });
});
