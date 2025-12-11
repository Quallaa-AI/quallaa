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
 * Backend implementation of the knowledge base service
 * Phase 1.3: Enhanced with file watching, frontmatter parsing, and incremental updates
 */

import { injectable, postConstruct } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { KnowledgeBaseService, Note, Backlink } from '../common/knowledge-base-protocol';
import { parseWikiLinks } from '../common/wiki-link-parser';
import { parseFrontmatter, extractTags, extractTitle } from './frontmatter-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';

/**
 * Internal structure for tracking backlink details
 */
interface BacklinkEntry {
    sourceUri: string;
    line: number;
    context: string;
}

@injectable()
export class KnowledgeBaseServiceImpl implements KnowledgeBaseService {
    // Index: URI -> Note
    private noteIndex: Map<string, Note> = new Map();

    // Reverse indices for fast lookups
    private titleIndex: Map<string, string[]> = new Map(); // normalized title -> URIs[]
    private aliasIndex: Map<string, string[]> = new Map(); // normalized alias -> URIs[]

    // Backlinks index: target URI -> BacklinkEntry[]
    // Following Foam's connections pattern
    private backlinksIndex: Map<string, BacklinkEntry[]> = new Map();

    private workspaceRoot: URI | undefined;
    private watcher: chokidar.FSWatcher | undefined;
    private isIndexing = false;
    private indexPromise: Promise<void> | undefined;

    @postConstruct()
    protected initialize(): void {
        console.log('[KnowledgeBase] Service initializing...');
        // Workspace root will be set when first file is opened or by explicit call
    }

    /**
     * Get all notes in the workspace
     */
    async getAllNotes(): Promise<Note[]> {
        await this.ensureIndexed();
        return Array.from(this.noteIndex.values());
    }

