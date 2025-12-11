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
 * Tests for knowledge base service implementation
 * Using real temporary filesystem for integration testing
 */

/* eslint-disable @typescript-eslint/no-explicit-any, no-unused-expressions, no-null/no-null */
import { expect } from 'chai';
import { KnowledgeBaseServiceImpl } from './knowledge-base-service-impl';
import { parseWikiLinks } from '../common/wiki-link-parser';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Helper to create a temporary workspace with test files
 */
async function createTempWorkspace(files: { name: string; content: string }[]): Promise<string> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));

    for (const file of files) {
        const filePath = path.join(tempDir, file.name);
        const dir = path.dirname(filePath);

        // Create subdirectories if needed
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, file.content, 'utf-8');
    }

    return tempDir;
}

/**
 * Helper to clean up temporary workspace
 */
async function cleanupTempWorkspace(tempDir: string): Promise<void> {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

describe('KnowledgeBaseServiceImpl', () => {
    let service: KnowledgeBaseServiceImpl;
    let tempWorkspace: string;

    afterEach(async () => {
        // Clean up temp workspace after each test
        if (tempWorkspace) {
            await cleanupTempWorkspace(tempWorkspace);
        }
    });

    describe('getAllNotes', () => {
        it('should index and return all markdown notes', async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Note1.md', content: '# Note 1\nContent here' },
                { name: 'Note2.md', content: '# Note 2\nMore content' },
                { name: 'subdir/Note3.md', content: '# Note 3\nNested content' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            const notes = await service.getAllNotes();

            expect(notes).to.have.length(3);
            const basenames = notes.map(n => n.basename).sort();
            expect(basenames).to.deep.equal(['Note1', 'Note2', 'Note3']);
        });

        it('should cache results for performance', async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Note1.md', content: '# Note 1' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            const notes1 = await service.getAllNotes();

            // Add another file (but don't re-index)
            fs.writeFileSync(path.join(tempWorkspace, 'Note2.md'), '# Note 2', 'utf-8');

            const notes2 = await service.getAllNotes();

            // Should still have cached result (1 note, not 2)
            expect(notes2).to.have.length(1);
            expect(notes1).to.deep.equal(notes2);
        });

        it('should handle empty workspace', async () => {
            tempWorkspace = await createTempWorkspace([]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            const notes = await service.getAllNotes();

            expect(notes).to.be.an('array').that.is.empty;
        });

        it('should extract title from filename', async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'My Awesome Note.md', content: 'Content without frontmatter' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            const notes = await service.getAllNotes();

            expect(notes).to.have.length(1);
            expect(notes[0].title).to.equal('My Awesome Note');
        });
    });

    describe('searchNotes', () => {
        beforeEach(async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Authentication.md', content: '# Authentication\nOAuth and security' },
                { name: 'Authorization.md', content: '# Authorization\nPermissions' },
                { name: 'Security.md', content: '# Security\nBest practices' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);
        });

        it('should find notes by partial match', async () => {
            const results = await service.searchNotes('auth');

            expect(results.length).to.be.at.least(1);
            const titles = results.map(n => n.title.toLowerCase());
            expect(titles.some(t => t.includes('auth'))).to.be.true;
        });

        it('should be case insensitive', async () => {
            const results = await service.searchNotes('AUTHENTICATION');

            expect(results).to.have.length(1);
            expect(results[0].title).to.equal('Authentication');
        });

        it('should prioritize exact matches', async () => {
            const results = await service.searchNotes('Security');

            expect(results.length).to.be.at.least(1);
            expect(results[0].title).to.equal('Security');
        });

        it('should prioritize starts-with matches', async () => {
            const results = await service.searchNotes('Auth');

            expect(results.length).to.be.at.least(2);
            expect(results[0].title).to.be.oneOf(['Authentication', 'Authorization']);
        });

        it('should return empty array when no matches', async () => {
            const results = await service.searchNotes('NonExistent');

            expect(results).to.be.an('array').that.is.empty;
        });

        it('should limit results to 50', async () => {
            // Create 60 notes
            const files = Array.from({ length: 60 }, (_, i) => ({
                name: `Note${i + 1}.md`,
                content: `# Note ${i + 1}`
            }));

            await cleanupTempWorkspace(tempWorkspace);
            tempWorkspace = await createTempWorkspace(files);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            const results = await service.searchNotes('Note');

            expect(results).to.have.length(50);
        });
    });

    describe('findNoteByTitle', () => {
        beforeEach(async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Exact-Match.md', content: '# Exact Match' },
                { name: 'Case-Insensitive.md', content: '# Case Test' },
                { name: 'Note-with-dashes.md', content: '# Note with dashes' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);
        });

        it('should find note by exact basename match', async () => {
            const note = await service.findNoteByTitle('Exact-Match');

            expect(note).to.not.be.undefined;
            expect(note!.basename).to.equal('Exact-Match');
        });

        it('should be case insensitive', async () => {
            const note = await service.findNoteByTitle('CASE-INSENSITIVE');

            expect(note).to.not.be.undefined;
            expect(note!.basename).to.equal('Case-Insensitive');
        });

        it('should handle .md extension in query', async () => {
            const note = await service.findNoteByTitle('Exact-Match.md');

            expect(note).to.not.be.undefined;
            expect(note!.basename).to.equal('Exact-Match');
        });

        it('should return undefined for non-existent note', async () => {
            const note = await service.findNoteByTitle('NonExistent');

            expect(note).to.be.undefined;
        });

        it('should handle special characters', async () => {
            const note = await service.findNoteByTitle('Note-with-dashes');

            expect(note).to.not.be.undefined;
            expect(note!.title).to.equal('Note with dashes');
        });
    });

    // Note: parseWikiLinks tests are in wiki-link-parser.spec.ts
    // Parser is now in common/ and used locally by both frontend and backend

    describe('resolveWikiLink', () => {
        beforeEach(async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Existing Note.md', content: '# Existing Note' },
                { name: 'Another Note.md', content: '# Another Note' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);
        });

        it('should resolve existing wiki link', async () => {
            const note = await service.resolveWikiLink('Existing Note');

            expect(note).to.not.be.undefined;
            expect(note!.title).to.equal('Existing Note');
        });

        it('should return undefined for broken link', async () => {
            const note = await service.resolveWikiLink('Broken Link');

            expect(note).to.be.undefined;
        });

        it('should be case insensitive when resolving', async () => {
            const note = await service.resolveWikiLink('EXISTING NOTE');

            expect(note).to.not.be.undefined;
            expect(note!.title).to.equal('Existing Note');
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete workflow: index -> search -> resolve', async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Note A.md', content: '# Note A\n\nLinks to [[Note B]]' },
                { name: 'Note B.md', content: '# Note B\n\nLinks to [[Note C]]' },
                { name: 'Note C.md', content: '# Note C\n\nNo links' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            // Test indexing
            const allNotes = await service.getAllNotes();
            expect(allNotes).to.have.length(3);

            // Test searching
            const searchResults = await service.searchNotes('Note');
            expect(searchResults.length).to.be.at.least(3);

            // Test resolving
            const noteA = await service.findNoteByTitle('Note A');
            expect(noteA).to.not.be.undefined;

            const noteB = await service.resolveWikiLink('Note B');
            expect(noteB).to.not.be.undefined;
        });

        it('should parse and resolve wiki links from content', async () => {
            tempWorkspace = await createTempWorkspace([
                { name: 'Note A.md', content: 'See [[Note A]] and [[Note B]] but not [[Missing Note]]' },
                { name: 'Note B.md', content: '# Note B' },
                { name: 'Note C.md', content: '# Note C' }
            ]);

            service = new KnowledgeBaseServiceImpl();
            await service.indexWorkspace(`file://${tempWorkspace}`);

            const content = 'See [[Note A]] and [[Note B]] but not [[Missing Note]]';
            const links = parseWikiLinks(content);

            expect(links).to.have.length(3);

            // Resolve each link
            const resolvedA = await service.resolveWikiLink(links[0].target);
            const resolvedB = await service.resolveWikiLink(links[1].target);
            const resolvedMissing = await service.resolveWikiLink(links[2].target);

            expect(resolvedA).to.not.be.undefined;
            expect(resolvedB).to.not.be.undefined;
            expect(resolvedMissing).to.be.undefined;
        });
    });
});
