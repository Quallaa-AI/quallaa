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
 * Contribution for tags browser
 * Registers commands, menu items, and keybindings for the tags widget
 */

import { AbstractViewContribution } from '@theia/core/lib/browser';
import { Command, CommandRegistry } from '@theia/core/lib/common/command';
import { TAGS_WIDGET_ID, TagsWidget } from './tags-widget';

export const TOGGLE_TAGS_COMMAND: Command = {
    id: 'knowledge-base.toggle-tags',
    label: 'Toggle Tags Browser',
};

export const REFRESH_TAGS_COMMAND: Command = {
    id: 'knowledge-base.refresh-tags',
    label: 'Refresh Tags',
};

// Note: Do NOT add @injectable() here - parent AbstractViewContribution is already decorated
export class TagsContribution extends AbstractViewContribution<TagsWidget> {
    constructor() {
        super({
            widgetId: TAGS_WIDGET_ID,
            widgetName: 'Tags',
            defaultWidgetOptions: {
                area: 'right',
                rank: 501,
            },
            toggleCommandId: TOGGLE_TAGS_COMMAND.id,
        });
    }

    override registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);

        registry.registerCommand(REFRESH_TAGS_COMMAND, {
            execute: async () => {
                const widget = await this.widget;
                widget.refresh();
            },
        });
    }
}
