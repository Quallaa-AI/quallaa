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
import { CommandService } from '@theia/core/lib/common';
import { ViewModeService } from './view-mode-service';

export const RIBBON_WIDGET_ID = 'quallaa-ribbon';

interface RibbonAction {
    id: string;
    icon: string;
    label: string;
    command?: string;
    onClick?: () => void;
}

/**
 * Obsidian-style ribbon widget - a slim vertical bar on the far left.
 * Contains quick actions for common knowledge base operations.
 */
@injectable()
export class RibbonWidget extends ReactWidget {
    static readonly ID = RIBBON_WIDGET_ID;
    static readonly LABEL = 'Ribbon';

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    protected actions: RibbonAction[] = [];

    @postConstruct()
    protected init(): void {
        this.id = RibbonWidget.ID;
        this.title.label = RibbonWidget.LABEL;
        this.title.caption = RibbonWidget.LABEL;
        this.title.closable = false; // Ribbon should not be closable
        this.addClass('quallaa-ribbon-widget');

        // Define ribbon actions
        this.actions = [
            {
                id: 'graph',
                icon: 'codicon-type-hierarchy-sub',
                label: 'Open Knowledge Graph',
                command: 'quallaa.knowledge-graph.toggle',
            },
            {
                id: 'daily-note',
                icon: 'codicon-calendar',
                label: 'Create Daily Note',
                command: 'quallaa.daily-note.create',
            },
            {
                id: 'new-note',
                icon: 'codicon-new-file',
                label: 'Create New Note',
                command: 'quallaa.template.apply',
            },
            {
                id: 'separator',
                icon: '',
                label: '',
            },
            {
                id: 'toggle-mode',
                icon: 'codicon-layout',
                label: 'Switch View Mode',
                onClick: () => this.toggleViewMode(),
            },
        ];
    }

    protected toggleViewMode(): void {
        this.viewModeService.toggleMode();
    }

    protected handleActionClick = async (action: RibbonAction): Promise<void> => {
        if (action.onClick) {
            action.onClick();
        } else if (action.command) {
            try {
                await this.commandService.executeCommand(action.command);
            } catch (error) {
                console.error(`Failed to execute command ${action.command}:`, error);
            }
        }
    };

    protected render(): React.ReactNode {
        return (
            <div className="quallaa-ribbon-container">
                <div className="quallaa-ribbon-actions">
                    {this.actions.map(action => {
                        if (action.id === 'separator') {
                            return <div key={action.id} className="quallaa-ribbon-separator" />;
                        }
                        return (
                            <button key={action.id} className="quallaa-ribbon-action" onClick={() => this.handleActionClick(action)} title={action.label} type="button">
                                <i className={`codicon ${action.icon}`}></i>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }
}
