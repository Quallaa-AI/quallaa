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
 * Tags browser widget - displays all tags in the knowledge base
 * Following Foam's tags pattern with hierarchical support
 */

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { BaseWidget, Message } from '@theia/core/lib/browser/widgets';
import { OpenerService, open } from '@theia/core/lib/browser';
import { KnowledgeBaseService, TagEntry, Note } from '../../common/knowledge-base-protocol';
import URI from '@theia/core/lib/common/uri';

export const TAGS_WIDGET_ID = 'knowledge-base-tags-widget';

@injectable()
export class TagsWidget extends BaseWidget {
    static readonly ID = TAGS_WIDGET_ID;
    static readonly LABEL = 'Tags';

    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    private tags: TagEntry[] = [];
    private expandedTags: Set<string> = new Set();
    private selectedTag: string | undefined;
    private filteredNotes: Note[] = [];

    constructor() {
        super();
        this.id = TAGS_WIDGET_ID;
        this.title.label = TagsWidget.LABEL;
        this.title.caption = TagsWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'codicon codicon-tag';
        this.addClass('theia-tags-widget');
    }

    @postConstruct()
    protected init(): void {
        this.update();
        this.loadTags();
    }

    protected async loadTags(): Promise<void> {
        try {
            this.tags = await this.knowledgeBaseService.getTagsIndex();
            this.update();
        } catch (error) {
            console.error('[TagsWidget] Failed to load tags:', error);
            this.tags = [];
            this.update();
        }
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.loadTags();
    }

    protected override onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        this.render();
    }

    protected render(): void {
        this.node.innerHTML = '';

        if (this.tags.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'theia-widget-noInfo';
            emptyMsg.textContent = 'No tags found in workspace';
            this.node.appendChild(emptyMsg);
            return;
        }

        const container = document.createElement('div');
        container.className = 'tags-container';

        // Add header with count
        const header = document.createElement('div');
        header.className = 'tags-header';
        const totalNotes = new Set(this.tags.flatMap(t => t.noteUris)).size;
        header.innerHTML = `
            <div class="tags-stats">
                <span class="stat-item"><span class="codicon codicon-tag"></span> ${this.tags.length} tags</span>
                <span class="stat-item"><span class="codicon codicon-file"></span> ${totalNotes} notes</span>
            </div>
        `;
        container.appendChild(header);

        // Group tags by hierarchy (e.g., project/backend, project/frontend)
        const hierarchicalTags = this.groupTagsByHierarchy();

        // Render tag tree
        const tagsList = document.createElement('div');
        tagsList.className = 'tags-list';

        for (const [parentTag, children] of hierarchicalTags.entries()) {
            if (parentTag === '') {
                // Root level tags (no parent)
                for (const tag of children) {
                    tagsList.appendChild(this.renderTagItem(tag, 0));
                }
            } else {
                // Hierarchical tags
                const parentItem = this.renderParentTagItem(parentTag, children);
                tagsList.appendChild(parentItem);
            }
        }

        container.appendChild(tagsList);

        // If a tag is selected, show filtered notes
        if (this.selectedTag && this.filteredNotes.length > 0) {
            const notesList = document.createElement('div');
            notesList.className = 'tags-notes-list';

            const notesHeader = document.createElement('div');
            notesHeader.className = 'tags-notes-header';
            notesHeader.innerHTML = `
                <span class="codicon codicon-chevron-left"></span>
                <span>Notes with #${this.selectedTag}</span>
                <span class="notes-count">(${this.filteredNotes.length})</span>
            `;
            notesHeader.onclick = () => {
                this.selectedTag = undefined;
                this.filteredNotes = [];
                this.update();
            };
            notesList.appendChild(notesHeader);

            for (const note of this.filteredNotes) {
                const noteItem = document.createElement('div');
                noteItem.className = 'tags-note-item';
                noteItem.innerHTML = `
                    <span class="codicon codicon-file"></span>
                    <span class="note-title">${note.title}</span>
                `;
                noteItem.onclick = async () => {
                    await this.openNote(note);
                };
                notesList.appendChild(noteItem);
            }

            container.appendChild(notesList);
        }

        this.node.appendChild(container);
    }

    private groupTagsByHierarchy(): Map<string, TagEntry[]> {
        const hierarchical = new Map<string, TagEntry[]>();

        for (const tag of this.tags) {
            const parts = tag.tag.split('/');
            if (parts.length === 1) {
                // Root level tag
                if (!hierarchical.has('')) {
                    hierarchical.set('', []);
                }
                hierarchical.get('')!.push(tag);
            } else {
                // Hierarchical tag (e.g., project/backend)
                const parent = parts.slice(0, -1).join('/');
                if (!hierarchical.has(parent)) {
                    hierarchical.set(parent, []);
                }
                hierarchical.get(parent)!.push(tag);
            }
        }

        return hierarchical;
    }

    private renderTagItem(tag: TagEntry, indent: number): HTMLElement {
        const item = document.createElement('div');
        item.className = 'tag-item';
        item.style.paddingLeft = `${indent * 16 + 8}px`;

        const icon = document.createElement('span');
        icon.className = 'codicon codicon-tag';
        item.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'tag-label';
        label.textContent = tag.tag;
        item.appendChild(label);

        const count = document.createElement('span');
        count.className = 'tag-count';
        count.textContent = `${tag.count}`;
        item.appendChild(count);

        item.onclick = async () => {
            await this.selectTag(tag.tag);
        };

        return item;
    }

    private renderParentTagItem(parentTag: string, children: TagEntry[]): HTMLElement {
        const parentItem = document.createElement('div');
        parentItem.className = 'tag-parent-item';

        const isExpanded = this.expandedTags.has(parentTag);

        const header = document.createElement('div');
        header.className = 'tag-parent-header';

        const chevron = document.createElement('span');
        chevron.className = `codicon ${isExpanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`;
        header.appendChild(chevron);

        const icon = document.createElement('span');
        icon.className = 'codicon codicon-folder';
        header.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'tag-parent-label';
        label.textContent = parentTag;
        header.appendChild(label);

        const totalCount = children.reduce((sum, t) => sum + t.count, 0);
        const count = document.createElement('span');
        count.className = 'tag-count';
        count.textContent = `${totalCount}`;
        header.appendChild(count);

        header.onclick = () => {
            if (this.expandedTags.has(parentTag)) {
                this.expandedTags.delete(parentTag);
            } else {
                this.expandedTags.add(parentTag);
            }
            this.update();
        };

        parentItem.appendChild(header);

        if (isExpanded) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tag-children';
            for (const child of children) {
                childrenContainer.appendChild(this.renderTagItem(child, 1));
            }
            parentItem.appendChild(childrenContainer);
        }

        return parentItem;
    }

    private async selectTag(tag: string): Promise<void> {
        this.selectedTag = tag;
        try {
            this.filteredNotes = await this.knowledgeBaseService.getNotesWithTag(tag);
            this.update();
        } catch (error) {
            console.error('[TagsWidget] Failed to load notes for tag:', error);
            this.filteredNotes = [];
            this.update();
        }
    }

    private async openNote(note: Note): Promise<void> {
        try {
            const uri = new URI(note.uri);
            await open(this.openerService, uri);
        } catch (error) {
            console.error('[TagsWidget] Failed to open note:', error);
        }
    }

    public refresh(): void {
        this.loadTags();
    }
}
