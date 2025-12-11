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
 * Contribution for registering the backlinks panel
 * Following Foam's connections panel pattern
 */

import { AbstractViewContribution } from '@theia/core/lib/browser';
import { Command, CommandRegistry } from '@theia/core/lib/common/command';
import { BacklinksWidget, BACKLINKS_WIDGET_ID } from './backlinks-widget';

export const TOGGLE_BACKLINKS_COMMAND: Command = {
    id: 'knowledge-base.toggle-backlinks',
    label: 'Toggle Backlinks Panel',
};

// Note: Do NOT add @injectable() here - parent AbstractViewContribution is already decorated
export class BacklinksContribution extends AbstractViewContribution<BacklinksWidget> {
    constructor() {
        super({
            widgetId: BACKLINKS_WIDGET_ID,
            widgetName: 'Backlinks',
            defaultWidgetOptions: {
                area: 'right',
                rank: 500,
            },
            toggleCommandId: TOGGLE_BACKLINKS_COMMAND.id,
        });
    }

    override registerCommands(registry: CommandRegistry): void {
        super.registerCommands(registry);
    }
}
