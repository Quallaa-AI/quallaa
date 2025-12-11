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
 * Contribution for Knowledge Graph widget
 * Following Foam's dataviz pattern
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WidgetManager, ApplicationShell } from '@theia/core/lib/browser';
import { CommandContribution, CommandRegistry, Command, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { GRAPH_WIDGET_ID } from './graph-widget';
import { CommonMenus } from '@theia/core/lib/browser';

export const SHOW_GRAPH_COMMAND: Command = {
    id: 'knowledge-base.show-graph',
    label: 'Knowledge Base: Show Graph',
};

@injectable()
export class GraphContribution implements FrontendApplicationContribution, CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    async onStart(): Promise<void> {
        // Widget initialization handled by widget factory
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(SHOW_GRAPH_COMMAND, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(GRAPH_WIDGET_ID);
                this.shell.addWidget(widget, { area: 'main' });
                this.shell.activateWidget(widget.id);
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: SHOW_GRAPH_COMMAND.id,
            label: SHOW_GRAPH_COMMAND.label,
        });
    }
}
