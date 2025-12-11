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
 * Utility for parsing frontmatter from markdown files
 */

import * as matter from 'gray-matter';

export interface FrontmatterData {
    /** Title from frontmatter (takes precedence over filename) */
    title?: string;
    /** Aliases (alternative names for this note) */
    aliases?: string[];
    /** Tags from frontmatter */
    tags?: string[];
    /** All other frontmatter fields */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export interface ParsedNote {
    /** The markdown content without frontmatter */
    content: string;
    /** Parsed frontmatter data */
    frontmatter: FrontmatterData;
}

/**
 * Parse frontmatter from markdown content
 * Handles YAML frontmatter delimited by ---
 */
export function parseFrontmatter(content: string): ParsedNote {
    try {
        const result = matter(content);

        // Normalize aliases to array
        let aliases: string[] | undefined;
        if (result.data.aliases) {
            if (Array.isArray(result.data.aliases)) {
                aliases = result.data.aliases.map(a => String(a));
            } else {
                aliases = [String(result.data.aliases)];
            }
        }

        // Normalize tags to array
        let tags: string[] | undefined;
        if (result.data.tags) {
            if (Array.isArray(result.data.tags)) {
                tags = result.data.tags.map(t => String(t));
            } else {
                tags = [String(result.data.tags)];
            }
        }

        return {
            content: result.content,
            frontmatter: {
                ...result.data,
                title: result.data.title ? String(result.data.title) : undefined,
                aliases,
                tags,
            },
        };
    } catch (error) {
        // If parsing fails, return content as-is with empty frontmatter
        console.warn('Failed to parse frontmatter:', error);
        return {
            content,
            frontmatter: {},
        };
    }
}

/**
 * Extract title from frontmatter or content
 * Priority: frontmatter title > first H1 heading > filename
 */
export function extractTitle(content: string, basename: string): string {
    const parsed = parseFrontmatter(content);

    // 1. Check frontmatter
    if (parsed.frontmatter.title) {
        return parsed.frontmatter.title;
    }

    // 2. Check for first H1 heading
    const h1Match = parsed.content.match(/^#\s+(.+)$/m);
    if (h1Match) {
        return h1Match[1].trim();
    }

    // 3. Fall back to basename
    return basename;
}

/**
 * Extract tags from both frontmatter and content (#tag syntax)
 */
export function extractTags(content: string): string[] {
    const parsed = parseFrontmatter(content);
    const tags = new Set<string>();

    // Add frontmatter tags
    if (parsed.frontmatter.tags) {
        parsed.frontmatter.tags.forEach(tag => tags.add(tag));
    }

    // Extract inline #tags (but not inside code blocks)
    // Simple regex for Phase 1.3, will be enhanced in Phase 2
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
    let match;
    // eslint-disable-next-line no-null/no-null
    while ((match = tagRegex.exec(parsed.content)) !== null) {
        tags.add(match[1]);
    }

    return Array.from(tags).sort();
}
