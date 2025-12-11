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
 * E2E tests for Templates feature
 * Tests template selection, variable substitution, and note creation
 */

import { test, expect } from '@playwright/test';

test.describe('Note Templates', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the application to be ready
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });

        // Give workspace indexing time to complete
        await page.waitForTimeout(2000);
    });

    test('should open template picker via command', async ({ page }) => {
        // Open command palette
        await page.keyboard.press('F1');

        // Wait for command palette
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });

        // Type the command
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');

        // Wait a bit for filtering
        await page.waitForTimeout(500);

        // Press Enter to execute command
        await page.keyboard.press('Enter');

        // Wait for template picker to appear
        await page.waitForTimeout(1000);

        // Should show quick pick with templates
        const quickPick = page.locator('.monaco-quick-input-box');
        await expect(quickPick).toBeVisible();

        // Should show template options
        const templateOptions = page.locator('.monaco-list-row');
        const count = await templateOptions.count();

        // Should have 5 default templates: Blank Note, Meeting Notes, Project Note, Research Note, Daily Log
        expect(count).toBeGreaterThanOrEqual(5);
        console.log(`✓ Template picker opened with ${count} templates`);

        // Cancel by pressing Escape
        await page.keyboard.press('Escape');
    });

    test('should list all default templates', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Get all template names
        const templateOptions = page.locator('.monaco-list-row');
        const templates = await templateOptions.allTextContents();

        // Check for all 5 default templates
        const expectedTemplates = ['Blank Note', 'Meeting Notes', 'Project Note', 'Research Note', 'Daily Log'];

        for (const expectedTemplate of expectedTemplates) {
            const found = templates.some(t => t.includes(expectedTemplate));
            expect(found).toBe(true);
        }

        console.log(
            '✓ All 5 default templates found:',
            templates.map(t => t.trim())
        );

        await page.keyboard.press('Escape');
    });

    test('should create note from Blank Note template', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select "Blank Note" template
        await page.keyboard.type('Blank');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter note title
        await page.keyboard.type('Test Blank Note');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check that note was created and opened
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label');
        const tabText = await editorTab.textContent();

        expect(tabText).toContain('test-blank-note.md');
        console.log(`✓ Created note: ${tabText}`);

        // Check content
        const editorContent = await page.locator('.monaco-editor').textContent();
        expect(editorContent).toContain('# Test Blank Note');
        console.log('✓ Blank note template applied with title substitution');
    });

    test('should create note from Meeting Notes template', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select "Meeting Notes" template
        await page.keyboard.type('Meeting');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter note title
        await page.keyboard.type('Weekly Standup');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check that note was created
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label');
        const tabText = await editorTab.textContent();
        expect(tabText).toContain('weekly-standup.md');

        // Check content has Meeting Notes structure
        const editorContent = await page.locator('.monaco-editor').textContent();
        expect(editorContent).toContain('# Weekly Standup');
        expect(editorContent).toContain('Attendees');
        expect(editorContent).toContain('Agenda');
        expect(editorContent).toContain('Discussion');
        expect(editorContent).toContain('Action Items');
        expect(editorContent).toContain('Next Steps');

        console.log('✓ Meeting Notes template applied with all sections');
    });

    test('should create note from Project Note template', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select "Project Note" template
        await page.keyboard.type('Project');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter note title
        await page.keyboard.type('New Feature Implementation');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check content
        const editorContent = await page.locator('.monaco-editor').textContent();
        expect(editorContent).toContain('# New Feature Implementation');
        expect(editorContent).toContain('Overview');
        expect(editorContent).toContain('Goals');
        expect(editorContent).toContain('Tasks');
        expect(editorContent).toContain('Resources');

        console.log('✓ Project Note template applied');
    });

    test('should replace template variables with actual values', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select "Meeting Notes" which has date variables
        await page.keyboard.type('Meeting');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter note title
        await page.keyboard.type('Variable Test Note');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check content for replaced variables
        const editorContent = await page.locator('.monaco-editor').textContent();

        // Should have title
        expect(editorContent).toContain('Variable Test Note');

        // Should have date in YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const expectedDate = `${year}-${month}-${day}`;

        expect(editorContent).toContain(expectedDate);
        console.log(`✓ Template variables replaced: ${expectedDate}`);
    });

    test('should convert title to valid filename', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select Blank Note
        await page.keyboard.type('Blank');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter title with special characters and spaces
        await page.keyboard.type('My Note: Testing 123!');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check filename was sanitized
        const editorTab = await page.locator('.theia-tab.active .theia-tab-label');
        const tabText = await editorTab.textContent();

        // Should convert to lowercase and replace spaces/special chars with hyphens
        expect(tabText).toContain('my-note-testing-123.md');
        console.log(`✓ Filename sanitized: ${tabText}`);
    });

    test('should handle template with frontmatter', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select "Research Note" which has frontmatter
        await page.keyboard.type('Research');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter note title
        await page.keyboard.type('AI Research');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check content has frontmatter
        const editorContent = await page.locator('.monaco-editor').textContent();

        expect(editorContent).toContain('---'); // Frontmatter delimiter
        expect(editorContent).toContain('title: AI Research');
        expect(editorContent).toContain('tags:');
        expect(editorContent).toContain('- research');

        console.log('✓ Template with frontmatter applied correctly');
    });

    test('should handle cancellation at template selection', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Cancel template selection
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Should not have created any file
        // Just verify no error occurred
        console.log('✓ Template selection cancelled gracefully');
    });

    test('should handle cancellation at title input', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select Blank Note
        await page.keyboard.type('Blank');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Cancel at title input
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Should not have created any file
        console.log('✓ Title input cancelled gracefully');
    });

    test('should create note with Daily Log template', async ({ page }) => {
        // Open template command
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select "Daily Log" template
        await page.keyboard.type('Daily Log');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Enter note title
        await page.keyboard.type('My Daily Log');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Check content has Daily Log structure
        const editorContent = await page.locator('.monaco-editor').textContent();

        // Should have day name and full date (e.g., "Friday, November 08, 2025")
        const today = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const dayName = dayNames[today.getDay()];
        const monthName = monthNames[today.getMonth()];

        expect(editorContent).toContain(dayName);
        expect(editorContent).toContain(monthName);
        expect(editorContent).toContain("Today's Goals");
        expect(editorContent).toContain('Completed');
        expect(editorContent).toContain('Tomorrow');

        console.log('✓ Daily Log template applied with date variables');
    });

    test('should handle multiple template creations in same session', async ({ page }) => {
        // Create first note
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        await page.keyboard.type('Blank');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        await page.keyboard.type('First Note');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Create second note
        await page.keyboard.press('F1');
        await page.waitForSelector('.monaco-quick-input-box input', { timeout: 5000 });
        await page.fill('.monaco-quick-input-box input', 'Create Note from Template');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        await page.keyboard.type('Blank');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        await page.keyboard.type('Second Note');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Both notes should be created
        const tabs = page.locator('.theia-tab .theia-tab-label');
        const tabTexts = await tabs.allTextContents();

        const hasFirstNote = tabTexts.some(t => t.includes('first-note.md'));
        const hasSecondNote = tabTexts.some(t => t.includes('second-note.md'));

        expect(hasFirstNote).toBe(true);
        expect(hasSecondNote).toBe(true);

        console.log('✓ Multiple templates created successfully');
    });
});
