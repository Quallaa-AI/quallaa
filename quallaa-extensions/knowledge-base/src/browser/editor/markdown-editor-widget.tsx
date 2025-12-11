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
import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Saveable, SaveableSource } from '@theia/core/lib/browser/saveable';
import { URI } from '@theia/core/lib/common/uri';
import { TipTapRenderer } from './tiptap-renderer';
import { MonacoSourceEditor } from './monaco-source-editor';
import { MessageService, Emitter, Event, nls } from '@theia/core';
import { Widget, OpenerService } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { KnowledgeBaseService } from '../../common/knowledge-base-protocol';
import { QuickInputService } from '@theia/core/lib/browser/quick-input';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';

@injectable()
export class MarkdownEditorWidget extends ReactWidget implements Saveable, SaveableSource {
    static readonly ID = 'quallaa-markdown-editor';
    static readonly LABEL = 'Markdown Editor';

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(MonacoEditorProvider)
    protected readonly editorProvider: MonacoEditorProvider;

    protected uri: URI | undefined;
    protected content: string = '';
    protected originalContent: string = '';
    protected _dirty: boolean = false;
    protected mode: 'preview' | 'source' = 'preview';

    // Fix: Add switching state to force clean unmount/remount
    protected isSwitching: boolean = false;

    // Refs to extract content and scroll position from editors before switching modes
    protected tiptapEditorRef = React.createRef<{ getContent: () => string; getScrollPercentage: () => number; setScrollPercentage: (percentage: number) => void }>();
    protected monacoEditorRef = React.createRef<{ getContent: () => string; getScrollPercentage: () => number; setScrollPercentage: (percentage: number) => void }>();

    // Store scroll position when switching modes
    protected savedScrollPercentage: number = 0;

    // Saveable implementation
    readonly autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange' = 'off';

    protected readonly onDirtyChangedEmitter = new Emitter<void>();
    readonly onDirtyChanged: Event<void> = this.onDirtyChangedEmitter.event;

    protected readonly onContentChangedEmitter = new Emitter<void>();
    readonly onContentChanged: Event<void> = this.onContentChangedEmitter.event;

    get saveable(): Saveable {
        return this;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    @postConstruct()
    protected init(): void {
        // Note: Do NOT set this.id here - the widget manager assigns a unique ID
        // based on factory ID + options (e.g., 'quallaa-markdown-editor:uri=file:///path/file.md')
        // Overriding it would cause all markdown editors to share the same ID
        this.title.label = MarkdownEditorWidget.LABEL;
        this.title.caption = MarkdownEditorWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'codicon codicon-book';
        this.addClass('quallaa-markdown-editor');

        // Fix: Ensure the host node has flex layout so children with height:100% work correctly
        this.node.style.display = 'flex';
        this.node.style.flexDirection = 'column';
    }

    public async setUri(uri: URI): Promise<void> {
        this.uri = uri;
        this.title.label = uri.path.name;
        this.title.caption = uri.path.toString();

        // Load file content
        await this.loadContent();
        this.update();
    }

    public getUri(): URI | undefined {
        return this.uri;
    }

    public toggleMode(): void {
        // CRITICAL: Extract current content and scroll position from active editor BEFORE unmounting
        // This prevents data loss and maintains user's reading position
        if (this.mode === 'preview' && this.tiptapEditorRef.current) {
            this.content = this.tiptapEditorRef.current.getContent();
            this.savedScrollPercentage = this.tiptapEditorRef.current.getScrollPercentage();
        } else if (this.mode === 'source' && this.monacoEditorRef.current) {
            this.content = this.monacoEditorRef.current.getContent();
            this.savedScrollPercentage = this.monacoEditorRef.current.getScrollPercentage();
        }

        // Force a complete unmount/remount cycle to ensure clean editor initialization
        // This resolves issues where heavy components (TipTap/Monaco) fail to render correctly
        // when switched synchronously.
        this.isSwitching = true;
        this.update();

        // Use setTimeout to allow the 'switching' render cycle to complete (clearing the DOM)
        setTimeout(() => {
            this.mode = this.mode === 'preview' ? 'source' : 'preview';
            this.isSwitching = false;
            this.update();

            // Restore scroll position after new editor has mounted
            this.restoreScrollPosition();
        }, 50);
    }

    protected restoreScrollPosition(): void {
        // Wait for the editor to fully render before restoring scroll
        setTimeout(() => {
            if (this.mode === 'preview' && this.tiptapEditorRef.current) {
                this.tiptapEditorRef.current.setScrollPercentage(this.savedScrollPercentage);
            } else if (this.mode === 'source' && this.monacoEditorRef.current) {
                this.monacoEditorRef.current.setScrollPercentage(this.savedScrollPercentage);
            }
        }, 150);
    }

    public getMode(): 'preview' | 'source' {
        return this.mode;
    }

    protected async loadContent(): Promise<void> {
        if (!this.uri) {
            return;
        }

        try {
            const fileContent = await this.fileService.read(this.uri);
            this.content = fileContent.value;
            this.originalContent = this.content;
            this.setDirty(false);
        } catch (error) {
            this.messageService.error(`Failed to load file: ${error}`);
            this.content = '';
            this.originalContent = '';
        }
    }

    protected setDirty(dirty: boolean): void {
        if (this._dirty !== dirty) {
            this._dirty = dirty;
            this.onDirtyChangedEmitter.fire();
            // Update title to show dirty indicator
            if (this.uri) {
                this.title.label = dirty ? `${this.uri.path.name} •` : this.uri.path.name;
            }
        }
    }

    protected handleContentChange = (markdown: string): void => {
        this.content = markdown;
        const isDirty = this.content !== this.originalContent;
        this.setDirty(isDirty);
        this.onContentChangedEmitter.fire();
    };

    protected handleWikiLinkClick = async (target: string): Promise<void> => {
        try {
            // Try to resolve the wiki link to an existing note
            const resolvedNote = await this.knowledgeBaseService.resolveWikiLink(target);

            if (resolvedNote) {
                // Open the existing note
                const noteUri = new URI(resolvedNote.uri);
                await this.openerService.getOpener(noteUri).then(opener => opener.open(noteUri));
            } else {
                // Note doesn't exist - could create it or show a message
                this.messageService.info(`Note "${target}" not found. You can create it manually.`);
            }
        } catch (error) {
            this.messageService.error(`Failed to open wiki link: ${error}`);
        }
    };

    /**
     * Request wiki link target from user using Theia's QuickInputService
     * Returns undefined if user cancels
     */
    protected requestWikiLinkTarget = async (): Promise<string | undefined> => {
        const result = await this.quickInputService.input({
            placeHolder: nls.localize('quallaa/wikiLink/placeholder', 'Enter note name...'),
            prompt: nls.localize('quallaa/wikiLink/prompt', 'Wiki Link Target'),
        });
        return result;
    };

    /**
     * Resolve image path relative to current document
     * Converts relative paths to file:// URLs
     */
    protected resolveImagePath = (imagePath: string): string => {
        // If already an absolute URL, return as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('file://')) {
            return imagePath;
        }

        // Get the directory of the current document
        if (!this.uri) {
            return imagePath;
        }

        const documentDir = this.uri.parent;
        const resolvedUri = documentDir.resolve(imagePath);

        // Convert to file:// URL
        return resolvedUri.toString();
    };

