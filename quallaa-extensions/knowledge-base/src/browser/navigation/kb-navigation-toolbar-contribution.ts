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

import { injectable } from '@theia/core/shared/inversify';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { Widget } from '@theia/core/lib/browser';
import { EditorWidget } from '@theia/editor/lib/browser';
import { EditorCommands } from '@theia/editor/lib/browser/editor-command';

/**
 * Contributes Obsidian-style back/forward navigation buttons to the editor pane header.
 * These appear at the left of the editor tab bar, similar to Obsidian's per-pane navigation.
 */
@injectable()
export class KBNavigationToolbarContribution implements TabBarToolbarContribution {
    protected isEditorWidget(widget: Widget | undefined): boolean {
        return widget instanceof EditorWidget;
    }

    async registerToolbarItems(registry: TabBarToolbarRegistry): Promise<void> {
        registry.registerItem({
            id: 'kb-navigation-back',
            command: EditorCommands.GO_BACK.id,
            icon: 'codicon-arrow-left',
            tooltip: 'Go Back',
            priority: -100,
            isVisible: widget => this.isEditorWidget(widget),
        });

        registry.registerItem({
            id: 'kb-navigation-forward',
            command: EditorCommands.GO_FORWARD.id,
            icon: 'codicon-arrow-right',
            tooltip: 'Go Forward',
            priority: -99,
            isVisible: widget => this.isEditorWidget(widget),
        });
    }
}
