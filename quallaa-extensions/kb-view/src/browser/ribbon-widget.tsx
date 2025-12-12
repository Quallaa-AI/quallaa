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
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { CommandService, MessageService } from '@theia/core/lib/common';
import { ViewModeService } from './view-mode-service';

export const RIBBON_WIDGET_ID = 'quallaa-ribbon';

// Ribbon command IDs for placeholder features
export namespace RibbonCommands {
    export const TOGGLE_SIDEBAR = 'workbench.action.toggleSidebarVisibility';
    export const QUICK_OPEN = 'workbench.action.quickOpen';
    export const SHOW_GRAPH = 'knowledge-base.show-graph';
    export const OPEN_DAILY_NOTE = 'knowledge-base.open-daily-note';
    // Placeholder commands for features not yet implemented
    export const TOGGLE_BOOKMARKS = 'kb.toggleBookmarks';
    export const SHOW_TEMPLATES = 'kb.showTemplates';
    export const SHOW_CONNECTIONS = 'kb.showConnections';
}

interface RibbonAction {
    id: string;
    icon: string;
    label: string;
    command?: string;
    onClick?: () => void;
    isPlaceholder?: boolean;
}

/**
 * Obsidian-style ribbon widget - a slim vertical bar on the far left.
 * Contains quick actions that match Obsidian's ribbon layout.
 *
 * Obsidian ribbon icons (top to bottom):
 * 1. Collapse/expand sidebar toggle
 * 2. Search
 * 3. Bookmarks
 * 4. Graph view
 * 5. Canvas (skipped - not implemented)
 * 6. Templates
 * 7. Connections
 */
@injectable()
export class RibbonWidget extends ReactWidget {
    static readonly ID = RIBBON_WIDGET_ID;
    static readonly LABEL = 'Ribbon';

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    protected actions: RibbonAction[] = [];

    @postConstruct()
    protected init(): void {
        console.log('[RibbonWidget] @postConstruct init() called');
        this.id = RibbonWidget.ID;
        this.title.label = RibbonWidget.LABEL;
        this.title.caption = RibbonWidget.LABEL;
        this.title.closable = false; // Ribbon should not be closable
        this.addClass('quallaa-ribbon-widget');

        // Define ribbon actions to match Obsidian's layout
        this.actions = [
            // 1. Collapse/expand sidebar toggle
            {
                id: 'toggle-sidebar',
                icon: 'codicon-layout-sidebar-left',
                label: 'Toggle Sidebar',
                command: RibbonCommands.TOGGLE_SIDEBAR,
            },
            // 2. Search (Quick Open)
            {
                id: 'search',
                icon: 'codicon-search',
                label: 'Search',
                command: RibbonCommands.QUICK_OPEN,
            },
            // 3. Bookmarks (placeholder)
            {
                id: 'bookmarks',
                icon: 'codicon-bookmark',
                label: 'Bookmarks',
                isPlaceholder: true,
                onClick: () => this.showComingSoon('Bookmarks'),
            },
            // 4. Graph view
            {
                id: 'graph',
                icon: 'codicon-type-hierarchy-sub',
                label: 'Graph View',
                command: RibbonCommands.SHOW_GRAPH,
            },
            // 5. Canvas - skipped (not in Quallaa scope)
            // 6. Templates (placeholder)
            {
                id: 'templates',
                icon: 'codicon-file-code',
                label: 'Templates',
                isPlaceholder: true,
                onClick: () => this.showComingSoon('Templates'),
            },
            // 7. Connections (placeholder)
            {
                id: 'connections',
                icon: 'codicon-git-merge',
                label: 'Connections',
                isPlaceholder: true,
                onClick: () => this.showComingSoon('Connections'),
            },
        ];
        console.log('[RibbonWidget] Actions set up, count:', this.actions.length);
        // Trigger re-render to show actions
        this.update();
    }

    /**
     * Show a "Coming Soon" notification for placeholder features
     */
    protected showComingSoon(featureName: string): void {
        this.messageService.info(`${featureName} - Coming Soon!`);
    }

    protected handleActionClick = async (action: RibbonAction): Promise<void> => {
        if (action.onClick) {
            action.onClick();
        } else if (action.command) {
            try {
                await this.commandService.executeCommand(action.command);
            } catch (error) {
                console.error(`Failed to execute command ${action.command}:`, error);
                // Show user-friendly error for missing commands
                this.messageService.error(`Command not available: ${action.label}`);
            }
        }
    };

    protected render(): React.ReactNode {
        console.log('[RibbonWidget] render() called, actions count:', this.actions.length);
        return (
            <div className="quallaa-ribbon-container">
                <div className="quallaa-ribbon-actions">
                    {this.actions.map(action => {
                        if (action.id === 'separator') {
                            return <div key={action.id} className="quallaa-ribbon-separator" />;
                        }
                        return (
                            <button
                                key={action.id}
                                className={`quallaa-ribbon-action ${action.isPlaceholder ? 'quallaa-ribbon-action-placeholder' : ''}`}
                                onClick={() => this.handleActionClick(action)}
                                title={action.isPlaceholder ? `${action.label} (Coming Soon)` : action.label}
                                type="button"
                            >
                                <i className={`codicon ${action.icon}`}></i>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }
}
