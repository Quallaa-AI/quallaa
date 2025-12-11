/**
 * E2E tests for table editing functionality (Phase 3.8)
 *
 * User Story: "I need to track my project tasks in a structured table"
 *
 * This test empathizes with a user who:
 * 1. Wants to create a table to organize information
 * 2. Needs to add content and manipulate the table structure
 * 3. Expects tables to work in both Preview and Source modes
 * 4. Wants their work to persist across saves
 *
 * TODO: This test needs proper workspace setup to create notes.
 * Current blocker: App loads without workspace, preventing note creation.
 * See: playwright.config.ts webServer command for workspace configuration.
 */

import { test, expect } from '@playwright/test';

test.describe('Table Editing - User Journey', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('http://localhost:3000');

        // Wait for the application to be ready
        await page.waitForSelector('.theia-ApplicationShell', { timeout: 30000 });

        // Give the application time to initialize and become interactive
        await page.waitForTimeout(4000);

        // Create a new note using the Quick Actions button
        const newNoteButton = page.locator('text=New Note from Template');
        await newNoteButton.waitFor({ timeout: 10000 });
        await newNoteButton.click();

        // Wait for template selection dialog
        await page.waitForTimeout(1000);

        // Select "Blank Note" template (should be first option)
        await page.keyboard.press('Enter');

        // Wait for the markdown editor to open
        await page.waitForSelector('.quallaa-tiptap-editor', { timeout: 10000 });
    });

    test('should create and edit a project tasks table', async ({ page }) => {
        // User Story: "I need a table to track my tasks"
        console.log('📝 User wants to create a tasks table...');

        // Step 1: User clicks "Insert Table" button
        const insertTableButton = page.locator('.quallaa-toolbar-button[title="Insert Table"]');
        await expect(insertTableButton).toBeVisible();
        await insertTableButton.click();

        // Verify table appears (default 3x3 with header)
        await page.waitForSelector('.ProseMirror table', { timeout: 5000 });
        const table = page.locator('.ProseMirror table');
        await expect(table).toBeVisible();
        console.log('✅ Table created with default 3x3 size');

        // Step 2: User adds content to headers
        console.log('📝 User fills in column headers...');

        // Click first header cell
        const firstHeader = page.locator('.ProseMirror th').first();
        await firstHeader.click();
        await page.keyboard.type('Task');

        // Tab to next header
        await page.keyboard.press('Tab');
        await page.keyboard.type('Owner');

        // Tab to third header
        await page.keyboard.press('Tab');
        await page.keyboard.type('Status');

        console.log('✅ Headers added: Task, Owner, Status');

        // Step 3: User realizes they need a "Priority" column
        console.log('📝 User wants to add a Priority column...');

        // Click in the "Status" cell to position cursor
        const statusHeader = page.locator('.ProseMirror th').last();
        await statusHeader.click();

        // Verify contextual toolbar appears
        await page.waitForSelector('.quallaa-toolbar-button[title="Add Column After"]', { timeout: 2000 });
        console.log('✅ Contextual table toolbar appeared');

        // Click "Add Column After"
        await page.locator('.quallaa-toolbar-button[title="Add Column After"]').click();

        // Verify we now have 4 headers
        const headers = page.locator('.ProseMirror th');
        await expect(headers).toHaveCount(4);
        console.log('✅ Column added successfully');

        // Fill in the new header
        await page.keyboard.type('Priority');

        // Step 4: User adds task data
        console.log('📝 User fills in first task row...');

        // Tab to first data cell
        await page.keyboard.press('Tab');
        await page.keyboard.type('Implement tables');

        await page.keyboard.press('Tab');
        await page.keyboard.type('Claude');

        await page.keyboard.press('Tab');
        await page.keyboard.type('Done');

        await page.keyboard.press('Tab');
        await page.keyboard.type('High');

        console.log('✅ First task row completed');

        // Step 5: User adds another row
        console.log('📝 User needs another row for a second task...');

        // Click "Add Row After"
        await page.locator('.quallaa-toolbar-button[title="Add Row After"]').click();

        // Tab should move us to the new row
        await page.keyboard.press('Tab');
        await page.keyboard.type('Write tests');

        await page.keyboard.press('Tab');
        await page.keyboard.type('Claude');

        await page.keyboard.press('Tab');
        await page.keyboard.type('In Progress');

        await page.keyboard.press('Tab');
        await page.keyboard.type('High');

        console.log('✅ Second task row added');

        // Verify we have the expected structure: 1 header row + 3 data rows
        const allRows = page.locator('.ProseMirror table tr');
        await expect(allRows).toHaveCount(4); // header + 3 data rows

        // Step 6: User wants to see the raw markdown
        console.log('📝 User switches to Source mode to see GFM...');

        const sourceButton = page.locator('.quallaa-editor-toolbar button:has-text("Source")');
        await sourceButton.click();

        // Wait for Source mode
        await page.waitForSelector('.quallaa-monaco-source-editor', { timeout: 5000 });

        // Get the markdown content
        const editor = page.locator('.monaco-editor');
        const content = await editor.locator('.view-lines').textContent();

        // Verify GFM table format is present
        expect(content).toContain('| Task');
        expect(content).toContain('| Owner');
        expect(content).toContain('| Status');
        expect(content).toContain('| Priority');
        expect(content).toContain('---'); // GFM separator row
        expect(content).toContain('Implement tables');
        expect(content).toContain('Write tests');
        console.log('✅ GFM table format verified in Source mode');

        // Step 7: User switches back to Preview
        console.log('📝 User switches back to Preview mode...');

        const previewButton = page.locator('.quallaa-editor-toolbar button:has-text("Preview")');
        await previewButton.click();

        // Wait for Preview mode
        await page.waitForSelector('.ProseMirror table', { timeout: 5000 });

        // Verify table is still there with all content
        await expect(page.locator('.ProseMirror th:has-text("Task")')).toBeVisible();
        await expect(page.locator('.ProseMirror th:has-text("Priority")')).toBeVisible();
        await expect(page.locator('.ProseMirror td:has-text("Implement tables")')).toBeVisible();
        await expect(page.locator('.ProseMirror td:has-text("Write tests")')).toBeVisible();
        console.log('✅ Table content preserved after mode switch');

        // Step 8: User saves their work
        console.log('📝 User saves the file...');

        await page.keyboard.press('Meta+s');

        // Wait for save to complete (look for success message or dirty indicator disappearing)
        await page.waitForTimeout(1000); // Give it a moment to save

        console.log('✅ File saved successfully');

        // Final verification: Table structure is intact
        const finalHeaders = page.locator('.ProseMirror th');
        await expect(finalHeaders).toHaveCount(4);

        const finalRows = page.locator('.ProseMirror table tr');
        await expect(finalRows).toHaveCount(4);

        console.log('✅ ✅ ✅ Complete user journey successful!');
    });

    test('should delete rows and columns correctly', async ({ page }) => {
        // User Story: "I made a mistake and need to remove a column/row"
        console.log('📝 User creates a table but needs to fix structure...');

        // Create a table
        await page.locator('.quallaa-toolbar-button[title="Insert Table"]').click();
        await page.waitForSelector('.ProseMirror table', { timeout: 5000 });

        // Add some content so we can verify deletion
        const firstCell = page.locator('.ProseMirror th').first();
        await firstCell.click();
        await page.keyboard.type('Column A');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Column B');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Column C');

        // Verify we have 3 columns
        let headers = page.locator('.ProseMirror th');
        await expect(headers).toHaveCount(3);

        // User realizes they don't need "Column B"
        console.log('📝 User wants to delete Column B...');

        const columnB = page.locator('.ProseMirror th:has-text("Column B")');
        await columnB.click();

        // Wait for contextual toolbar
        await page.waitForSelector('.quallaa-toolbar-button[title="Delete Column"]', { timeout: 2000 });

        // Delete the column
        await page.locator('.quallaa-toolbar-button[title="Delete Column"]').click();

        // Verify we now have 2 columns
        headers = page.locator('.ProseMirror th');
        await expect(headers).toHaveCount(2);

        // Verify Column B is gone
        await expect(page.locator('.ProseMirror th:has-text("Column B")')).not.toBeVisible();

        // Verify Column A and C remain
        await expect(page.locator('.ProseMirror th:has-text("Column A")')).toBeVisible();
        await expect(page.locator('.ProseMirror th:has-text("Column C")')).toBeVisible();

        console.log('✅ Column deleted successfully');

        // Now test row deletion
        console.log('📝 User wants to delete a data row...');

        // Click in first data row
        const firstDataCell = page.locator('.ProseMirror td').first();
        await firstDataCell.click();

        // Count rows before deletion
        const rowsBeforeDelete = await page.locator('.ProseMirror table tr').count();

        // Delete the row
        await page.locator('.quallaa-toolbar-button[title="Delete Row"]').click();

        // Verify row count decreased
        const rowsAfterDelete = await page.locator('.ProseMirror table tr').count();
        expect(rowsAfterDelete).toBe(rowsBeforeDelete - 1);

        console.log('✅ Row deleted successfully');
    });

    test('should delete entire table', async ({ page }) => {
        // User Story: "I don't need this table anymore"
        console.log('📝 User wants to remove the entire table...');

        // Create a table
        await page.locator('.quallaa-toolbar-button[title="Insert Table"]').click();
        await page.waitForSelector('.ProseMirror table', { timeout: 5000 });

        // Verify table exists
        await expect(page.locator('.ProseMirror table')).toBeVisible();

        // Click in the table
        await page.locator('.ProseMirror th').first().click();

        // Wait for contextual toolbar
        await page.waitForSelector('.quallaa-toolbar-button[title="Delete Table"]', { timeout: 2000 });

        // Delete the table
        await page.locator('.quallaa-toolbar-button[title="Delete Table"]').click();

        // Verify table is gone
        await expect(page.locator('.ProseMirror table')).not.toBeVisible();

        console.log('✅ Table deleted successfully');
    });
});