    /**
     * Search notes by title (fuzzy match)
     */
    async searchNotes(query: string): Promise<Note[]> {
        const allNotes = await this.getAllNotes();
        const lowerQuery = query.toLowerCase();

        return allNotes
            .filter(
                note =>
                    note.title.toLowerCase().includes(lowerQuery) ||
                    note.basename.toLowerCase().includes(lowerQuery) ||
                    note.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))
            )
            .sort((a, b) => {
                // Prioritize exact matches
                const aExact = a.title.toLowerCase() === lowerQuery || a.basename.toLowerCase() === lowerQuery;
                const bExact = b.title.toLowerCase() === lowerQuery || b.basename.toLowerCase() === lowerQuery;
                if (aExact && !bExact) {
                    return -1;
                }
                if (!aExact && bExact) {
                    return 1;
                }

                // Then prioritize starts-with
                const aStarts = a.title.toLowerCase().startsWith(lowerQuery) || a.basename.toLowerCase().startsWith(lowerQuery);
                const bStarts = b.title.toLowerCase().startsWith(lowerQuery) || b.basename.toLowerCase().startsWith(lowerQuery);
                if (aStarts && !bStarts) {
                    return -1;
                }
                if (!aStarts && bStarts) {
                    return 1;
                }

                // Sort by most recently modified
                return b.lastModified - a.lastModified;
            })
            .slice(0, 50); // Limit results
    }

    /**
     * Find a note by exact title or basename match
     * Follows Obsidian-inspired resolution:
     * 1. Exact filename match (case-insensitive)
     * 2. Normalized match (spaces/-/_ equivalent)
     * 3. Alias match
     * 4. Path-based if target includes folder (e.g., "Folder/Note")
     * 5. Most recently modified if still ambiguous
     */
    async findNoteByTitle(title: string): Promise<Note | undefined> {
        await this.ensureIndexed();

        // Remove .md extension if present
        const cleanTitle = title.replace(/\.md$/i, '');

        // Check if this is a path-based link (contains / or \)
        if (cleanTitle.includes('/') || cleanTitle.includes('\\')) {
            return this.findNoteByPath(cleanTitle);
        }

        // Normalize for matching
        const normalized = this.normalizeTitle(cleanTitle);

        // 1. Try title index
        const titleMatches = this.titleIndex.get(normalized);
        if (titleMatches && titleMatches.length > 0) {
            if (titleMatches.length === 1) {
                return this.noteIndex.get(titleMatches[0]);
            }
            // Multiple matches - return most recent
            return this.getMostRecentNote(titleMatches.map(uri => this.noteIndex.get(uri)!));
        }

        // 2. Try alias index
        const aliasMatches = this.aliasIndex.get(normalized);
        if (aliasMatches && aliasMatches.length > 0) {
            if (aliasMatches.length === 1) {
                return this.noteIndex.get(aliasMatches[0]);
            }
            return this.getMostRecentNote(aliasMatches.map(uri => this.noteIndex.get(uri)!));
        }

        return undefined;
    }

    /**
     * Find note by path (e.g., "Folder/Note")
     */
    private findNoteByPath(pathTarget: string): Note | undefined {
        const normalized = pathTarget.toLowerCase().replace(/\\/g, '/');

        // Try exact path match
        const matches = Array.from(this.noteIndex.values()).filter(n => {
            const notePath = n.path.toLowerCase().replace(/\\/g, '/');
            return notePath.endsWith(normalized) || notePath.endsWith(normalized + '.md');
        });

        if (matches.length === 1) {
            return matches[0];
        }
        if (matches.length > 1) {
            return this.getMostRecentNote(matches);
        }

        return undefined;
    }

    /**
     * Normalize title for matching (spaces, hyphens, underscores are equivalent)
     */
    private normalizeTitle(title: string): string {
        return title.toLowerCase().replace(/[\s\-_]+/g, '-');
    }

    /**
     * Get the most recently modified note from a list
     */
    private getMostRecentNote(notes: Note[]): Note {
        return notes.reduce((most, current) => (current.lastModified > most.lastModified ? current : most));
    }

    /**
     * Resolve a wiki link target to a note
     */
    async resolveWikiLink(target: string): Promise<Note | undefined> {
        return this.findNoteByTitle(target);
    }

    /**
     * Create a new note at the specified location
     * Returns the URI of the created note
     */
    async createNote(target: string, currentFileUri?: string): Promise<string> {
        // Remove .md extension if present
        const cleanTarget = target.replace(/\.md$/i, '');

        let noteUri: URI;

        // Check if target includes a path
        if (cleanTarget.includes('/') || cleanTarget.includes('\\')) {
            // Create in specified folder relative to workspace root
            const defaultLocation = await this.getDefaultNoteLocation();
            const baseUri = new URI(defaultLocation);
            const normalized = cleanTarget.replace(/\\/g, '/');
            noteUri = baseUri.resolve(normalized + '.md');
        } else {
            // Create in default location
            const defaultLocation = await this.getDefaultNoteLocation();
            const baseUri = new URI(defaultLocation);
            noteUri = baseUri.resolve(cleanTarget + '.md');
        }

        console.log(`[KnowledgeBase] Will create new note at: ${noteUri.toString()}`);
        return noteUri.toString();
    }

    /**
     * Get the default location for new notes
     */
    async getDefaultNoteLocation(): Promise<string> {
        // Ensure we have indexed at least once
        if (!this.workspaceRoot) {
            await this.ensureIndexed();
        }

        if (!this.workspaceRoot) {
            throw new Error('No workspace root found - no notes indexed yet');
        }

        return this.workspaceRoot.toString();
    }

    /**
     * Index a workspace
     * Called by frontend with explicit workspace root URI
     */
    async indexWorkspace(workspaceRootUri: string): Promise<void> {
        const newRoot = new URI(workspaceRootUri);

        // Only re-index if workspace changed
        if (this.workspaceRoot && this.workspaceRoot.toString() === newRoot.toString()) {
            console.log('[KnowledgeBase] Workspace already indexed:', newRoot.toString());
            return;
        }

        console.log('[KnowledgeBase] Indexing workspace:', newRoot.toString());
        this.workspaceRoot = newRoot;

        // Stop existing watcher
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = undefined;
        }

        // Clear indices and re-index
        this.clearIndices();
        await this.startIndexing();
    }

    /**
     * Ensure workspace is indexed before operations
     */
    private async ensureIndexed(): Promise<void> {
        if (this.indexPromise) {
            await this.indexPromise;
            return;
        }

        if (this.noteIndex.size === 0 && this.workspaceRoot) {
            await this.startIndexing();
        }
    }

    /**
     * Start indexing and file watching
     */
    private async startIndexing(): Promise<void> {
        if (this.isIndexing || !this.workspaceRoot) {
            return;
        }

        this.isIndexing = true;
        this.indexPromise = this.performIndexing();

        try {
            await this.indexPromise;
            this.startFileWatching();
        } finally {
            this.isIndexing = false;
            this.indexPromise = undefined;
        }
    }

    /**
     * Perform the actual indexing of markdown files in the workspace
     */
    private async performIndexing(): Promise<void> {
        if (!this.workspaceRoot) {
            console.warn('[KnowledgeBase] No workspace root - cannot index');
            return;
        }

        const fsPath = this.workspaceRoot.path.fsPath();
        console.log('[KnowledgeBase] Indexing workspace:', fsPath);

        const startTime = Date.now();
        let fileCount = 0;

        try {
            const files = this.findMarkdownFilesRecursive(fsPath);

            for (const filePath of files) {
                await this.indexFile(filePath);
                fileCount++;
            }

            const duration = Date.now() - startTime;
            console.log(`[KnowledgeBase] Indexed ${fileCount} files in ${duration}ms`);
        } catch (error) {
            console.error('[KnowledgeBase] Error indexing workspace:', error);
        }
    }

    /**
     * Recursively find all .md files
     */
    private findMarkdownFilesRecursive(dir: string): string[] {
        const files: string[] = [];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Skip hidden folders and node_modules
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        files.push(...this.findMarkdownFilesRecursive(fullPath));
                    }
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`[KnowledgeBase] Error reading directory ${dir}:`, error);
        }

        return files;
    }

    /**
     * Index a single file
     */
    private async indexFile(filePath: string): Promise<void> {
        try {
            const uri = new URI('file://' + filePath);
            const basename = uri.path.base.replace(/\.md$/, '');

            // Get file stats for lastModified
            const stats = fs.statSync(filePath);

            // Read and parse file content
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = parseFrontmatter(content);

            // Extract metadata (title priority: frontmatter > H1 heading > basename)
            const title = extractTitle(content, basename);
            const aliases = parsed.frontmatter.aliases || [];
            const tags = extractTags(content);

            const note: Note = {
                uri: uri.toString(),
                title,
                basename,
                path: uri.path.toString(),
                lastModified: stats.mtimeMs,
                aliases,
                tags,
                frontmatter: parsed.frontmatter,
            };

            // Update main index
            this.noteIndex.set(uri.toString(), note);

            // Update title index
            const normalizedTitle = this.normalizeTitle(title);
            this.addToIndex(this.titleIndex, normalizedTitle, uri.toString());

            // Also index basename if different from title
            if (basename !== title) {
                const normalizedBasename = this.normalizeTitle(basename);
                this.addToIndex(this.titleIndex, normalizedBasename, uri.toString());
            }

            // Update alias index
            for (const alias of aliases) {
                const normalizedAlias = this.normalizeTitle(alias);
                this.addToIndex(this.aliasIndex, normalizedAlias, uri.toString());
            }

            // Build backlinks for this file's wiki links
            this.buildBacklinksForFile(uri.toString(), content);
        } catch (error) {
            console.error(`[KnowledgeBase] Error indexing file ${filePath}:`, error);
        }
    }

    /**
     * Remove a file from the index
     */
    private removeFromIndex(fileUri: string): void {
        const note = this.noteIndex.get(fileUri);
        if (!note) {
            return;
        }

        // Remove from main index
        this.noteIndex.delete(fileUri);

        // Remove from title index
        this.removeFromReverseIndex(this.titleIndex, this.normalizeTitle(note.title), fileUri);
        if (note.basename !== note.title) {
            this.removeFromReverseIndex(this.titleIndex, this.normalizeTitle(note.basename), fileUri);
        }

        // Remove from alias index
        if (note.aliases) {
            for (const alias of note.aliases) {
                this.removeFromReverseIndex(this.aliasIndex, this.normalizeTitle(alias), fileUri);
            }
        }

        // Remove backlinks from this source file
        this.removeBacklinksFromSource(fileUri);
    }

    /**
     * Add entry to a reverse index
     */
    private addToIndex(index: Map<string, string[]>, key: string, value: string): void {
        const existing = index.get(key) || [];
        if (!existing.includes(value)) {
            existing.push(value);
        }
        index.set(key, existing);
    }

    /**
     * Remove entry from a reverse index
     */
    private removeFromReverseIndex(index: Map<string, string[]>, key: string, value: string): void {
        const existing = index.get(key);
        if (existing) {
            const filtered = existing.filter(v => v !== value);
            if (filtered.length > 0) {
                index.set(key, filtered);
            } else {
                index.delete(key);
            }
        }
    }

    /**
     * Start file watching for real-time updates
     */
    private startFileWatching(): void {
        if (!this.workspaceRoot || this.watcher) {
            return;
        }

        const fsPath = this.workspaceRoot.path.fsPath();

        console.log('[KnowledgeBase] Starting file watcher on:', fsPath);

        // Watch the directory itself, filtering for .md files in event handlers
        // This avoids glob pattern issues with chokidar
        this.watcher = chokidar.watch(fsPath, {
            ignoreInitial: true, // Don't fire for initial files
            ignored: /(node_modules|\.git)/, // Use regex for better performance
            persistent: true,
            usePolling: false, // Use native fsevents on macOS
            depth: undefined, // Watch all subdirectories
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50,
            },
        });

        // Enhanced logging: ready event
        this.watcher.on('ready', () => {
            console.log('[KnowledgeBase] ✅ File watcher ready and monitoring');
            const watched = this.watcher?.getWatched();
            if (watched) {
                const dirCount = Object.keys(watched).length;
                const fileCount = Object.values(watched).reduce((sum, files) => sum + files.length, 0);
                console.log(`[KnowledgeBase] Watching ${dirCount} directories with ${fileCount} files`);
                console.log('[KnowledgeBase] Watched directories:', Object.keys(watched).slice(0, 5), '...');
            }
        });

        // Enhanced logging: all events
        this.watcher.on('all', (event, filePath) => {
            console.log(`[KnowledgeBase] 📡 Watcher event: "${event}" - ${filePath}`);
        });

        this.watcher.on('add', async filePath => {
            // Filter for .md files only
            if (!filePath.endsWith('.md')) {
                return;
            }
            console.log('[KnowledgeBase] ➕ File added:', filePath);
            await this.indexFile(filePath);
        });

        this.watcher.on('change', async filePath => {
            // Filter for .md files only
            if (!filePath.endsWith('.md')) {
                return;
            }
            console.log('[KnowledgeBase] 📝 File changed:', filePath);
            const uri = new URI('file://' + filePath);
            this.removeFromIndex(uri.toString());
            await this.indexFile(filePath);
        });

        this.watcher.on('unlink', filePath => {
            // Filter for .md files only
            if (!filePath.endsWith('.md')) {
                return;
            }
            console.log('[KnowledgeBase] ➖ File deleted:', filePath);
            const uri = new URI('file://' + filePath);
            this.removeFromIndex(uri.toString());
        });

        this.watcher.on('error', error => {
            console.error('[KnowledgeBase] ❌ File watcher error:', error);
        });
    }

    /**
     * Clear all indices
     */
    private clearIndices(): void {
        this.noteIndex.clear();
        this.titleIndex.clear();
        this.aliasIndex.clear();
        this.backlinksIndex.clear();
    }

    /**
     * Get all backlinks (incoming links) to a note
     * Following Foam's connections pattern
     */
    async getBacklinks(noteUri: string): Promise<Backlink[]> {
        await this.ensureIndexed();

        const entries = this.backlinksIndex.get(noteUri) || [];
        const backlinks: Backlink[] = [];

        for (const entry of entries) {
            const sourceNote = this.noteIndex.get(entry.sourceUri);
            if (sourceNote) {
                backlinks.push({
                    sourceUri: entry.sourceUri,
                    sourceTitle: sourceNote.title,
                    line: entry.line,
                    context: entry.context,
                });
            }
        }

        return backlinks;
    }

    /**
     * Build backlinks index for a source file
     * Parses wiki links and adds them to the backlinks index
     */
    private buildBacklinksForFile(sourceUri: string, content: string): void {
        const lines = content.split('\n');
        const wikiLinks = parseWikiLinks(content);

        for (const link of wikiLinks) {
            // Find which line the link is on
            let charCount = 0;
            let lineNumber = 0;
            for (let i = 0; i < lines.length; i++) {
                if (charCount + lines[i].length >= link.start) {
                    lineNumber = i;
                    break;
                }
                charCount += lines[i].length + 1; // +1 for newline
            }

            // Get the line context
            const context = lines[lineNumber] || '';

            // Try to resolve the link to find target URI
            const targetNote = this.findNoteByTitleSync(link.target);
            if (targetNote) {
                this.addBacklink(targetNote.uri, {
                    sourceUri,
                    line: lineNumber + 1, // Convert to 1-based line numbers
                    context: context.trim(),
                });
            }
        }
    }

    /**
     * Synchronous version of findNoteByTitle for use during indexing
     */
    private findNoteByTitleSync(title: string): Note | undefined {
        // Remove .md extension if present
        const cleanTitle = title.replace(/\.md$/i, '');

        // Check if this is a path-based link
        if (cleanTitle.includes('/') || cleanTitle.includes('\\')) {
            return this.findNoteByPath(cleanTitle);
        }

        // Normalize for matching
        const normalized = this.normalizeTitle(cleanTitle);

        // Try title index
        const titleMatches = this.titleIndex.get(normalized);
        if (titleMatches && titleMatches.length > 0) {
            const notes = titleMatches.map(uri => this.noteIndex.get(uri)!).filter(n => n);
            if (notes.length > 0) {
                return this.getMostRecentNote(notes);
            }
        }

        // Try alias index
        const aliasMatches = this.aliasIndex.get(normalized);
        if (aliasMatches && aliasMatches.length > 0) {
            const notes = aliasMatches.map(uri => this.noteIndex.get(uri)!).filter(n => n);
            if (notes.length > 0) {
                return this.getMostRecentNote(notes);
            }
        }

        return undefined;
    }

    /**
     * Add a backlink to the index
     */
    private addBacklink(targetUri: string, entry: BacklinkEntry): void {
        const existing = this.backlinksIndex.get(targetUri) || [];
        // Avoid duplicates
        const isDuplicate = existing.some(e => e.sourceUri === entry.sourceUri && e.line === entry.line);
        if (!isDuplicate) {
            existing.push(entry);
            this.backlinksIndex.set(targetUri, existing);
        }
    }

    /**
     * Remove all backlinks from a source file
     */
    private removeBacklinksFromSource(sourceUri: string): void {
        // Remove entries where sourceUri matches
        for (const [targetUri, entries] of this.backlinksIndex.entries()) {
            const filtered = entries.filter(e => e.sourceUri !== sourceUri);
            if (filtered.length > 0) {
                this.backlinksIndex.set(targetUri, filtered);
            } else {
                this.backlinksIndex.delete(targetUri);
            }
        }
    }

    /**
     * Get the complete knowledge graph
     * Following Foam's dataviz pattern
     */
    async getGraphData(): Promise<import('../common/knowledge-base-protocol').GraphData> {
        await this.ensureIndexed();

        const nodes: import('../common/knowledge-base-protocol').GraphNode[] = [];
        const links: import('../common/knowledge-base-protocol').GraphEdge[] = [];
        const nodeIds = new Set<string>();
        const placeholderIds = new Set<string>();

        // Create nodes for all indexed notes
        for (const note of this.noteIndex.values()) {
            nodes.push({
                id: note.uri,
                label: note.title,
                type: 'note',
            });
            nodeIds.add(note.uri);
        }

        // Parse wiki links from all notes to create edges
        for (const note of this.noteIndex.values()) {
            try {
                const content = fs.readFileSync(new URI(note.uri).path.fsPath(), 'utf8');
                const wikiLinks = parseWikiLinks(content);

                for (const link of wikiLinks) {
                    // Try to resolve the link
                    const targetNote = this.findNoteByTitleSync(link.target);

                    if (targetNote) {
                        // Resolved link - create edge to existing note
                        links.push({
                            source: note.uri,
                            target: targetNote.uri,
                        });
                    } else {
                        // Unresolved link - create placeholder node and edge
                        const placeholderId = `placeholder:${link.target}`;

                        if (!placeholderIds.has(placeholderId)) {
                            nodes.push({
                                id: placeholderId,
                                label: link.target,
                                type: 'placeholder',
                            });
                            placeholderIds.add(placeholderId);
                        }

                        links.push({
                            source: note.uri,
                            target: placeholderId,
                        });
                    }
                }
            } catch (error) {
                console.error(`[KnowledgeBase] Error parsing links for graph from ${note.uri}:`, error);
            }
        }

        return { nodes, links };
    }

    /**
     * Get all tags in the workspace with their associated notes
     * Following Foam's tags pattern
     */
    async getTagsIndex(): Promise<import('../common/knowledge-base-protocol').TagEntry[]> {
        await this.ensureIndexed();

        // Build tag index from all notes
        const tagMap = new Map<string, Set<string>>();

        for (const note of this.noteIndex.values()) {
            if (note.tags && note.tags.length > 0) {
                for (const tag of note.tags) {
                    // Normalize tag (remove # if present, lowercase)
                    const normalizedTag = tag.replace(/^#/, '').toLowerCase();

                    if (!tagMap.has(normalizedTag)) {
                        tagMap.set(normalizedTag, new Set());
                    }
                    tagMap.get(normalizedTag)!.add(note.uri);
                }
            }
        }

        // Convert to TagEntry array, sorted by count (most popular first)
        const tagEntries: import('../common/knowledge-base-protocol').TagEntry[] = [];
        for (const [tag, noteUris] of tagMap.entries()) {
            tagEntries.push({
                tag,
                count: noteUris.size,
                noteUris: Array.from(noteUris),
            });
        }

        // Sort by count descending, then alphabetically
        tagEntries.sort((a, b) => {
            if (a.count !== b.count) {
                return b.count - a.count;
            }
            return a.tag.localeCompare(b.tag);
        });

        return tagEntries;
    }

    /**
     * Get all notes that have a specific tag
     * @param tag - Tag name (with or without # prefix)
     */
    async getNotesWithTag(tag: string): Promise<import('../common/knowledge-base-protocol').Note[]> {
        await this.ensureIndexed();

        // Normalize tag (remove # if present, lowercase)
        const normalizedTag = tag.replace(/^#/, '').toLowerCase();

        const notesWithTag: import('../common/knowledge-base-protocol').Note[] = [];

        for (const note of this.noteIndex.values()) {
            if (note.tags && note.tags.length > 0) {
                // Check if any of the note's tags match (case-insensitive)
                const hasTag = note.tags.some(
                    t => t.replace(/^#/, '').toLowerCase() === normalizedTag
                );
                if (hasTag) {
                    notesWithTag.push(note);
                }
            }
        }

        // Sort by title
        notesWithTag.sort((a, b) => a.title.localeCompare(b.title));

        return notesWithTag;
    }
}
