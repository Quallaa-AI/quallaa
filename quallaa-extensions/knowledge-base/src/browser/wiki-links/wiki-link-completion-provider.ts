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
 * Monaco completion provider for wiki links
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import * as monaco from '@theia/monaco-editor-core';
import { KnowledgeBaseService } from '../../common/knowledge-base-protocol';
import { getWikiLinkAtPosition } from '../../common/wiki-link-parser';

@injectable()
export class WikiLinkCompletionProvider implements monaco.languages.CompletionItemProvider {
    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    readonly triggerCharacters = ['['];

    async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
    ): Promise<monaco.languages.CompletionList | undefined> {
        // Only provide completions for markdown files
        const languageId = model.getLanguageId();
        const uri = model.uri.toString();
        const isMarkdown = languageId === 'markdown' || uri.endsWith('.md');

        if (!isMarkdown) {
            return undefined;
        }

        const content = model.getValue();
        const offset = model.getOffsetAt(position);

        // Check if we're inside a wiki link [[
        const wikiLink = getWikiLinkAtPosition(content, offset);
        if (!wikiLink) {
            return undefined;
        }

        // Get all notes and filter by current input
        const query = wikiLink.text || '';
        const notes = await this.knowledgeBaseService.searchNotes(query);

        const suggestions: monaco.languages.CompletionItem[] = notes.map(note => ({
            label: note.title,
            kind: monaco.languages.CompletionItemKind.File,
            detail: note.path,
            insertText: note.title,
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column - query.length,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            },
            sortText: note.title,
        }));

        return {
            suggestions,
            incomplete: false,
        };
    }
}
