/**
 * UI Screenshot Capture Script
 *
 * This test systematically captures screenshots of all Quallaa UI features
 * for documentation and comparison purposes.
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../../screenshots');
const TEST_WORKSPACE = path.join(__dirname, '../../../test-workspace');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Helper function to wait for app to be fully loaded
 */
async function waitForAppReady(page: Page) {
    // Wait for the main shell to be visible
    await page.waitForSelector('.theia-preload', { state: 'hidden', timeout: 30000 });
    await page.waitForSelector('#theia-app-shell', { timeout: 30000 });

    // Wait a bit more for full initialization
    await page.waitForTimeout(2000);
}

/**
 * Helper function to open a file
 */
async function openFile(page: Page, fileName: string) {
    // Use Quick Open (Cmd+P / Ctrl+P)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+P' : 'Control+P');
    await page.waitForTimeout(500);

    // Type the filename
    await page.keyboard.type(fileName);
    await page.waitForTimeout(500);

    // Press Enter to open
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
}

/**
 * Helper function to open a widget/panel by command
 */
async function openWidget(page: Page, widgetName: string) {
    // Use Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Shift+P`);
    await page.waitForTimeout(500);

    // Type the widget name
    await page.keyboard.type(widgetName);
    await page.waitForTimeout(500);

    // Press Enter to execute
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
}

test.describe('Quallaa UI Screenshot Capture', () => {
    test.beforeEach(async ({ page }) => {
        // Start the app with the test workspace
        await page.goto(`http://localhost:3000/?folder=${TEST_WORKSPACE}`);
        await waitForAppReady(page);
    });

    test('01 - Overall IDE Layout', async ({ page }) => {
        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-overall-layout.png'),
            fullPage: true,
        });
    });

    test('02 - Welcome/Getting Started', async ({ page }) => {
        // The getting started widget should be visible on first launch
        await page.waitForTimeout(1000);

        const gettingStarted = await page.locator('.theia-getting-started-widget').isVisible();
        if (gettingStarted) {
            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, '02-getting-started.png'),
                fullPage: true,
            });
        }
    });

    test('03 - File Explorer', async ({ page }) => {
        // Click on the Files tab in the sidebar
        const filesTab = page.locator('[title="Files"]').first();
        if (await filesTab.isVisible()) {
            await filesTab.click();
            await page.waitForTimeout(500);
        }

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-file-explorer.png'),
            fullPage: true,
        });
    });

    test('04 - Wiki Link Autocomplete', async ({ page }) => {
        // Open a markdown file
        await openFile(page, 'Wiki Links.md');

        // Position cursor at the end
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // Type [[ to trigger autocomplete
        await page.keyboard.type('[[');
        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-wiki-link-autocomplete.png'),
            fullPage: true,
        });

        // Close the autocomplete
        await page.keyboard.press('Escape');
    });

    test('05 - Wiki Links in Document', async ({ page }) => {
        // Open a file with wiki links
        await openFile(page, 'Index.md');
        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-wiki-links-document.png'),
            fullPage: true,
        });
    });

    test('06 - Backlinks Panel', async ({ page }) => {
        // Open a file that has backlinks
        await openFile(page, 'Wiki Links.md');

        // Open Backlinks panel
        await openWidget(page, 'Backlinks');

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '06-backlinks-panel.png'),
            fullPage: true,
        });
    });

    test('07 - Knowledge Graph', async ({ page }) => {
        // Open Knowledge Graph
        await openWidget(page, 'Knowledge Graph');

        // Wait for graph to render
        await page.waitForTimeout(2000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '07-knowledge-graph.png'),
            fullPage: true,
        });
    });

    test('08 - Knowledge Graph Interaction', async ({ page }) => {
        // Open Knowledge Graph
        await openWidget(page, 'Knowledge Graph');
        await page.waitForTimeout(2000);

        // Try to interact with a node (hover)
        const graphSvg = page.locator('svg.knowledge-graph');
        if (await graphSvg.isVisible()) {
            const box = await graphSvg.boundingBox();
            if (box) {
                // Click somewhere in the middle of the graph
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.waitForTimeout(500);
            }
        }

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '08-knowledge-graph-interaction.png'),
            fullPage: true,
        });
    });

    test('09 - Tags Browser', async ({ page }) => {
        // Open Tags Browser
        await openWidget(page, 'Tags Browser');

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '09-tags-browser.png'),
            fullPage: true,
        });
    });

    test('10 - Template Creation Dialog', async ({ page }) => {
        // Try to trigger template creation
        await openWidget(page, 'Create from Template');

        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '10-template-dialog.png'),
            fullPage: true,
        });

        // Close dialog if it's open
        await page.keyboard.press('Escape');
    });

    test('11 - Daily Note Creation', async ({ page }) => {
        // Trigger daily note creation
        await openWidget(page, 'Open Daily Note');

        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '11-daily-note.png'),
            fullPage: true,
        });
    });

    test('12 - Command Palette', async ({ page }) => {
        // Open command palette
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+Shift+P`);
        await page.waitForTimeout(500);

        // Type "knowledge" to see knowledge base commands
        await page.keyboard.type('knowledge');
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '12-command-palette.png'),
            fullPage: true,
        });

        await page.keyboard.press('Escape');
    });

    test('13 - Quick Open', async ({ page }) => {
        // Open Quick Open
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+P`);
        await page.waitForTimeout(500);

        // Type to filter files
        await page.keyboard.type('wiki');
        await page.waitForTimeout(500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '13-quick-open.png'),
            fullPage: true,
        });

        await page.keyboard.press('Escape');
    });

    test('14 - Editor with Markdown Preview', async ({ page }) => {
        // Open a markdown file
        await openFile(page, 'Index.md');

        // Try to open preview (Cmd+Shift+V / Ctrl+Shift+V)
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+Shift+V`);
        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '14-markdown-preview.png'),
            fullPage: true,
        });
    });

    test('15 - Multiple Panels Open', async ({ page }) => {
        // Open a file
        await openFile(page, 'Wiki Links.md');

        // Open Backlinks
        await openWidget(page, 'Backlinks');
        await page.waitForTimeout(500);

        // Open Tags Browser
        await openWidget(page, 'Tags Browser');
        await page.waitForTimeout(500);

        // Open Knowledge Graph
        await openWidget(page, 'Knowledge Graph');
        await page.waitForTimeout(1500);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '15-multiple-panels.png'),
            fullPage: true,
        });
    });

    test('16 - Menu Bar', async ({ page }) => {
        // Click on the View menu
        const viewMenu = page.locator('[aria-label="View"]').first();
        if (await viewMenu.isVisible()) {
            await viewMenu.click();
            await page.waitForTimeout(500);

            await page.screenshot({
                path: path.join(SCREENSHOT_DIR, '16-menu-bar.png'),
                fullPage: true,
            });

            // Close menu
            await page.keyboard.press('Escape');
        }
    });

    test('17 - Settings/Preferences', async ({ page }) => {
        // Open settings
        await openWidget(page, 'Preferences');
        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '17-settings.png'),
            fullPage: true,
        });
    });

    test('18 - About Dialog', async ({ page }) => {
        // Open about dialog
        await openWidget(page, 'About');
        await page.waitForTimeout(1000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '18-about-dialog.png'),
            fullPage: true,
        });

        // Close dialog
        await page.keyboard.press('Escape');
    });
});
