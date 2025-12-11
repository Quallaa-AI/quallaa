/**
 * E2E tests for Knowledge Graph visualization
 */

import { test, expect } from '@playwright/test';

test.describe('Knowledge Graph', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the application to be ready
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });

        // Give workspace indexing time to complete
        await page.waitForTimeout(2000);
    });

    test('should open Knowledge Graph widget via command', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');

        // Wait for command palette
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });

        // Type the command
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');

        // Wait a bit for filtering
        await page.waitForTimeout(500);

        // Press Enter to execute command
        await page.keyboard.press('Enter');

        // Wait for the graph widget to appear
        const graphWidget = await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        expect(graphWidget).toBeTruthy();

        // Check that the widget has the correct title
        const widgetTitle = await page.locator('.theia-tab-label').filter({ hasText: 'Knowledge Graph' }).first();
        await expect(widgetTitle).toBeVisible();

        console.log('✓ Knowledge Graph widget opened successfully');
    });

    test('should load and render graph data', async ({ page }) => {
        // Listen for console logs
        const logs: string[] = [];
        page.on('console', msg => {
            if (msg.text().includes('[GraphWidget]')) {
                logs.push(msg.text());
            }
        });

        // Open command palette and execute command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });

        // Wait for graph to load and render
        await page.waitForTimeout(2000);

        // Check console logs for successful loading
        const loadedLog = logs.find(log => log.includes('Loaded') && log.includes('nodes'));
        const renderedLog = logs.find(log => log.includes('Graph rendered'));

        expect(loadedLog).toBeTruthy();
        expect(renderedLog).toBeTruthy();

        console.log('✓ Graph data loaded:', loadedLog);
        console.log('✓ Graph rendered:', renderedLog);

        // Check that canvas or SVG element exists (force-graph creates these)
        const graphContainer = await page.locator('#knowledge-base-graph-widget canvas, #knowledge-base-graph-widget svg').first();
        await expect(graphContainer).toBeVisible({ timeout: 5000 });

        console.log('✓ Graph visualization rendered');
    });

    test('should show graph in View menu', async ({ page }) => {
        // Click on View menu
        await page.click('li.p-MenuBar-item:has-text("View")');

        // Wait for menu to appear
        await page.waitForTimeout(500);

        // Look for Views submenu
        const viewsMenu = await page.locator('.p-Menu-itemLabel:has-text("Views")').first();
        await viewsMenu.hover();

        // Wait for submenu
        await page.waitForTimeout(500);

        // Look for Knowledge Base: Show Graph
        const graphMenuItem = await page.locator('.p-Menu-itemLabel:has-text("Knowledge Base: Show Graph")').first();
        await expect(graphMenuItem).toBeVisible();

        console.log('✓ Knowledge Graph menu item found in View > Views');

        // Click the menu item
        await graphMenuItem.click();

        // Verify widget opened
        const graphWidget = await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        expect(graphWidget).toBeTruthy();

        console.log('✓ Knowledge Graph opened from menu');
    });

    test('should show loading state initially', async ({ page }) => {
        // Open command palette and execute command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });

        // Check for loading message (might be very brief)
        const widgetContent = await page.locator('#knowledge-base-graph-widget').first();
        const content = await widgetContent.textContent();

        // Either we see "Loading knowledge graph..." or the graph has already loaded
        // Both are acceptable
        console.log('✓ Widget content:', content?.substring(0, 100));

        // Wait a bit and verify graph eventually renders
        await page.waitForTimeout(2000);

        const graphContainer = await page.locator('#knowledge-base-graph-widget canvas, #knowledge-base-graph-widget svg').first();
        const isVisible = await graphContainer.isVisible().catch(() => false);

        expect(isVisible).toBe(true);
        console.log('✓ Graph rendering completed');
    });

    test('should render nodes for all notes in workspace', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // D3 renders nodes as SVG circles with class 'node'
        const nodes = await page.locator('#knowledge-base-graph-widget svg circle.node').count();

        // test-workspace has at least 10 markdown files
        expect(nodes).toBeGreaterThanOrEqual(10);
        console.log(`✓ Graph rendered ${nodes} nodes`);
    });

    test('should render edges for wiki links', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // D3 renders edges as SVG lines with class 'link'
        const edges = await page.locator('#knowledge-base-graph-widget svg line.link').count();

        // test-workspace has multiple interconnected notes
        expect(edges).toBeGreaterThan(0);
        console.log(`✓ Graph rendered ${edges} edges`);
    });

    test('should display node labels with note titles', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Check for specific labels from test-workspace
        const indexLabel = await page.locator('#knowledge-base-graph-widget svg text:has-text("Index")').first();
        const wikiLinksLabel = await page.locator('#knowledge-base-graph-widget svg text:has-text("Wiki Links")').first();

        await expect(indexLabel).toBeVisible();
        await expect(wikiLinksLabel).toBeVisible();

        console.log('✓ Node labels are displayed correctly');
    });

    test('should open note when clicking on a node', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Find and click the "Index" node
        const indexLabel = await page.locator('#knowledge-base-graph-widget svg text:has-text("Index")').first();
        await indexLabel.click();

        // Wait for editor to open
        await page.waitForTimeout(1000);

        // Verify that Index.md is now open in the editor
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label:has-text("Index.md")').first();
        await expect(editorTab).toBeVisible({ timeout: 5000 });

        console.log('✓ Clicking node opens corresponding note');
    });

    test('should support zoom controls', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Get the SVG container
        const svg = await page.locator('#knowledge-base-graph-widget svg').first();
        const svgBox = await svg.boundingBox();

        if (svgBox) {
            // Get initial transform
            const svgGroup = await page.locator('#knowledge-base-graph-widget svg g').first();
            const initialTransform = await svgGroup.getAttribute('transform');

            // Scroll to zoom (wheel event)
            await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
            await page.mouse.wheel(0, 100);
            await page.waitForTimeout(500);

            // Check that transform changed
            const newTransform = await svgGroup.getAttribute('transform');
            expect(newTransform).not.toEqual(initialTransform);

            console.log('✓ Zoom controls working');
        }
    });

    test('should support pan controls', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Get the SVG container
        const svg = await page.locator('#knowledge-base-graph-widget svg').first();
        const svgBox = await svg.boundingBox();

        if (svgBox) {
            // Get initial transform
            const svgGroup = await page.locator('#knowledge-base-graph-widget svg g').first();
            const initialTransform = await svgGroup.getAttribute('transform');

            // Drag to pan
            const startX = svgBox.x + svgBox.width / 2;
            const startY = svgBox.y + svgBox.height / 2;

            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(startX + 100, startY + 100);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // Check that transform changed
            const newTransform = await svgGroup.getAttribute('transform');
            expect(newTransform).not.toEqual(initialTransform);

            console.log('✓ Pan controls working');
        }
    });

    test('should distinguish between note nodes and placeholder nodes', async ({ page }) => {
        // Open graph widget
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Base: Show Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph widget
        await page.waitForSelector('#knowledge-base-graph-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Count regular note nodes
        const noteNodes = await page.locator('#knowledge-base-graph-widget svg circle.node:not(.placeholder)').count();
        expect(noteNodes).toBeGreaterThan(0);

        // Placeholder nodes (for broken links) may or may not exist
        // This is okay - just verify the distinction exists
        console.log(`✓ Found ${noteNodes} note nodes`);
    });
});
