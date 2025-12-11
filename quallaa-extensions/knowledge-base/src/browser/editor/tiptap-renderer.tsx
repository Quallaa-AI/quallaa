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
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown';
import { WikiLink, serializeWikiLinkToMarkdown } from './tiptap-wiki-link';
import { WikiImage } from './tiptap-wiki-image';
import { createWikiLinkSuggestion } from './wiki-link-suggestion';
import { Note } from '../../common/knowledge-base-protocol';

// Formatting toolbar component
interface ToolbarProps {
    editor: Editor | null;
    onRequestLinkTarget?: () => Promise<string | undefined>;
}

const FormattingToolbar: React.FC<ToolbarProps> = ({ editor, onRequestLinkTarget }) => {
    if (!editor) {
        return <></>;
    }

    const ToolbarButton: React.FC<{
        onClick: () => void;
        isActive?: boolean;
        title: string;
        icon: string;
    }> = ({ onClick, isActive, title, icon }) => (
        <button onClick={onClick} className={`quallaa-toolbar-button ${isActive ? 'active' : ''}`} title={title} type="button">
            <i className={`codicon codicon-${icon}`}></i>
        </button>
    );

    return (
        <div className="quallaa-formatting-toolbar">
            <div className="toolbar-group">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Cmd+B)" icon="bold" />
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Cmd+I)" icon="italic" />
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough" icon="text-size" />
                <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Inline Code (Cmd+E)" icon="code" />
            </div>
            <div className="toolbar-separator" />
            <div className="toolbar-group">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                    icon="symbol-class"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                    icon="symbol-method"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                    icon="symbol-field"
                />
            </div>
            <div className="toolbar-separator" />
            <div className="toolbar-group">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List" icon="list-unordered" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                    icon="list-ordered"
                />
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote" icon="quote" />
                <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block" icon="symbol-namespace" />
                <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Task List" icon="tasklist" />
            </div>
            <div className="toolbar-separator" />
            <div className="toolbar-group">
                <ToolbarButton
                    onClick={async () => {
                        if (onRequestLinkTarget) {
                            const target = await onRequestLinkTarget();
                            if (target) {
                                editor.chain().focus().insertWikiLink(target).run();
                            }
                        } else {
                            // Fallback to window.prompt if no callback provided
                            const target = window.prompt('Enter link target (note name):');
                            if (target) {
                                editor.chain().focus().insertWikiLink(target).run();
                            }
                        }
                    }}
                    title="Insert Wiki Link (Cmd+Shift+K)"
                    icon="link"
                />
                <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table" icon="symbol-array" />
            </div>
            {/* Table manipulation buttons - only show when cursor is in a table */}
            {editor.isActive('table') && (
                <>
                    <div className="toolbar-separator" />
                    <div className="toolbar-group">
                        <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add Column Before" icon="arrow-left" />
                        <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column After" icon="arrow-right" />
                        <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete Column" icon="close" />
                    </div>
                    <div className="toolbar-separator" />
                    <div className="toolbar-group">
                        <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Add Row Before" icon="arrow-up" />
                        <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row After" icon="arrow-down" />
                        <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Delete Row" icon="trash" />
                    </div>
                    <div className="toolbar-separator" />
                    <div className="toolbar-group">
                        <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table" icon="symbol-array" />
                    </div>
                </>
            )}
        </div>
    );
};

// Regex for wiki links - matches [[target]] and [[target|display]]
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Placeholder to protect wiki links during markdown parsing
const WIKI_LINK_PLACEHOLDER = '\u0000WIKILINK';

// GFM table regex for parsing
const GFM_TABLE_REGEX = /^\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/gm;
const TABLE_PLACEHOLDER = '\u0000TABLE';
const TASK_LIST_PLACEHOLDER = '\u0000TASKLIST';

// Serialize a table node to GFM markdown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTableToGfm(tableNode: any): string {
    const rows: string[][] = [];

    // Extract rows from table node
    if (tableNode.content) {
        for (const row of tableNode.content) {
            if (row.type === 'tableRow') {
                const cells: string[] = [];
                if (row.content) {
                    for (const cell of row.content) {
                        // Get text content from cell
                        let cellText = '';
                        if (cell.content) {
                            for (const para of cell.content) {
                                if (para.content) {
                                    for (const textNode of para.content) {
                                        if (textNode.text) {
                                            cellText += textNode.text;
                                        }
                                    }
                                }
                            }
                        }
                        cells.push(cellText.trim());
                    }
                }
                rows.push(cells);
            }
        }
    }

    if (rows.length === 0) {
        return '';
    }

    // Build GFM table
    const lines: string[] = [];

    // Header row
    if (rows[0]) {
        lines.push('| ' + rows[0].join(' | ') + ' |');
        // Separator row
        lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
    }

    // Data rows
    for (let i = 1; i < rows.length; i++) {
        lines.push('| ' + rows[i].join(' | ') + ' |');
    }

    return lines.join('\n');
}

