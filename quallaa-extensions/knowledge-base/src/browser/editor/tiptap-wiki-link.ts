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

/* eslint-disable @typescript-eslint/tslint/config */
import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { Note } from '../../common/knowledge-base-protocol';

// Regex to match wiki links: [[target]] or [[target|display]]
const WIKI_LINK_INPUT_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

export interface WikiLinkOptions {
    /** Callback when a wiki link is clicked */
    onLinkClick?: (target: string) => void;
    /** Callback to request a wiki link target from user (replaces window.prompt) */
    onRequestLinkTarget?: () => Promise<string | undefined>;
    /** Function to search notes for autocomplete */
    searchNotes?: (query: string) => Promise<Note[]>;
    /** Suggestion configuration (set by extension, not by user) */
    suggestion?: Omit<SuggestionOptions, 'editor'>;
    /** HTML attributes for the wiki link element */
    HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        wikiLink: {
            /**
             * Insert a wiki link
             */
            insertWikiLink: (target: string, displayText?: string) => ReturnType;
        };
    }
}

/**
 * TipTap extension for wiki links ([[target]] or [[target|display]])
 *
 * Renders wiki links as clickable inline elements that can navigate
 * to other notes in the knowledge base.
 */
export const WikiLink = Node.create<WikiLinkOptions>({
    name: 'wikiLink',

    group: 'inline',

    inline: true,

    atom: true, // Treat as a single unit (can't edit inside)

    addOptions() {
        return {
            onLinkClick: undefined,
            onRequestLinkTarget: undefined,
            searchNotes: undefined,
            suggestion: undefined,
            HTMLAttributes: {
                class: 'wiki-link',
            },
        };
    },

    addAttributes() {
        return {
            target: {
                default: undefined,
                parseHTML: element => element.getAttribute('data-target'),
                renderHTML: attributes => {
                    if (!attributes.target) {
                        return {};
                    }
                    return {
                        'data-target': attributes.target,
                    };
                },
            },
            displayText: {
                default: undefined,
                parseHTML: element => element.getAttribute('data-display-text'),
                renderHTML: attributes => {
                    if (!attributes.displayText) {
                        return {};
                    }
                    return {
                        'data-display-text': attributes.displayText,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-wiki-link]',
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        const target = node.attrs.target || '';
        const displayText = node.attrs.displayText || target;

        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-wiki-link': '',
                'data-target': target,
                title: `Go to: ${target}`,
            }),
            displayText,
        ];
    },

    addCommands() {
        return {
            insertWikiLink:
                (target: string, displayText?: string) =>
                ({ commands }) => commands.insertContent({
                        type: this.name,
                        attrs: {
                            target,
                            displayText,
                        },
                    }),
        };
    },

    addInputRules() {
        return [
            nodeInputRule({
                find: WIKI_LINK_INPUT_REGEX,
                type: this.type,
                getAttributes: match => {
                    const target = match[1]?.trim();
                    const displayText = match[2]?.trim();
                    return {
                        target,
                        displayText: displayText || undefined,
                    };
                },
            }),
        ];
    },

    addKeyboardShortcuts() {
        const { onRequestLinkTarget } = this.options;

        return {
            'Mod-Shift-k': () => {
                if (onRequestLinkTarget) {
                    // Use async callback - return true to indicate command handled
                    onRequestLinkTarget().then(target => {
                        if (target) {
                            this.editor.commands.insertWikiLink(target);
                        }
                    });
                    return true;
                } else {
                    // Fallback to window.prompt
                    const target = window.prompt('Enter wiki link target (note name):');
                    if (target) {
                        return this.editor.commands.insertWikiLink(target);
                    }
                    return false;
                }
            },
        };
    },

    addProseMirrorPlugins() {
        const { onLinkClick, suggestion } = this.options;
        const plugins: Plugin[] = [];

        // Add click handler plugin
        plugins.push(
            new Plugin({
                key: new PluginKey('wikiLinkClick'),
                props: {
                    handleClick: (view, pos, event) => {
                        const target = event.target as HTMLElement;

                        // Check if clicked on a wiki link
                        if (target.hasAttribute('data-wiki-link') || target.closest('[data-wiki-link]')) {
                            const linkElement = target.hasAttribute('data-wiki-link')
                                ? target
                                : target.closest('[data-wiki-link]') as HTMLElement;

                            if (linkElement && onLinkClick) {
                                const linkTarget = linkElement.getAttribute('data-target');
                                if (linkTarget) {
                                    event.preventDefault();
                                    onLinkClick(linkTarget);
                                    return true;
                                }
                            }
                        }

                        return false;
                    },
                },
            })
        );

        // Add suggestion plugin if configured
        if (suggestion) {
            plugins.push(
                Suggestion({
                    editor: this.editor,
                    ...suggestion,
                })
            );
        }

        return plugins;
    },
});

/**
 * Parse wiki link syntax from markdown text
 * Returns the wiki link nodes to be inserted
 */
export function parseWikiLinksFromMarkdown(text: string): Array<{
    type: 'text' | 'wikiLink';
    content?: string;
    target?: string;
    displayText?: string;
}> {
    const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const result: Array<{
        type: 'text' | 'wikiLink';
        content?: string;
        target?: string;
        displayText?: string;
    }> = [];

    let lastIndex = 0;
    let match;

    while ((match = WIKI_LINK_REGEX.exec(text))) {
        // Add text before the wiki link
        if (match.index > lastIndex) {
            result.push({
                type: 'text',
                content: text.slice(lastIndex, match.index),
            });
        }

        // Add the wiki link
        const target = match[1].trim();
        const displayText = match[2]?.trim();

        result.push({
            type: 'wikiLink',
            target,
            displayText,
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        result.push({
            type: 'text',
            content: text.slice(lastIndex),
        });
    }

    return result;
}

/**
 * Serialize wiki link node back to markdown
 */
export function serializeWikiLinkToMarkdown(target: string, displayText?: string): string {
    if (displayText && displayText !== target) {
        return `[[${target}|${displayText}]]`;
    }
    return `[[${target}]]`;
}
