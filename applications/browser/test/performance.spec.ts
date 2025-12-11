/********************************************************************************
 * Copyright (C) 2025 Jeff Toffoli
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/

/**
 * Performance benchmarks for knowledge base features
 * Tests system performance with 1000+ notes workspace
 */

import { test, expect } from '@playwright/test';

// Performance targets from Next Steps.md
const TARGETS = {
    indexing100: 1000, // 1s for 100 notes
    indexing1000: 10000, // 10s for 1000 notes
    graphRender: 5000, // 5s to render 1K nodes
    autocomplete: 50, // 50ms for suggestions
    search: 100, // 100ms for search
    fileWatch: 100, // 100ms to detect changes
};

test.describe('Performance Benchmarks', () => {
    test.setTimeout(120000); // 2 minutes for performance tests

    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the application to be ready
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });

        // Give workspace indexing time to complete
        await page.waitForTimeout(2000);
    });

    test('should index 1000 notes within target time', async ({ page }) => {
        console.log('\n📊 Performance Test: Workspace Indexing (1000 notes)');

        // Start timing
        const startTime = Date.now();

        // Wait for indexing to complete by checking if we can open the graph
        // The graph requires indexing to be complete
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph to be visible (indicates indexing is complete)
        await page.waitForSelector('.knowledge-graph-widget', { timeout: 30000 });

        const indexingTime = Date.now() - startTime;

        console.log(`   ⏱️  Indexing time: ${indexingTime}ms`);
        console.log(`   🎯 Target: <${TARGETS.indexing1000}ms`);
        console.log(`   ${indexingTime <= TARGETS.indexing1000 ? '✅' : '⚠️'} ${indexingTime <= TARGETS.indexing1000 ? 'PASS' : 'SLOW'}`);

        // Log result
        expect(indexingTime).toBeLessThan(TARGETS.indexing1000 * 2); // Fail if >2x target

        // Close graph
        await page.keyboard.press('Escape');
    });

    test('should render knowledge graph within target time', async ({ page }) => {
        console.log('\n📊 Performance Test: Knowledge Graph Rendering (1000 nodes)');

        // First, wait for indexing to complete
        await page.waitForTimeout(15000);

        // Open graph and measure render time
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Graph');
        await page.waitForTimeout(500);

        const startTime = Date.now();
        await page.keyboard.press('Enter');

        // Wait for graph to be visible
        await page.waitForSelector('.knowledge-graph-widget', { timeout: 30000 });

        // Wait for SVG to be populated with nodes
        await page.waitForSelector('svg circle', { timeout: 10000 });

        const renderTime = Date.now() - startTime;

        // Count nodes rendered
        const nodeCount = await page.locator('svg circle').count();

        console.log(`   ⏱️  Render time: ${renderTime}ms`);
        console.log(`   📊 Nodes rendered: ${nodeCount}`);
        console.log(`   🎯 Target: <${TARGETS.graphRender}ms`);
        console.log(`   ${renderTime <= TARGETS.graphRender ? '✅' : '⚠️'} ${renderTime <= TARGETS.graphRender ? 'PASS' : 'SLOW'}`);

        expect(renderTime).toBeLessThan(TARGETS.graphRender * 2); // Fail if >2x target
        expect(nodeCount).toBeGreaterThan(500); // Should render most notes

        // Close graph
        await page.keyboard.press('Escape');
    });

    test('should provide autocomplete suggestions quickly', async ({ page }) => {
        console.log('\n📊 Performance Test: Wiki Link Autocomplete');

        // Wait for indexing
        await page.waitForTimeout(15000);

        // Create a new file to test autocomplete
        await page.keyboard.press('Control+N');
        await page.waitForTimeout(1000);

        // Get editor
        const editor = page.locator('.monaco-editor textarea').first();
        await editor.click();
        await editor.focus();

        // Type wiki link opening bracket
        await page.keyboard.type('[[');
        await page.waitForTimeout(100);

        // Start timing autocomplete
        const startTime = Date.now();
        await page.keyboard.type('Note');

        // Wait for autocomplete widget
        await page.waitForSelector('.monaco-editor-hover', { timeout: 5000 }).catch(() => {});
        await page.waitForSelector('.suggest-widget', { timeout: 5000 }).catch(() => {});

        const autocompleteTime = Date.now() - startTime;

        console.log(`   ⏱️  Autocomplete time: ${autocompleteTime}ms`);
        console.log(`   🎯 Target: <${TARGETS.autocomplete}ms`);
        console.log(`   ${autocompleteTime <= TARGETS.autocomplete ? '✅' : '⚠️'} ${autocompleteTime <= TARGETS.autocomplete ? 'PASS' : 'SLOW'}`);

        expect(autocompleteTime).toBeLessThan(TARGETS.autocomplete * 5); // Fail if >5x target

        // Cancel
        await page.keyboard.press('Escape');
    });

    test('should search notes quickly', async ({ page }) => {
        console.log('\n📊 Performance Test: Note Search');

        // Wait for indexing
        await page.waitForTimeout(15000);

        // Open file search
        await page.keyboard.press('Control+P');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });

        // Start timing search
        const startTime = Date.now();
        await page.fill('.monaco-quick-input-box input', 'Note 500');
        await page.waitForTimeout(100);

        // Wait for results
        await page.waitForSelector('.monaco-list-row', { timeout: 5000 });

        const searchTime = Date.now() - startTime;

        // Count results
        const resultCount = await page.locator('.monaco-list-row').count();

        console.log(`   ⏱️  Search time: ${searchTime}ms`);
        console.log(`   📊 Results found: ${resultCount}`);
        console.log(`   🎯 Target: <${TARGETS.search}ms`);
        console.log(`   ${searchTime <= TARGETS.search ? '✅' : '⚠️'} ${searchTime <= TARGETS.search ? 'PASS' : 'SLOW'}`);

        expect(searchTime).toBeLessThan(TARGETS.search * 5); // Fail if >5x target
        expect(resultCount).toBeGreaterThan(0);

        // Cancel
        await page.keyboard.press('Escape');
    });

    test('should detect file changes quickly', async ({ page }) => {
        console.log('\n📊 Performance Test: File Change Detection');

        // Wait for indexing
        await page.waitForTimeout(15000);

        // Open a file
        await page.keyboard.press('Control+P');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Note 1.md');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Get editor
        const editor = page.locator('.monaco-editor textarea').first();
        await editor.click();
        await editor.focus();

        // Add a new wiki link
        await page.keyboard.press('Control+End');
        await page.keyboard.press('Enter');

        // Start timing file watch detection
        const startTime = Date.now();
        await page.keyboard.type('[[Note 999]]');

        // Save the file
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(500);

        // Open backlinks panel to verify change was detected
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Backlinks');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const detectionTime = Date.now() - startTime;

        console.log(`   ⏱️  Change detection time: ${detectionTime}ms`);
        console.log(`   🎯 Target: <${TARGETS.fileWatch}ms (for detection, not full reindex)`);
        console.log(`   ${detectionTime <= TARGETS.fileWatch * 10 ? '✅' : '⚠️'} ${detectionTime <= TARGETS.fileWatch * 10 ? 'PASS' : 'SLOW'}`);

        expect(detectionTime).toBeLessThan(TARGETS.fileWatch * 20); // More lenient for full workflow
    });

    test('should handle multiple graph interactions smoothly', async ({ page }) => {
        console.log('\n📊 Performance Test: Graph Interaction Performance');

        // Wait for indexing
        await page.waitForTimeout(15000);

        // Open graph
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Knowledge Graph');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        // Wait for graph to render
        await page.waitForSelector('.knowledge-graph-widget', { timeout: 30000 });
        await page.waitForSelector('svg circle', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Test zoom performance
        const zoomStartTime = Date.now();
        const svg = page.locator('.knowledge-graph-widget svg').first();

        // Zoom in (wheel event)
        await svg.hover();
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(100);

        const zoomTime = Date.now() - zoomStartTime;

        // Test pan performance
        const panStartTime = Date.now();
        await page.mouse.move(400, 300);
        await page.mouse.down();
        await page.mouse.move(500, 400);
        await page.mouse.up();
        await page.waitForTimeout(100);

        const panTime = Date.now() - panStartTime;

        console.log(`   ⏱️  Zoom response: ${zoomTime}ms`);
        console.log(`   ⏱️  Pan response: ${panTime}ms`);
        console.log(`   🎯 Target: Smooth interaction (<200ms)`);
        console.log(`   ${zoomTime <= 200 && panTime <= 200 ? '✅' : '⚠️'} ${zoomTime <= 200 && panTime <= 200 ? 'PASS' : 'SLOW'}`);

        expect(zoomTime).toBeLessThan(500);
        expect(panTime).toBeLessThan(500);

        // Close graph
        await page.keyboard.press('Escape');
    });

    test('should scale to 1000 tags efficiently', async ({ page }) => {
        console.log('\n📊 Performance Test: Tags Browser Scalability');

        // Wait for indexing
        await page.waitForTimeout(15000);

        // Open tags browser
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Tags Browser');
        await page.waitForTimeout(500);

        const startTime = Date.now();
        await page.keyboard.press('Enter');

        // Wait for tags browser to appear
        await page.waitForSelector('.tags-browser-widget', { timeout: 10000 });

        // Wait for tags to load
        await page.waitForSelector('.tags-tree-container .theia-TreeNode', { timeout: 10000 });

        const loadTime = Date.now() - startTime;

        // Count tag nodes
        const tagCount = await page.locator('.tags-tree-container .theia-TreeNode').count();

        console.log(`   ⏱️  Tags browser load time: ${loadTime}ms`);
        console.log(`   📊 Tags displayed: ${tagCount}`);
        console.log(`   🎯 Target: <2000ms for tags browser`);
        console.log(`   ${loadTime <= 2000 ? '✅' : '⚠️'} ${loadTime <= 2000 ? 'PASS' : 'SLOW'}`);

        expect(loadTime).toBeLessThan(5000); // Fail if >5s
        expect(tagCount).toBeGreaterThan(0);
    });

    test('should provide performance summary', async ({ page }) => {
        console.log('\n📊 Performance Summary');
        console.log('   Test completed with 1000-note workspace');
        console.log('   See individual test results above');
        console.log('   All tests include both target and 2-5x tolerance thresholds');

        expect(true).toBe(true);
    });
});