// Parse GFM table to TipTap table JSON
function parseGfmTable(tableMarkdown: string): object {
    const lines = tableMarkdown.trim().split('\n');
    if (lines.length < 2) {
        return { type: 'paragraph', content: [{ type: 'text', text: tableMarkdown }] };
    }

    const rows: object[] = [];

    for (let i = 0; i < lines.length; i++) {
        // Skip separator row
        if (i === 1 && lines[i].match(/^[\s|:-]+$/)) {
            continue;
        }

        const cells = lines[i]
            .split('|')
            .filter(cell => cell.trim() !== '')
            .map(cell => cell.trim());

        const isHeader = i === 0;
        const rowContent = cells.map(cellText => ({
            type: isHeader ? 'tableHeader' : 'tableCell',
            content: [
                {
                    type: 'paragraph',
                    content: cellText ? [{ type: 'text', text: cellText }] : [],
                },
            ],
        }));

        rows.push({
            type: 'tableRow',
            content: rowContent,
        });
    }

    return {
        type: 'table',
        content: rows,
    };
}

// Serialize a task list node to markdown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTaskListToMarkdown(taskListNode: any): string {
    const lines: string[] = [];

    if (taskListNode.content) {
        for (const item of taskListNode.content) {
            if (item.type === 'taskItem') {
                const checked = item.attrs?.checked ? 'x' : ' ';
                let text = '';
                if (item.content) {
                    for (const child of item.content) {
                        if (child.type === 'paragraph' && child.content) {
                            for (const textNode of child.content) {
                                if (textNode.text) {
                                    text += textNode.text;
                                }
                            }
                        }
                    }
                }
                lines.push(`- [${checked}] ${text}`);
            }
        }
    }

    return lines.join('\n');
}

// Parse task list markdown to TipTap task list JSON
function parseTaskListMarkdown(taskListMarkdown: string): object {
    const lines = taskListMarkdown.trim().split('\n');
    const items: object[] = [];

    for (const line of lines) {
        const match = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)$/);
        if (match) {
            const checked = match[1].toLowerCase() === 'x';
            const text = match[2];
            items.push({
                type: 'taskItem',
                attrs: { checked },
                content: [
                    {
                        type: 'paragraph',
                        content: text ? [{ type: 'text', text }] : [],
                    },
                ],
            });
        }
    }

    return {
        type: 'taskList',
        content: items,
    };
}

export interface TipTapRendererProps {
    /** Markdown content to display */
    content: string;
    /** Called when content changes, with new markdown */
    onChange?: (markdown: string) => void;
    /** Whether the editor is read-only */
    readOnly?: boolean;
    /** Called when editor is ready */
    onEditorReady?: (editor: Editor) => void;
    /** Called when a wiki link is clicked */
    onWikiLinkClick?: (target: string) => void;
    /** Called to request a wiki link target from user (replaces window.prompt) */
    onRequestLinkTarget?: () => Promise<string | undefined>;
    /** Function to search notes for autocomplete */
    searchNotes?: (query: string) => Promise<Note[]>;
    /** Function to resolve image paths to URLs */
    resolveImagePath?: (path: string) => string;
    /** Ref to expose content extraction and scroll methods */
    editorRef?: React.MutableRefObject<{ getContent: () => string; getScrollPercentage: () => number; setScrollPercentage: (percentage: number) => void } | undefined>;
}