    async save(): Promise<void> {
        if (!this.uri || !this.dirty) {
            return;
        }

        try {
            await this.fileService.write(this.uri, this.content);
            this.originalContent = this.content;
            this.setDirty(false);
            this.messageService.info(`Saved: ${this.uri.path.name}`);
        } catch (error) {
            this.messageService.error(`Failed to save file: ${error}`);
            throw error;
        }
    }

    async revert(): Promise<void> {
        await this.loadContent();
        this.update();
    }

    createSnapshot(): { value: string } {
        return { value: this.content };
    }

    applySnapshot(snapshot: { value: string }): void {
        this.content = snapshot.value;
        this.setDirty(this.content !== this.originalContent);
        this.update();
    }

    protected render(): React.ReactNode {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Toolbar with mode toggle */}
                <div className="quallaa-editor-toolbar">
                    <button
                        className="theia-button secondary"
                        onClick={() => this.toggleMode()}
                        disabled={this.isSwitching}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                        }}
                    >
                        <i className={`codicon ${this.mode === 'preview' ? 'codicon-code' : 'codicon-book'}`}></i>
                        {this.mode === 'preview' ? 'Source' : 'Preview'}
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--kb-text-muted)', marginLeft: 'auto' }}>{this.mode === 'preview' ? 'Live Preview' : 'Source Mode'}</span>
                </div>

                {/* Content Area - key forces React to re-render on mode change */}
                <div key={this.mode} style={{ flex: 1, overflow: 'hidden' }}>
                    {this.isSwitching ? (
                        <div
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--theia-descriptionForeground)',
                            }}
                        >
                            Switching mode...
                        </div>
                    ) : this.mode === 'preview' ? (
                        <TipTapRenderer
                            content={this.content}
                            onChange={this.handleContentChange}
                            onWikiLinkClick={this.handleWikiLinkClick}
                            onRequestLinkTarget={this.requestWikiLinkTarget}
                            searchNotes={query => this.knowledgeBaseService.searchNotes(query)}
                            resolveImagePath={this.resolveImagePath}
                            editorRef={
                                this.tiptapEditorRef as React.MutableRefObject<
                                    | {
                                          getContent: () => string;
                                          getScrollPercentage: () => number;
                                          setScrollPercentage: (percentage: number) => void;
                                      }
                                    | undefined
                                >
                            }
                        />
                    ) : (
                        <MonacoSourceEditor
                            content={this.content}
                            onChange={this.handleContentChange}
                            editorProvider={this.editorProvider}
                            uri={this.uri!}
                            editorRef={
                                this.monacoEditorRef as React.MutableRefObject<
                                    | {
                                          getContent: () => string;
                                          getScrollPercentage: () => number;
                                          setScrollPercentage: (percentage: number) => void;
                                      }
                                    | undefined
                                >
                            }
                        />
                    )}
                </div>
            </div>
        );
    }

    /**
     * Type guard for MarkdownEditorWidget
     */
    static is(widget: Widget | undefined): widget is MarkdownEditorWidget {
        return widget !== undefined && widget.id.startsWith(MarkdownEditorWidget.ID);
    }
}
