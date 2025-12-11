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
 * Protocol definitions for knowledge base backend/frontend communication
 */

export const KnowledgeBasePath = '/services/knowledge-base';

export const KnowledgeBaseService = Symbol('KnowledgeBaseService');

/**
 * Represents a note in the knowledge base
 */
export interface Note {
    /** File URI */
    uri: string;
    /** Note title (derived from filename or frontmatter) */
    title: string;
    /** File basename without extension */
    basename: string;
    /** Full file path */
    path: string;
    /** Last modified timestamp (Unix milliseconds) */
    lastModified: number;
    /** Aliases from frontmatter (alternative names for this note) */
    aliases?: string[];
    /** Tags from frontmatter or content */
    tags?: string[];
    /** Full frontmatter data (for future extensions) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    frontmatter?: Record<string, any>;
}

/**
 * Represents a wiki link found in a document
 */
export interface WikiLink {
    /** The target file/note (before | if piped) */
    target: string;
    /** Optional display text (after | if piped) */
    displayText?: string;
    /** Start position in document */
    start: number;
    /** End position in document */
    end: number;
    /** Whether this link resolves to an existing note */
    resolved: boolean;
    /** The resolved note URI if resolved */
    resolvedUri?: string;
}

/**
 * Represents a backlink (incoming link) to a note
 */
export interface Backlink {
    /** Source note URI (the note containing the link) */
    sourceUri: string;
    /** Source note title */
    sourceTitle: string;
    /** Line number where the link appears */
    line: number;
    /** The full line of text containing the link */
    context: string;
}

/**
 * Represents a node in the knowledge graph
 * Following Foam's dataviz pattern
 */
export interface GraphNode {
    /** Unique identifier (note URI) */
    id: string;
    /** Display label (note title) */
    label: string;
    /** Node type: note (existing) or placeholder (unresolved link) */
    type: 'note' | 'placeholder';
}

/**
 * Represents an edge (link) in the knowledge graph
 * Following Foam's dataviz pattern
 */
export interface GraphEdge {
    /** Source note URI */
    source: string;
    /** Target note URI */
    target: string;
}

/**
 * Complete graph data structure for visualization
 * Following Foam's dataviz pattern
 */
export interface GraphData {
    nodes: GraphNode[];
    links: GraphEdge[];
}

/**
 * Represents a tag with its associated notes
 */
export interface TagEntry {
    /** Tag name (without # prefix) */
    tag: string;
    /** Number of notes with this tag */
    count: number;
    /** URIs of notes with this tag */
    noteUris: string[];
}

/**
 * Service for indexing and querying notes in the workspace
 */
export interface KnowledgeBaseService {
    /**
     * Get all notes in the workspace
     */
    getAllNotes(): Promise<Note[]>;

    /**
     * Find notes matching a search query (for autocomplete)
     */
    searchNotes(query: string): Promise<Note[]>;

    /**
     * Find a note by its title or basename
     */
    findNoteByTitle(title: string): Promise<Note | undefined>;

    /**
     * Check if a wiki link resolves to an existing note
     */
    resolveWikiLink(target: string): Promise<Note | undefined>;

    /**
     * Create a new note at the specified location
     * Returns the URI of the created note
     */
    createNote(target: string, currentFileUri?: string): Promise<string>;

    /**
     * Get the default location for new notes
     * Uses workspace root by default
     */
    getDefaultNoteLocation(): Promise<string>;

    /**
     * Index a workspace
     * Called by frontend with explicit workspace root URI
     */
    indexWorkspace(workspaceRoot: string): Promise<void>;

    /**
     * Get all backlinks (incoming links) to a note
     * Following Foam's connections pattern
     */
    getBacklinks(noteUri: string): Promise<Backlink[]>;

    /**
     * Get the complete knowledge graph
     * Returns all notes as nodes and wiki links as edges
     * Following Foam's dataviz pattern
     */
    getGraphData(): Promise<GraphData>;

    /**
     * Get all tags in the workspace with their associated notes
     * Returns a map of tag name to TagEntry
     * Following Foam's tags pattern
     */
    getTagsIndex(): Promise<TagEntry[]>;

    /**
     * Get all notes that have a specific tag
     * @param tag - Tag name (with or without # prefix)
     */
    getNotesWithTag(tag: string): Promise<Note[]>;
}