export const TipTapRenderer: React.FC<TipTapRendererProps> = ({
    content,
    onChange,
    readOnly = false,
    onEditorReady,
    onWikiLinkClick,
    onRequestLinkTarget,
    searchNotes,
    resolveImagePath,
    editorRef,
}) => {
    // Store extracted wiki links during parsing
    const wikiLinksRef = React.useRef<Array<{ target: string; displayText?: string }>>([]);

    // Ref to the scrollable container for scroll position tracking
    // eslint-disable-next-line no-null/no-null
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Pre-process markdown to extract and protect wiki links
    const preprocessMarkdown = (markdown: string): string => {
        wikiLinksRef.current = [];
        let index = 0;

        return markdown.replace(WIKI_LINK_REGEX, (match, target, displayText) => {
            wikiLinksRef.current.push({
                target: target.trim(),
                displayText: displayText?.trim(),
            });
            // Replace with placeholder that won't be parsed as markdown
            return `${WIKI_LINK_PLACEHOLDER}${index++}${WIKI_LINK_PLACEHOLDER}`;
        });
    };

    // Post-process to restore wiki links in the parsed content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restoreWikiLinks = (json: any): any => {
        if (!json) {
            return json;
        }

        if (typeof json === 'string') {
            // Check for wiki link placeholders in text
            const placeholderRegex = new RegExp(`${WIKI_LINK_PLACEHOLDER}(\\d+)${WIKI_LINK_PLACEHOLDER}`, 'g');
            if (placeholderRegex.test(json)) {
                // This text contains wiki links - split and create mixed content
                const parts: Array<{ type: string; text?: string; attrs?: { target: string; displayText?: string } }> = [];
                let lastIndex = 0;
                let match;
                placeholderRegex.lastIndex = 0;

                while ((match = placeholderRegex.exec(json))) {
                    // Add text before placeholder
                    if (match.index > lastIndex) {
                        parts.push({ type: 'text', text: json.slice(lastIndex, match.index) });
                    }
                    // Add wiki link node
                    const linkIndex = parseInt(match[1], 10);
                    const link = wikiLinksRef.current[linkIndex];
                    if (link) {
                        parts.push({
                            type: 'wikiLink',
                            attrs: { target: link.target, displayText: link.displayText },
                        });
                    }
                    lastIndex = match.index + match[0].length;
                }
                // Add remaining text
                if (lastIndex < json.length) {
                    parts.push({ type: 'text', text: json.slice(lastIndex) });
                }
                return parts;
            }
            return json;
        }

        if (Array.isArray(json)) {
            // Flatten the array since restoreWikiLinks might return arrays
            const result: unknown[] = [];
            for (const item of json) {
                const processed = restoreWikiLinks(item);
                if (Array.isArray(processed)) {
                    result.push(...processed);
                } else {
                    result.push(processed);
                }
            }
            return result;
        }

        if (typeof json === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(json)) {
                if (key === 'text' && typeof value === 'string') {
                    const processed = restoreWikiLinks(value);
                    if (Array.isArray(processed)) {
                        // Text node needs to become multiple nodes
                        return processed;
                    }
                    result[key] = processed;
                } else if (key === 'content' && Array.isArray(value)) {
                    result[key] = restoreWikiLinks(value);
                } else {
                    result[key] = restoreWikiLinks(value);
                }
            }
            return result;
        }

        return json;
    };

    // Serialize ProseMirror doc to markdown with wiki link, table, and task list support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serializeToMarkdown = (doc: any): string => {
        const docJson = doc.toJSON ? doc.toJSON() : doc;
        const tables: string[] = [];
        const taskLists: string[] = [];

        // Extract and serialize tables and task lists first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractSpecialNodes = (node: any): any => {
            if (node.type === 'table') {
                const tableMarkdown = serializeTableToGfm(node);
                const index = tables.length;
                tables.push(tableMarkdown);
                // Return placeholder paragraph
                return {
                    type: 'paragraph',
                    content: [{ type: 'text', text: `${TABLE_PLACEHOLDER}${index}${TABLE_PLACEHOLDER}` }],
                };
            }
            if (node.type === 'taskList') {
                const taskListMarkdown = serializeTaskListToMarkdown(node);
                const index = taskLists.length;
                taskLists.push(taskListMarkdown);
                // Return placeholder paragraph
                return {
                    type: 'paragraph',
                    content: [{ type: 'text', text: `${TASK_LIST_PLACEHOLDER}${index}${TASK_LIST_PLACEHOLDER}` }],
                };
            }
            if (node.content) {
                return {
                    ...node,
                    content: node.content.map(extractSpecialNodes),
                };
            }
            return node;
        };

        const docWithoutSpecialNodes = extractSpecialNodes(docJson);

        // Serialize with default serializer (tables and task lists are now placeholders)
        let markdown = defaultMarkdownSerializer.serialize(doc.type.schema.nodeFromJSON(docWithoutSpecialNodes));

        // Restore tables
        tables.forEach((tableMarkdown, index) => {
            markdown = markdown.replace(`${TABLE_PLACEHOLDER}${index}${TABLE_PLACEHOLDER}`, tableMarkdown);
        });

        // Restore task lists
        taskLists.forEach((taskListMarkdown, index) => {
            markdown = markdown.replace(`${TASK_LIST_PLACEHOLDER}${index}${TASK_LIST_PLACEHOLDER}`, taskListMarkdown);
        });

        // The wiki link nodes will be serialized as their display text
        // We need to find them in the doc and restore the [[]] syntax
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractWikiLinks = (node: any): void => {
            if (node.type === 'wikiLink') {
                const target = node.attrs?.target || '';
                const displayText = node.attrs?.displayText;
                const wikiLinkText = serializeWikiLinkToMarkdown(target, displayText);
                const searchText = displayText || target;
                // Replace the plain text with wiki link syntax
                markdown = markdown.replace(searchText, wikiLinkText);
            }
            if (node.content) {
                node.content.forEach(extractWikiLinks);
            }
        };

        if (docJson.content) {
            docJson.content.forEach(extractWikiLinks);
        }

        return markdown;
    };

    // Parse markdown content to ProseMirror JSON
    const parseMarkdown = (markdown: string): object | undefined => {
        if (!markdown) {
            return undefined;
        }

        // Extract and store GFM tables
        const tables: string[] = [];
        let processed = markdown.replace(GFM_TABLE_REGEX, match => {
            const index = tables.length;
            tables.push(match);
            return `${TABLE_PLACEHOLDER}${index}${TABLE_PLACEHOLDER}`;
        });

        // Extract and store task lists (groups of consecutive task items)
        const taskLists: string[] = [];
        const taskListBlockRegex = /(?:^\s*-\s+\[[ xX]\]\s+.*$\n?)+/gm;
        processed = processed.replace(taskListBlockRegex, match => {
            const index = taskLists.length;
            taskLists.push(match.trim());
            return `${TASK_LIST_PLACEHOLDER}${index}${TASK_LIST_PLACEHOLDER}\n`;
        });

        // Pre-process to extract wiki links
        processed = preprocessMarkdown(processed);

        // Parse with default parser
        const doc = defaultMarkdownParser.parse(processed);
        if (!doc) {
            return undefined;
        }

        // Restore wiki links in the JSON
        let json = doc.toJSON();
        json = restoreWikiLinks(json);

        // Restore tables
        if (tables.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const restoreTables = (node: any): any => {
                if (node.type === 'text' && typeof node.text === 'string') {
                    const tableMatch = node.text.match(new RegExp(`${TABLE_PLACEHOLDER}(\\d+)${TABLE_PLACEHOLDER}`));
                    if (tableMatch) {
                        const tableIndex = parseInt(tableMatch[1], 10);
                        const tableMarkdown = tables[tableIndex];
                        if (tableMarkdown) {
                            return parseGfmTable(tableMarkdown);
                        }
                    }
                }
                if (node.content) {
                    const newContent: unknown[] = [];
                    for (const child of node.content) {
                        const result = restoreTables(child);
                        // If we got a table back, it should replace the paragraph
                        if (result.type === 'table' && node.type === 'paragraph') {
                            return result;
                        }
                        newContent.push(result);
                    }
                    return { ...node, content: newContent };
                }
                return node;
            };
            json = restoreTables(json);
        }

        // Restore task lists
        if (taskLists.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const restoreTaskLists = (node: any): any => {
                if (node.type === 'text' && typeof node.text === 'string') {
                    const taskListMatch = node.text.match(new RegExp(`${TASK_LIST_PLACEHOLDER}(\\d+)${TASK_LIST_PLACEHOLDER}`));
                    if (taskListMatch) {
                        const taskListIndex = parseInt(taskListMatch[1], 10);
                        const taskListMarkdown = taskLists[taskListIndex];
                        if (taskListMarkdown) {
                            return parseTaskListMarkdown(taskListMarkdown);
                        }
                    }
                }
                if (node.content) {
                    const newContent: unknown[] = [];
                    for (const child of node.content) {
                        const result = restoreTaskLists(child);
                        // If we got a taskList back, it should replace the paragraph
                        if (result.type === 'taskList' && node.type === 'paragraph') {
                            return result;
                        }
                        newContent.push(result);
                    }
                    return { ...node, content: newContent };
                }
                return node;
            };
            json = restoreTaskLists(json);
        }

        return json;
    };

    // Create suggestion configuration if searchNotes is provided
    const suggestionConfig = React.useMemo(() => (searchNotes ? createWikiLinkSuggestion(searchNotes) : undefined), [searchNotes]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'quallaa-table',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            WikiLink.configure({
                onLinkClick: onWikiLinkClick,
                onRequestLinkTarget: onRequestLinkTarget,
                suggestion: suggestionConfig,
            }),
            WikiImage.configure({
                resolveImagePath: resolveImagePath,
            }),
        ],
        // Parse markdown content to ProseMirror document
        content: parseMarkdown(content) || '',
        editable: !readOnly,
        editorProps: {
            attributes: {
                class: 'quallaa-tiptap-instance',
            },
            handleDrop: (view, event, slice, moved) => {
                // Check if there are files in the drop
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                    const files = event.dataTransfer.files;

                    // Filter for image files only
                    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

                    if (imageFiles.length > 0) {
                        event.preventDefault();

                        // Process each image file
                        imageFiles.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = readerEvent => {
                                const dataUrl = readerEvent.target?.result as string;
                                if (dataUrl && editor) {
                                    // Insert the image at the drop position
                                    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                                    if (coords) {
                                        editor.chain().focus().setTextSelection(coords.pos).insertWikiImage(dataUrl, file.name).run();
                                    }
                                }
                            };
                            reader.readAsDataURL(file);
                        });

                        return true; // Handled
                    }
                }
                return false; // Not handled
            },
            handlePaste: (view, event, slice) => {
                // Check if clipboard contains files
                if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
                    const files = event.clipboardData.files;

                    // Filter for image files only
                    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

                    if (imageFiles.length > 0) {
                        event.preventDefault();

                        // Process each image file
                        imageFiles.forEach(file => {
                            const reader = new FileReader();
                            reader.onload = readerEvent => {
                                const dataUrl = readerEvent.target?.result as string;
                                if (dataUrl && editor) {
                                    // Insert the image at current cursor position
                                    editor.chain().focus().insertWikiImage(dataUrl, file.name).run();
                                }
                            };
                            reader.readAsDataURL(file);
                        });

                        return true; // Handled
                    }
                }

                // Check if clipboard contains HTML with images
                if (event.clipboardData && event.clipboardData.types.includes('text/html')) {
                    const html = event.clipboardData.getData('text/html');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const images = tempDiv.querySelectorAll('img');

                    if (images.length > 0) {
                        event.preventDefault();

                        // Extract images from HTML
                        images.forEach(img => {
                            const src = img.src;
                            // Handle data URLs (embedded images)
                            if (src.startsWith('data:image/')) {
                                if (editor) {
                                    const fileName = img.alt || 'pasted-image.png';
                                    editor.chain().focus().insertWikiImage(src, fileName).run();
                                }
                            }
                            // TODO: Handle external URLs - could download and convert to data URL
                        });

                        return true; // Handled
                    }
                }

                return false; // Not handled
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            if (onChange) {
                // Serialize ProseMirror document to markdown
                const markdown = serializeToMarkdown(currentEditor.state.doc);
                onChange(markdown);
            }
        },
        onCreate: ({ editor: createdEditor }) => {
            if (onEditorReady) {
                onEditorReady(createdEditor);
            }
        },
    });

    // Expose content extraction and scroll methods via ref
    React.useEffect(() => {
        if (editor && editorRef) {
            editorRef.current = {
                getContent: () => serializeToMarkdown(editor.state.doc),
                getScrollPercentage: () => {
                    const container = containerRef.current;
                    if (!container) {
                        return 0;
                    }
                    const scrollableHeight = container.scrollHeight - container.clientHeight;
                    if (scrollableHeight <= 0) {
                        return 0;
                    }
                    return container.scrollTop / scrollableHeight;
                },
                setScrollPercentage: (percentage: number) => {
                    const container = containerRef.current;
                    if (!container) {
                        return;
                    }
                    // Wait for content to render before setting scroll position
                    setTimeout(() => {
                        const scrollableHeight = container.scrollHeight - container.clientHeight;
                        container.scrollTop = percentage * scrollableHeight;
                    }, 100);
                },
            };
        }
        return () => {
            if (editorRef) {
                editorRef.current = undefined;
            }
        };
    }, [editor, editorRef]);

    // Update content when prop changes (e.g., file reload or mode switch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => {
        if (editor && content) {
            // Compare current markdown with new content
            const currentMarkdown = serializeToMarkdown(editor.state.doc);
            if (content !== currentMarkdown) {
                // Parse new markdown and set as content
                const parsed = parseMarkdown(content);
                if (parsed) {
                    editor.commands.setContent(parsed);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, editor]);

    return (
        <div className="quallaa-editor-container">
            <FormattingToolbar editor={editor} onRequestLinkTarget={onRequestLinkTarget} />
            <div className="quallaa-tiptap-editor" ref={containerRef}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};
