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

export interface WikiImageOptions {
    /** Function to resolve image path to a URL */
    resolveImagePath?: (path: string) => string;
    /** HTML attributes for the image element */
    HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        wikiImage: {
            /**
             * Insert a wiki-style image
             */
            insertWikiImage: (src: string, alt?: string) => ReturnType;
        };
    }
}

// Regex to match wiki-style images: ![[image.png]] or ![[image.png|alt text]]
const WIKI_IMAGE_INPUT_REGEX = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

/**
 * TipTap extension for wiki-style images (![[image.png]] or ![[image.png|alt]])
 *
 * Renders embedded images with support for relative paths and alt text.
 */
export const WikiImage = Node.create<WikiImageOptions>({
    name: 'wikiImage',

    group: 'block',

    draggable: true,

    addOptions() {
        return {
            resolveImagePath: undefined,
            HTMLAttributes: {
                class: 'wiki-image',
            },
        };
    },

    addAttributes() {
        return {
            src: {
                default: undefined,
                parseHTML: element => element.getAttribute('data-src') || element.getAttribute('src'),
                renderHTML: attributes => {
                    if (!attributes.src) {
                        return {};
                    }
                    return {
                        'data-src': attributes.src,
                    };
                },
            },
            alt: {
                default: undefined,
                parseHTML: element => element.getAttribute('alt'),
                renderHTML: attributes => {
                    if (!attributes.alt) {
                        return {};
                    }
                    return {
                        alt: attributes.alt,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'figure[data-wiki-image]',
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        const src = node.attrs.src || '';
        const alt = node.attrs.alt || src;

        // Resolve the image path if a resolver is provided
        const resolvedSrc = this.options.resolveImagePath ? this.options.resolveImagePath(src) : src;

        return [
            'figure',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-wiki-image': '',
                'data-src': src,
            }),
            [
                'img',
                {
                    src: resolvedSrc,
                    alt: alt,
                    title: alt,
                    loading: 'lazy',
                },
            ],
        ];
    },

    addCommands() {
        return {
            insertWikiImage:
                (src: string, alt?: string) =>
                ({ commands }) =>
                    commands.insertContent({
                        type: this.name,
                        attrs: {
                            src,
                            alt,
                        },
                    }),
        };
    },

    addInputRules() {
        return [
            nodeInputRule({
                find: WIKI_IMAGE_INPUT_REGEX,
                type: this.type,
                getAttributes: match => {
                    const src = match[1]?.trim();
                    const alt = match[2]?.trim();
                    return {
                        src,
                        alt: alt || undefined,
                    };
                },
            }),
        ];
    },
});

/**
 * Serialize wiki image node back to markdown
 */
export function serializeWikiImageToMarkdown(src: string, alt?: string): string {
    if (alt && alt !== src) {
        return `![[${src}|${alt}]]`;
    }
    return `![[${src}]]`;
}
