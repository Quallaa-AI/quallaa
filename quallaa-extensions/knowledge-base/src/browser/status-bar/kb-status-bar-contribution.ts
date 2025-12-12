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

import { injectable, inject } from '@theia/core/shared/inversify';
import { StatusBar, StatusBarAlignment, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { EditorManager, EditorWidget } from '@theia/editor/lib/browser';
import { DisposableCollection } from '@theia/core/lib/common';
import { KnowledgeBaseService } from '../../common/knowledge-base-protocol';

/**
 * Status bar IDs for KB items
 */
const KB_STATUS_BAR_IDS = {
    BACKLINKS: 'kb-status-backlinks',
    WORD_COUNT: 'kb-status-words',
    CHAR_COUNT: 'kb-status-chars',
};

/**
 * Contributes Obsidian-style status bar items for markdown files.
 *
 * Shows:
 * - Backlinks count ("0 backlinks")
 * - Word count ("35 words")
 * - Character count ("203 characters")
 *
 * Only visible when a markdown file is active in the editor.
 */
@injectable()
export class KBStatusBarContribution implements FrontendApplicationContribution {
    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    protected readonly toDispose = new DisposableCollection();
    protected currentEditorDisposables = new DisposableCollection();

    async onStart(): Promise<void> {
        this.toDispose.push(
            this.editorManager.onActiveEditorChanged(editor => {
                this.handleActiveEditorChanged(editor);
            })
        );

        const currentEditor = this.editorManager.activeEditor;
        if (currentEditor) {
            this.handleActiveEditorChanged(currentEditor);
        }
    }

    onStop(): void {
        this.clearStatusBarItems();
        this.toDispose.dispose();
        this.currentEditorDisposables.dispose();
    }

    protected handleActiveEditorChanged(editor: EditorWidget | undefined): void {
        this.currentEditorDisposables.dispose();
        this.currentEditorDisposables = new DisposableCollection();

        if (!editor) {
            this.clearStatusBarItems();
            return;
        }

        const uri = editor.editor.uri;
        if (!uri || !this.isMarkdownFile(uri.toString())) {
            this.clearStatusBarItems();
            return;
        }

        this.updateStatusBar(editor);
    }

    protected isMarkdownFile(uriString: string): boolean {
        const lower = uriString.toLowerCase();
        return lower.endsWith('.md') || lower.endsWith('.markdown');
    }

    protected async updateStatusBar(editor: EditorWidget): Promise<void> {
        const content = editor.editor.document.getText();
        const uri = editor.editor.uri;
        const wordCount = this.countWords(content);
        const charCount = content.length;

        let backlinkCount = 0;
        if (uri) {
            try {
                const backlinks = await this.knowledgeBaseService.getBacklinks(uri.toString());
                backlinkCount = backlinks.length;
            } catch {
                // Backlinks service may not be available
            }
        }

        this.statusBar.setElement(KB_STATUS_BAR_IDS.BACKLINKS, {
            text: `$(link-external) ${backlinkCount} backlink${backlinkCount !== 1 ? 's' : ''}`,
            tooltip: 'Number of notes linking to this note',
            alignment: StatusBarAlignment.RIGHT,
            priority: 100,
        });

        this.statusBar.setElement(KB_STATUS_BAR_IDS.WORD_COUNT, {
            text: `${wordCount} word${wordCount !== 1 ? 's' : ''}`,
            tooltip: 'Word count',
            alignment: StatusBarAlignment.RIGHT,
            priority: 99,
        });

        this.statusBar.setElement(KB_STATUS_BAR_IDS.CHAR_COUNT, {
            text: `${charCount} character${charCount !== 1 ? 's' : ''}`,
            tooltip: 'Character count',
            alignment: StatusBarAlignment.RIGHT,
            priority: 98,
        });
    }

    protected countWords(text: string): number {
        const withoutFrontmatter = text.replace(/^---[\s\S]*?---\n?/, '');
        const words = withoutFrontmatter
            .replace(/[#*_`~\[\]()]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
        return words.length;
    }

    protected clearStatusBarItems(): void {
        this.statusBar.removeElement(KB_STATUS_BAR_IDS.BACKLINKS);
        this.statusBar.removeElement(KB_STATUS_BAR_IDS.WORD_COUNT);
        this.statusBar.removeElement(KB_STATUS_BAR_IDS.CHAR_COUNT);
    }
}
