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

import * as React from '@theia/core/shared/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { createRoot, Root } from 'react-dom/client';
import tippy, { Instance } from 'tippy.js';
import { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { Note, KnowledgeBaseService } from '../../common/knowledge-base-protocol';

export interface SuggestionItem {
    id: string;
    label: string;
}

interface SuggestionListRef {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface SuggestionListProps {
    items: SuggestionItem[];
    command: (item: SuggestionItem) => void;
}

/**
 * React component for rendering the suggestion dropdown
 */
const SuggestionList = React.forwardRef<SuggestionListRef, SuggestionListProps>(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const selectItem = (index: number): void => {
        const item = items[index];
        if (item) {
            command(item);
        }
    };

    const upHandler = (): void => {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = (): void => {
        setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = (): void => {
        selectItem(selectedIndex);
    };

    React.useEffect(() => {
        setSelectedIndex(0);
    }, [items]);

    React.useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps): boolean => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    return (
        <div className="quallaa-suggestion-list">
            {items.length ? (
                items.map((item, index) => (
                    <button key={item.id} className={`quallaa-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`} onClick={() => selectItem(index)} type="button">
                        <i className="codicon codicon-note" style={{ marginRight: '8px', opacity: 0.7 }}></i>
                        {item.label}
                    </button>
                ))
            ) : (
                <div className="quallaa-suggestion-empty">No notes found</div>
            )}
        </div>
    );
});
SuggestionList.displayName = 'SuggestionList';

/**
 * Creates wiki link suggestion configuration for TipTap
 * @param searchNotes - Function to search for notes
 */
export function createWikiLinkSuggestion(searchNotes: (query: string) => Promise<Note[]>): Omit<SuggestionOptions<SuggestionItem>, 'editor'> {
    return {
        char: '[',
        allowSpaces: true,
        startOfLine: false,

        items: async ({ query }) => {
            // Only trigger after typing `[[`
            if (!query.startsWith('[')) {
                return [];
            }

            // Remove the leading `[` from query
            const searchQuery = query.substring(1);

            try {
                const notes = await searchNotes(searchQuery);
                return notes.slice(0, 10).map(note => ({
                    id: note.uri,
                    label: note.title,
                }));
            } catch (error) {
                console.error('Error searching notes:', error);
                return [];
            }
        },

        command: ({ editor, range, props }) => {
            // Delete the trigger characters `[[` and query, then insert wiki link
            editor.chain().focus().deleteRange(range).insertWikiLink(props.label).run();
        },

        render: () => {
            // eslint-disable-next-line no-null/no-null
            let component: Root | null = null;
            // eslint-disable-next-line no-null/no-null
            let popup: Instance[] | null = null;
            // eslint-disable-next-line no-null/no-null
            let container: HTMLDivElement | null = null;
            // eslint-disable-next-line no-null/no-null
            const componentRef: { current: SuggestionListRef | null } = { current: null };

            return {
                onStart: (props: SuggestionProps<SuggestionItem>) => {
                    container = document.createElement('div');
                    container.className = 'quallaa-suggestion-container';
                    component = createRoot(container);

                    const setRef = (ref: SuggestionListRef | null): void => {
                        componentRef.current = ref;
                    };

                    component.render(<SuggestionList ref={setRef} items={props.items} command={props.command} />);

                    if (!props.clientRect) {
                        return;
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect as () => DOMRect,
                        appendTo: () => document.body,
                        content: container,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                        theme: 'quallaa-suggestion',
                    });
                },

                onUpdate: (props: SuggestionProps<SuggestionItem>) => {
                    if (component && container) {
                        const setRef = (ref: SuggestionListRef | null): void => {
                            componentRef.current = ref;
                        };

                        component.render(<SuggestionList ref={setRef} items={props.items} command={props.command} />);
                    }

                    if (popup && popup[0] && props.clientRect) {
                        popup[0].setProps({
                            getReferenceClientRect: props.clientRect as () => DOMRect,
                        });
                    }
                },

                onKeyDown: (props: SuggestionKeyDownProps) => {
                    if (props.event.key === 'Escape') {
                        if (popup && popup[0]) {
                            popup[0].hide();
                        }
                        return true;
                    }

                    if (componentRef.current) {
                        return componentRef.current.onKeyDown(props);
                    }

                    return false;
                },

                onExit: () => {
                    if (popup && popup[0]) {
                        popup[0].destroy();
                    }
                    if (component) {
                        // Use setTimeout to avoid React warning about unmounting during render
                        setTimeout(() => {
                            if (component) {
                                component.unmount();
                            }
                        }, 0);
                    }
                },
            };
        },
    };
}

/**
 * Get wiki link suggestion configuration bound to a KnowledgeBaseService
 */
export function getWikiLinkSuggestion(knowledgeBaseService: KnowledgeBaseService): Omit<SuggestionOptions<SuggestionItem>, 'editor'> {
    return createWikiLinkSuggestion(query => knowledgeBaseService.searchNotes(query));
}
