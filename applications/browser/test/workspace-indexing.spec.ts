/**
 * Test workspace indexing and wiki links with correct workspace detection
 *
 * This test connects to a running Theia instance at http://127.0.0.1:3000
 * Make sure to start the server with test-workspace before running this test:
 *   yarn browser start --workspace=test-workspace
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test';

const THEIA_URL = 'http://127.0.0.1:3000';

test.describe('Knowledge Base Workspace Indexing', () => {
    let browser: Browser;
    let page: Page;
    const consoleLogs: string[] = [];

    test.beforeAll(async () => {
        browser = await chromium.launch({ headless: false });
    });

    test.afterAll(async () => {
        await browser.close();
    });

    test.beforeEach(async () => {
        // Use a fresh browser context for each test (like incognito)
        const context = await browser.newContext();
        page = await context.newPage();

        // Capture console logs
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            if (text.includes('[KnowledgeBase]') || text.includes('Workspace') || text.includes('root')) {
                console.log('Browser log:', text);
            }
        });

        // Navigate to Theia
        await page.goto(THEIA_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(6000); // Wait for app to initialize and index
    });

    test.afterEach(async () => {
        await page.context().close();
    });

    test('should detect test-workspace as the workspace root', async () => {
        // Filter logs related to workspace indexing
        const workspaceRootLogs = consoleLogs.filter(log =>
            log.includes('Root 0:') || log.includes('Indexing workspace')
        );

        console.log('\n=== Workspace Root Logs ===');
        workspaceRootLogs.forEach(log => console.log(log));

        const indexedFilesLog = consoleLogs.find(log => /Indexed \d+ files/.test(log));
        if (indexedFilesLog) {
            console.log('\n=== Files Indexed ===');
            console.log(indexedFilesLog);

            const match = indexedFilesLog.match(/Indexed (\d+) files/);
            const fileCount = match ? parseInt(match[1]) : 0;

            // test-workspace has 7 files, project root has 69+
            console.log(`File count: ${fileCount} (expected: 7 for test-workspace, 69+ for project root)`);

            if (fileCount === 7) {
                console.log('✅ Correct workspace (test-workspace) indexed!');
            } else if (fileCount > 60) {
                console.log('❌ Wrong workspace (project root) indexed!');
            }
        }

        // Try to check editor for workspace path
        const editorVisible = await page.locator('.theia-editor').isVisible({ timeout: 5000 }).catch(() => false);
        console.log('\nEditor area visible:', editorVisible);
    });

    test('should open a file from test-workspace', async () => {
        // Open quick open
        await page.keyboard.press('Meta+p'); // Cmd+P on Mac
        await page.waitForTimeout(500);

        // Type filename
        await page.keyboard.type('foo.md');
        await page.waitForTimeout(1000);

        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/quick-open-foo.png' });

        // Press Enter to open
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check if editor is visible
        const editorVisible = await page.locator('.monaco-editor').isVisible({ timeout: 5000 }).catch(() => false);
        console.log('Editor visible after opening foo.md:', editorVisible);

        if (editorVisible) {
            const editorText = await page.locator('.monaco-editor').textContent();
            console.log('Editor contains text:', editorText?.substring(0, 100));
        }
    });

    test('should detect wiki link decorations', async () => {
        // Open foo.md which should contain [[bar]]
        await page.keyboard.press('Meta+p');
        await page.waitForTimeout(500);
        await page.keyboard.type('foo.md');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // Take screenshot
        await page.screenshot({ path: 'test-results/foo-md-open.png' });

        // Check for wiki link decorations
        const resolvedLinks = await page.locator('.wiki-link-resolved').count();
        const unresolvedLinks = await page.locator('.wiki-link-unresolved').count();

        console.log('\n=== Wiki Link Decorations ===');
        console.log('Resolved links:', resolvedLinks);
        console.log('Unresolved links:', unresolvedLinks);
        console.log('Total wiki links:', resolvedLinks + unresolvedLinks);

        // Check if any decorations exist
        const totalLinks = resolvedLinks + unresolvedLinks;
        if (totalLinks > 0) {
            console.log('✅ Wiki link decorations found!');
        } else {
            console.log('❌ No wiki link decorations found!');
            console.log('This might indicate:');
            console.log('  - Wrong workspace indexed (files not found)');
            console.log('  - Decorator not attached to editor');
            console.log('  - CSS classes not applied correctly');
        }

        // Get all elements with wiki-link classes for debugging
        const wikiLinkElements = await page.locator('[class*="wiki-link"]').all();
        console.log('Elements with wiki-link classes:', wikiLinkElements.length);
    });
});
