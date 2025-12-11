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
 * Backlinks panel widget - shows incoming links to the current note
 * Following Foam's connections panel pattern
 */

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget, Message } from '@theia/core/lib/browser/widgets';
import { OpenerService, open } from '@theia/core/lib/browser';
import { EditorManager } from '@theia/editor/lib/browser';
import { KnowledgeBaseService, Backlink } from '../../common/knowledge-base-protocol';
import URI from '@theia/core/lib/common/uri';

export const BACKLINKS_WIDGET_ID = 'knowledge-base-backlinks';

@injectable()
export class BacklinksWidget extends BaseWidget {
    static readonly ID = BACKLINKS_WIDGET_ID;
    static readonly LABEL = 'Backlinks';

    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    private backlinks: Backlink[] = [];

    constructor() {
        super();
        this.id = BACKLINKS_WIDGET_ID;
        this.title.label = 'Backlinks';
        this.title.caption = 'Backlinks';
        this.title.closable = true;
        this.title.iconClass = 'codicon codicon-references';
        this.addClass('theia-backlinks-widget');
    }

    @postConstruct()
    protected init(): void {
        this.update();

        // Update when active editor changes
        this.toDispose.push(this.editorManager.onActiveEditorChanged(() => this.updateBacklinks()));

        // Initial update
        this.updateBacklinks();
    }

    protected async updateBacklinks(): Promise<void> {
        const editor = this.editorManager.activeEditor;
        if (!editor) {
            this.backlinks = [];
            this.update();
            return;
        }

        const uri = editor.editor.document.uri;
        if (!uri.endsWith('.md')) {
            this.backlinks = [];
            this.update();
            return;
        }

        try {
            this.backlinks = await this.knowledgeBaseService.getBacklinks(uri);
            this.update();
        } catch (error) {
            console.error('[BacklinksWidget] Error updating backlinks:', error);
            this.backlinks = [];
            this.update();
        }
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.updateBacklinks();
    }

    protected override onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        this.render();
    }

    protected render(): void {
        this.node.innerHTML = '';

        if (this.backlinks.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'theia-widget-noInfo';
            emptyMsg.textContent = 'No backlinks';
            this.node.appendChild(emptyMsg);
            return;
        }

        // Group by source file
        const grouped = new Map<string, Backlink[]>();
        for (const backlink of this.backlinks) {
            const existing = grouped.get(backlink.sourceUri) || [];
            existing.push(backlink);
            grouped.set(backlink.sourceUri, existing);
        }

        const container = document.createElement('div');
        container.className = 'backlinks-container';

        for (const [sourceUri, links] of grouped.entries()) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'backlink-group';

            // Source file header
            const header = document.createElement('div');
            header.className = 'backlink-source';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'codicon codicon-file';
            header.appendChild(iconSpan);
            header.appendChild(document.createTextNode(` ${links[0].sourceTitle} `));
            const countSpan = document.createElement('span');
            countSpan.className = 'backlink-count';
            countSpan.textContent = `(${links.length})`;
            header.appendChild(countSpan);
            header.onclick = async () => {
                await open(this.openerService, new URI(sourceUri));
            };
            groupDiv.appendChild(header);

            // Individual backlink items
            for (const link of links) {
                const item = document.createElement('div');
                item.className = 'backlink-item';
                item.textContent = link.context;
                item.title = `Line ${link.line}`;
                item.onclick = async () => {
                    try {
                        await open(this.openerService, new URI(link.sourceUri));
                    } catch (error) {
                        console.error('[BacklinksWidget] Error opening backlink:', error);
                    }
                };
                groupDiv.appendChild(item);
            }

            container.appendChild(groupDiv);
        }

        this.node.appendChild(container);
    }
}
