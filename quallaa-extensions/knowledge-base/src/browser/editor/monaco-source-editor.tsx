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
import { URI } from '@theia/core/lib/common/uri';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { SimpleMonacoEditor } from '@theia/monaco/lib/browser/simple-monaco-editor';

export interface MonacoSourceEditorProps {
    /** The markdown content to display */
    content: string;
    /** Called when content changes */
    onChange: (value: string) => void;
    /** Theia's Monaco editor provider for LSP integration */
    editorProvider: MonacoEditorProvider;
    /** URI of the file being edited */
    uri: URI;
    /** Whether the editor is read-only */
    readOnly?: boolean;
    /** Ref to expose content extraction and scroll methods */
    editorRef?: React.MutableRefObject<{ getContent: () => string; getScrollPercentage: () => number; setScrollPercentage: (percentage: number) => void } | undefined>;
}

/**
 * Monaco-based source editor for markdown files.
 * Uses Theia's MonacoEditorProvider for full LSP integration (autocomplete, diagnostics, etc.)
 */
export const MonacoSourceEditor: React.FC<MonacoSourceEditorProps> = ({ content, onChange, editorProvider, uri, readOnly = false, editorRef: externalEditorRef }) => {
    // eslint-disable-next-line no-null/no-null
    const containerRef = React.useRef<HTMLDivElement>(null);
    const editorRef = React.useRef<SimpleMonacoEditor | undefined>(undefined);
    const isUpdatingRef = React.useRef(false);

    // Initialize Monaco editor on mount using Theia's provider for LSP support
    React.useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        let disposed = false;
        const initEditor = async () => {
            // Create SimpleMonacoEditor with full Theia integration (LSP, theming, etc.)
            const editor = await editorProvider.createSimpleInline(uri, containerRef.current!, {
                language: 'markdown',
                automaticLayout: true,
                autoSizing: false,
                minHeight: -1,
                maxHeight: -1,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                wrappingStrategy: 'advanced',
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: 'var(--monaco-monospace-font)',
                lineHeight: 22,
                padding: { top: 16, bottom: 16 },
                readOnly: readOnly,
                renderLineHighlight: 'line',
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                },
            });

            if (disposed) {
                editor.dispose();
                return;
            }

            editorRef.current = editor;

            // Set initial content
            editor.document.textEditorModel.setValue(content);

            // Handle content changes
            editor.getControl().onDidChangeModelContent(() => {
                if (!isUpdatingRef.current) {
                    const newValue = editor.getControl().getValue();
                    onChange(newValue);
                }
            });
        };

        initEditor();

        // Cleanup on unmount
        return () => {
            disposed = true;
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = undefined;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Expose content extraction and scroll methods via ref
    React.useEffect(() => {
        const editor = editorRef.current;
        if (editor && externalEditorRef) {
            const control = editor.getControl();
            externalEditorRef.current = {
                getContent: () => control.getValue(),
                getScrollPercentage: () => {
                    const scrollTop = control.getScrollTop();
                    const scrollHeight = control.getScrollHeight();
                    const clientHeight = control.getLayoutInfo().height;
                    const scrollableHeight = scrollHeight - clientHeight;
                    if (scrollableHeight <= 0) {
                        return 0;
                    }
                    return scrollTop / scrollableHeight;
                },
                setScrollPercentage: (percentage: number) => {
                    // Wait for content to render before setting scroll position
                    setTimeout(() => {
                        const scrollHeight = control.getScrollHeight();
                        const clientHeight = control.getLayoutInfo().height;
                        const scrollableHeight = scrollHeight - clientHeight;
                        const newScrollTop = percentage * scrollableHeight;
                        control.setScrollTop(newScrollTop);
                    }, 100);
                },
            };
        }
        return () => {
            if (externalEditorRef) {
                externalEditorRef.current = undefined;
            }
        };
    }, [externalEditorRef]);

    // Update content when prop changes
    React.useEffect(() => {
        const editor = editorRef.current;
        if (editor) {
            const control = editor.getControl();
            const currentValue = control.getValue();
            if (content !== currentValue) {
                // Prevent onChange from firing during external updates
                isUpdatingRef.current = true;

                // Preserve cursor position
                const position = control.getPosition();
                const selection = control.getSelection();

                control.setValue(content);

                // Restore cursor position
                if (position) {
                    control.setPosition(position);
                }
                if (selection) {
                    control.setSelection(selection);
                }

                isUpdatingRef.current = false;
            }
        }
    }, [content]);

    // Update read-only state
    React.useEffect(() => {
        const editor = editorRef.current;
        if (editor) {
            editor.getControl().updateOptions({ readOnly });
        }
    }, [readOnly]);

    return (
        <div
            ref={containerRef}
            className="quallaa-monaco-source-editor"
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
            }}
        />
    );
};
