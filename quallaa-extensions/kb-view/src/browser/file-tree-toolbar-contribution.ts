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
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core/lib/common';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { Widget } from '@theia/core/lib/browser';
import { FileNavigatorWidget, FILE_NAVIGATOR_ID } from '@theia/navigator/lib/browser/navigator-widget';
import { WorkspaceCommands } from '@theia/workspace/lib/browser';
import { ViewModeService } from './view-mode-service';

/**
 * Commands for KB View file tree toolbar
 */
export namespace KBFileTreeCommands {
    export const NEW_NOTE: Command = {
        id: 'kb-view.newNote',
        label: 'New Note',
        category: 'KB View',
    };
    export const SORT_FILES: Command = {
        id: 'kb-view.sortFiles',
        label: 'Sort Files',
        category: 'KB View',
    };
}

/**
 * Contributes Obsidian-style toolbar icons to the file tree header.
 * These icons are visible only in KB View mode when the Explorer is active.
 *
 * Icons added:
 * - New Note (creates .md file)
 * - New Folder (uses Theia's built-in command)
 * - Sort (placeholder - shows sort options)
 * - Collapse All (uses Theia's built-in command)
 */
@injectable()
export class FileTreeToolbarContribution implements TabBarToolbarContribution, CommandContribution {
    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    constructor() {
        console.log('[FileTreeToolbarContribution] Constructor called');
    }

    /**
     * Check if the widget is the FileNavigatorWidget and we're in KB View mode
     */
    protected isFileNavigatorInKBView(widget: Widget | undefined): boolean {
        if (!widget) {
            return false;
        }
        const isNavigator = widget instanceof FileNavigatorWidget && widget.id === FILE_NAVIGATOR_ID;
        const isKBViewMode = this.viewModeService.currentMode === 'kb-view';
        return isNavigator && isKBViewMode;
    }

    registerCommands(commands: CommandRegistry): void {
        console.log('[FileTreeToolbarContribution] registerCommands called');
        // Register New Note command
        commands.registerCommand(KBFileTreeCommands.NEW_NOTE, {
            execute: async () => {
                // Execute the workspace new file command
                // The file will be created with .md extension by default in KB View
                try {
                    await commands.executeCommand(WorkspaceCommands.NEW_FILE.id);
                    // Note: In a future enhancement, we could:
                    // 1. Prompt for note name
                    // 2. Automatically add .md extension
                    // 3. Add default frontmatter
                } catch (error) {
                    console.error('[FileTreeToolbar] Failed to create new note:', error);
                    this.messageService.error('Failed to create new note');
                }
            },
            isEnabled: () => this.viewModeService.currentMode === 'kb-view',
            isVisible: () => this.viewModeService.currentMode === 'kb-view',
        });

        // Register Sort Files command (placeholder)
        commands.registerCommand(KBFileTreeCommands.SORT_FILES, {
            execute: () => {
                this.messageService.info('Sort options - Coming Soon!');
                // Future: Show quick pick with sort options:
                // - Name (A-Z)
                // - Name (Z-A)
                // - Modified (Newest)
                // - Modified (Oldest)
                // - Created (Newest)
                // - Created (Oldest)
            },
            isEnabled: () => this.viewModeService.currentMode === 'kb-view',
            isVisible: () => this.viewModeService.currentMode === 'kb-view',
        });
        console.log('[FileTreeToolbarContribution] Commands registered:', KBFileTreeCommands.NEW_NOTE.id, KBFileTreeCommands.SORT_FILES.id);
    }

    async registerToolbarItems(registry: TabBarToolbarRegistry): Promise<void> {
        // New Note button - KB View specific (creates markdown note)
        registry.registerItem({
            id: KBFileTreeCommands.NEW_NOTE.id,
            command: KBFileTreeCommands.NEW_NOTE.id,
            tooltip: 'New Note',
            priority: 0, // Leftmost
            isVisible: widget => this.isFileNavigatorInKBView(widget),
        });

        // New Folder button - uses Theia's built-in command
        registry.registerItem({
            id: 'kb-view.newFolder.toolbar',
            command: `${WorkspaceCommands.NEW_FOLDER.id}.toolbar`,
            tooltip: 'New Folder',
            priority: 1,
            isVisible: widget => this.isFileNavigatorInKBView(widget),
        });

        // Sort button - KB View specific
        registry.registerItem({
            id: KBFileTreeCommands.SORT_FILES.id,
            command: KBFileTreeCommands.SORT_FILES.id,
            icon: 'codicon-list-filter',
            tooltip: 'Sort Files',
            priority: 2,
            isVisible: widget => this.isFileNavigatorInKBView(widget),
        });

        // Collapse All button - uses Theia's built-in command
        registry.registerItem({
            id: 'kb-view.collapseAll.toolbar',
            command: 'navigator.collapse.all',
            icon: 'codicon-collapse-all',
            tooltip: 'Collapse All',
            priority: 3,
            isVisible: widget => this.isFileNavigatorInKBView(widget),
        });
    }
}
