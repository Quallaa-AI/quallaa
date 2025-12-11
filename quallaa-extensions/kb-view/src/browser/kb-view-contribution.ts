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
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { DefaultFrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { ViewModeService } from './view-mode-service';
import { LayoutManager } from './layout-manager';
import { MessageService } from '@theia/core/lib/common/message-service';
import { QuickInputService, QuickPickItem } from '@theia/core/lib/browser/quick-input';
import { KBViewWidgetManager } from './kb-view-widget-manager';

export namespace KBViewCommands {
    // Legacy mode commands (backward compatibility)
    export const TOGGLE_MODE: Command = {
        id: 'kb-view.toggleMode',
        category: 'View',
        label: 'Toggle KB View / Developer Mode',
    };

    export const SWITCH_TO_KB_VIEW: Command = {
        id: 'kb-view.switchToKBView',
        category: 'View',
        label: 'Switch to KB View Mode',
    };

    export const SWITCH_TO_DEVELOPER: Command = {
        id: 'kb-view.switchToDeveloper',
        category: 'View',
        label: 'Switch to Developer Mode',
    };

    // Layout management commands (Priority 2)
    export const SWITCH_LAYOUT: Command = {
        id: 'kb-view.switchLayout',
        category: 'View',
        label: 'Switch Workspace Layout...',
    };

    export const SAVE_LAYOUT: Command = {
        id: 'kb-view.saveLayout',
        category: 'View',
        label: 'Save Current Layout...',
    };

    export const DELETE_LAYOUT: Command = {
        id: 'kb-view.deleteLayout',
        category: 'View',
        label: 'Delete Layout...',
    };

    export const RENAME_LAYOUT: Command = {
        id: 'kb-view.renameLayout',
        category: 'View',
        label: 'Rename Layout...',
    };
}

@injectable()
export class KBViewContribution extends DefaultFrontendApplicationContribution implements CommandContribution, MenuContribution {
    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    @inject(LayoutManager)
    protected readonly layoutManager: LayoutManager;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(KBViewWidgetManager)
    protected readonly widgetManager: KBViewWidgetManager;

    registerCommands(commands: CommandRegistry): void {
        console.log('[KBViewContribution] Registering KB View commands');
        commands.registerCommand(KBViewCommands.TOGGLE_MODE, {
            execute: async () => {
                await this.viewModeService.toggleMode();
                const currentMode = this.viewModeService.currentMode;
                const modeLabel = currentMode === 'kb-view' ? 'KB View' : 'Developer';
                this.messageService.info(`Switched to ${modeLabel} mode`);
            },
        });

        commands.registerCommand(KBViewCommands.SWITCH_TO_KB_VIEW, {
            execute: async () => {
                await this.viewModeService.switchMode('kb-view');
                this.messageService.info('Switched to KB View mode');
            },
            isEnabled: () => this.viewModeService.currentMode === 'developer',
        });

        commands.registerCommand(KBViewCommands.SWITCH_TO_DEVELOPER, {
            execute: async () => {
                await this.viewModeService.switchMode('developer');
                this.messageService.info('Switched to Developer mode');
            },
            isEnabled: () => this.viewModeService.currentMode === 'kb-view',
        });

        // Layout management commands
        commands.registerCommand(KBViewCommands.SWITCH_LAYOUT, {
            execute: async () => {
                const layouts = await this.layoutManager.listLayouts();
                const items: QuickPickItem[] = layouts.map(layout => ({
                    label: layout.name,
                    description: layout.isBuiltIn ? 'Built-in' : 'Custom',
                    detail: layout.description,
                    id: layout.id,
                }));

                const selected = await this.quickInputService.showQuickPick(items, {
                    placeholder: 'Select a workspace layout',
                });

                if (selected && selected.id) {
                    await this.layoutManager.switchLayout(selected.id);
                }
            },
        });

        commands.registerCommand(KBViewCommands.SAVE_LAYOUT, {
            execute: async () => {
                const name = await this.quickInputService.input({
                    prompt: 'Enter a name for this layout',
                    placeHolder: 'e.g., Research Mode, Writing Mode, Deep Work',
                });

                if (!name) {
                    return;
                }

                const description = await this.quickInputService.input({
                    prompt: 'Enter a description (optional)',
                    placeHolder: 'Brief description of this layout',
                });

                // Generate ID from name
                const layoutId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                await this.layoutManager.saveLayout(layoutId, name, description || undefined);
            },
        });

        commands.registerCommand(KBViewCommands.DELETE_LAYOUT, {
            execute: async () => {
                const layouts = await this.layoutManager.listLayouts();
                const customLayouts = layouts.filter(l => !l.isBuiltIn);

                if (customLayouts.length === 0) {
                    this.messageService.warn('No custom layouts to delete');
                    return;
                }

                const items: QuickPickItem[] = customLayouts.map(layout => ({
                    label: layout.name,
                    detail: layout.description,
                    id: layout.id,
                }));

                const selected = await this.quickInputService.showQuickPick(items, {
                    placeholder: 'Select a layout to delete',
                });

                if (selected && selected.id) {
                    await this.layoutManager.deleteLayout(selected.id);
                }
            },
        });

        commands.registerCommand(KBViewCommands.RENAME_LAYOUT, {
            execute: async () => {
                const layouts = await this.layoutManager.listLayouts();
                const customLayouts = layouts.filter(l => !l.isBuiltIn);

                if (customLayouts.length === 0) {
                    this.messageService.warn('No custom layouts to rename');
                    return;
                }

                const items: QuickPickItem[] = customLayouts.map(layout => ({
                    label: layout.name,
                    detail: layout.description,
                    id: layout.id,
                }));

                const selected = await this.quickInputService.showQuickPick(items, {
                    placeholder: 'Select a layout to rename',
                });

                if (!selected || !selected.id) {
                    return;
                }

                const newName = await this.quickInputService.input({
                    prompt: 'Enter new name for this layout',
                    value: selected.label,
                });

                if (newName) {
                    await this.layoutManager.renameLayout(selected.id, newName);
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Add to View menu
        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: KBViewCommands.TOGGLE_MODE.id,
            label: KBViewCommands.TOGGLE_MODE.label,
            order: '0',
        });

        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: KBViewCommands.SWITCH_TO_KB_VIEW.id,
            label: KBViewCommands.SWITCH_TO_KB_VIEW.label,
            order: '1',
        });

        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: KBViewCommands.SWITCH_TO_DEVELOPER.id,
            label: KBViewCommands.SWITCH_TO_DEVELOPER.label,
            order: '2',
        });

        // Add direct action to KB View menu (top level)
        menus.registerMenuAction(['menubar', '5_kb-view'], {
            commandId: KBViewCommands.TOGGLE_MODE.id,
            label: 'Toggle Mode',
            order: '0',
        });

        // Add to KB View > Mode submenu
        menus.registerMenuAction(['menubar', '5_kb-view', '3_mode'], {
            commandId: KBViewCommands.SWITCH_TO_KB_VIEW.id,
            label: 'KB View Mode',
            order: '1',
        });

        menus.registerMenuAction(['menubar', '5_kb-view', '3_mode'], {
            commandId: KBViewCommands.SWITCH_TO_DEVELOPER.id,
            label: 'Developer Mode',
            order: '2',
        });

        menus.registerMenuAction(['menubar', '5_kb-view', '3_mode'], {
            commandId: KBViewCommands.TOGGLE_MODE.id,
            label: 'Toggle Mode',
            order: '0',
        });

        // Layout management submenu
        menus.registerMenuAction(['menubar', '5_kb-view', '4_layouts'], {
            commandId: KBViewCommands.SWITCH_LAYOUT.id,
            label: 'Switch Layout...',
            order: '1',
        });

        menus.registerMenuAction(['menubar', '5_kb-view', '4_layouts'], {
            commandId: KBViewCommands.SAVE_LAYOUT.id,
            label: 'Save Current Layout...',
            order: '2',
        });

        menus.registerMenuAction(['menubar', '5_kb-view', '4_layouts'], {
            commandId: KBViewCommands.RENAME_LAYOUT.id,
            label: 'Rename Layout...',
            order: '3',
        });

        menus.registerMenuAction(['menubar', '5_kb-view', '4_layouts'], {
            commandId: KBViewCommands.DELETE_LAYOUT.id,
            label: 'Delete Layout...',
            order: '4',
        });
    }
}
