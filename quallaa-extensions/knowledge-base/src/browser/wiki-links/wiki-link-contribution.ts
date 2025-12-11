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
 * Contribution that registers wiki link features with Monaco editors
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, OpenerService, open } from '@theia/core/lib/browser';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as monaco from '@theia/monaco-editor-core';
import { WikiLinkCompletionProvider } from './wiki-link-completion-provider';
import { WikiLinkProvider } from './wiki-link-provider';
import { DisposableCollection } from '@theia/core';
import { CommandContribution, CommandRegistry, Command } from '@theia/core/lib/common';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { KnowledgeBaseService } from '../../common/knowledge-base-protocol';
import URI from '@theia/core/lib/common/uri';

// Command definition
export const CREATE_NOTE_COMMAND: Command = {
    id: 'knowledge-base.create-note',
    label: 'Create Note from Wiki Link',
};

@injectable()
export class WikiLinkContribution implements FrontendApplicationContribution, CommandContribution {
    @inject(WikiLinkCompletionProvider)
    protected readonly completionProvider: WikiLinkCompletionProvider;

    @inject(WikiLinkProvider)
    protected readonly linkProvider: WikiLinkProvider;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    private readonly toDispose = new DisposableCollection();

    async onStart(): Promise<void> {
        console.log('[WikiLinkContribution] Registering wiki link features');

        // Register completion provider for markdown files
        this.toDispose.push(monaco.languages.registerCompletionItemProvider('markdown', this.completionProvider));
        this.toDispose.push(monaco.languages.registerCompletionItemProvider('plaintext', this.completionProvider));

        // Register link provider for markdown files (provides automatic underlines and click handling like Foam)
        this.toDispose.push(monaco.languages.registerLinkProvider('markdown', this.linkProvider));
        this.toDispose.push(monaco.languages.registerLinkProvider('plaintext', this.linkProvider));

        console.log('[WikiLinkContribution] Wiki link features registered');
    }

    /**
     * Register commands for wiki link operations
     */
    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(CREATE_NOTE_COMMAND, {
            execute: async (args: { target: string; sourceUri: string } | string) => {
                try {
                    console.log('[WikiLinkContribution] Raw args:', args, 'Type:', typeof args);

                    let params: { target: string; sourceUri: string };

                    // Handle both object and string formats
                    if (typeof args === 'string') {
                        try {
                            params = JSON.parse(decodeURIComponent(args));
                        } catch (e) {
                            // Try parsing as-is if decodeURIComponent fails
                            params = JSON.parse(args);
                        }
                    } else if (typeof args === 'object' && args) {
                        params = args;
                    } else {
                        console.error('[WikiLinkContribution] Invalid arguments format');
                        return;
                    }

                    const { target, sourceUri } = params;

                    if (!target) {
                        console.error('[WikiLinkContribution] No target specified');
                        return;
                    }

                    console.log(`[WikiLinkContribution] Creating note: ${target}`);

                    // Backend returns the URI where file should be created
                    const newNoteUriString = await this.knowledgeBaseService.createNote(target, sourceUri);
                    const createdUri = new URI(newNoteUriString);

                    // Frontend creates the actual file with a title
                    const content = `# ${target}\n\n`;
                    await this.fileService.create(createdUri, content);

                    // Open the newly created note
                    await open(this.openerService, createdUri);
                } catch (error) {
                    console.error('[WikiLinkContribution] Failed to create note:', error);
                }
            },
        });
    }

    onStop(): void {
        this.toDispose.dispose();
    }
}
