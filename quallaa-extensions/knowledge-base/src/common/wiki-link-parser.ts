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
 * Parser for wiki-style links [[Note Name]]
 */

import { WikiLink } from './knowledge-base-protocol';

/**
 * Regular expression to match wiki links: [[target]] or [[target|display text]]
 * Based on Foam's regex: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
 * Captures:
 * - Group 1: target (required)
 * - Group 2: display text (optional, after |)
 */
export const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parse all wiki links from a document's content
 */
export function parseWikiLinks(content: string): WikiLink[] {
    const links: WikiLink[] = [];
    const regex = new RegExp(WIKI_LINK_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const target = match[1].trim();
        const displayText = match[2]?.trim();

        links.push({
            target,
            displayText,
            start: match.index,
            end: match.index + match[0].length,
            resolved: false // Resolution happens later via service
        });
    }

    return links;
}

/**
 * Check if a position in the document is inside a wiki link
 */
export function isPositionInWikiLink(content: string, position: number): WikiLink | undefined {
    const links = parseWikiLinks(content);
    return links.find(link => position >= link.start && position <= link.end);
}

/**
 * Extract the wiki link at a specific position (for completion)
 * Returns the partial link text and position info
 * Stops at | character to only complete the target, not display text
 */
export function getWikiLinkAtPosition(content: string, position: number): { text: string; start: number; end: number } | undefined {
    // Look backwards for [[
    let start = position;
    while (start > 0 && content.substring(start - 2, start) !== '[[') {
        start--;
        // If we hit a newline or closing ]], there's no wiki link here
        if (content[start] === '\n' || content.substring(start, start + 2) === ']]') {
            return undefined;
        }
    }

    // If we found [[, adjust start to after the brackets
    if (content.substring(start - 2, start) === '[[') {
        start -= 2;

        // Look forwards for ]] or |
        let end = position;
        while (end < content.length && content.substring(end, end + 2) !== ']]' && content[end] !== '|') {
            end++;
            // If we hit a newline or opening [[, there's no complete link
            if (content[end] === '\n' || content.substring(end, end + 2) === '[[') {
                // Return partial link for completion
                return {
                    text: content.substring(start + 2, position),
                    start: start + 2,
                    end: position
                };
            }
        }

        // Found complete or partial link (stop at | for piped links)
        const endPos = end < content.length && (content.substring(end, end + 2) === ']]' || content[end] === '|') ? end : position;
        return {
            text: content.substring(start + 2, Math.min(endPos, position)),
            start: start + 2,
            end: endPos
        };
    }

    return undefined;
}
