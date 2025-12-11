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
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common/command';
import { ViewModeService } from './view-mode-service';

/**
 * KB View Command Filter (Phase 7)
 *
 * Filters commands based on the current view mode.
 * In KB View mode, hides developer-specific commands to maintain
 * a clean, document-focused interface.
 *
 * Strategy:
 * - Uses command enablement handlers to dynamically hide commands
 * - Checks ViewModeService.currentMode before enabling commands
 * - Maintains a list of developer-only commands
 */
@injectable()
export class KBViewCommandFilter implements CommandContribution {
    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    /**
     * Developer-specific commands to hide in KB View mode.
     *
     * Categories:
     * - Debug commands
     * - SCM/Git commands
     * - Terminal commands
     * - Task runner commands
     * - Build/compile commands
     */
    private readonly developerCommands = new Set<string>([
        // Debug commands
        'debug:start',
        'debug:stop',
        'debug:restart',
        'debug:step-over',
        'debug:step-into',
        'debug:step-out',
        'debug:continue',
        'debug:pause',
        'debug:toggle-breakpoint',

        // SCM/Git commands
        'git.commit',
        'git.push',
        'git.pull',
        'git.sync',
        'git.checkout',
        'git.branch',
        'git.merge',
        'git.rebase',
        'scm.acceptInput',
        'scm.refresh',

        // Terminal commands
        'terminal:new',
        'terminal:split',
        'terminal:kill',
        'terminal:clear',
        'workbench.action.terminal.toggleTerminal',
        'workbench.action.terminal.new',
        'workbench.action.terminal.focus',

        // Task runner commands
        'task:run',
        'task:rerun',
        'task:configure',
        'workbench.action.tasks.build',
        'workbench.action.tasks.test',

        // Build/compile commands
        'workbench.action.tasks.build',
        'typescript.build',
        'typescript.watch',

        // Problems/output panels
        'workbench.actions.view.problems',
        'workbench.action.output.toggleOutput',

        // Extension development
        'extension:install',
        'extension:uninstall',
        'extension:enable',
        'extension:disable',
    ]);

    /**
     * KB View-specific commands that should only be visible in KB View mode.
     */
    private readonly kbViewCommands = new Set<string>([
        'kb-view.switch-to-kb-view',
        'kb-view.switch-to-developer',
        'kb-view.create-daily-note',
        'kb-view.create-note-from-template',
        'kb-view.show-knowledge-graph',
        'kb-view.show-backlinks',
        'kb-view.show-tags',
    ]);

    registerCommands(registry: CommandRegistry): void {
        // Register handlers that disable developer commands in KB View mode
        // This blocks both menu items AND keybindings
        for (const commandId of this.developerCommands) {
            this.registerBlockingHandler(registry, commandId);
        }
    }

    /**
     * Registers a handler that blocks a command when in KB View mode.
     * The handler uses isEnabled to prevent keybinding execution.
     */
    private registerBlockingHandler(registry: CommandRegistry, commandId: string): void {
        // Check if command exists (it might not be registered yet)
        // We register our handler anyway - it will take effect when the command is available
        registry.registerHandler(commandId, {
            execute: () => {
                // Do nothing - command is blocked in KB View mode
                // The original handler won't be called because we're the active handler
            },
            isEnabled: () =>
                // Only enabled when NOT in KB View mode
                this.viewModeService.currentMode !== 'kb-view',
            isVisible: () =>
                // Hide in menus when in KB View mode
                this.viewModeService.currentMode !== 'kb-view',
        });
    }

    /**
     * Checks if a command should be visible in the current mode.
     */
    public isCommandVisible(commandId: string): boolean {
        const currentMode = this.viewModeService.currentMode;

        if (currentMode === 'kb-view') {
            // In KB View: hide developer commands
            return !this.developerCommands.has(commandId);
        } else {
            // In Developer mode: hide KB View-specific commands
            return !this.kbViewCommands.has(commandId);
        }
    }

    /**
     * Adds a custom developer command to the filter list.
     * Useful for third-party extensions that want to integrate with KB View.
     */
    public addDeveloperCommand(commandId: string): void {
        this.developerCommands.add(commandId);
    }

    /**
     * Adds a custom KB View command to the filter list.
     */
    public addKBViewCommand(commandId: string): void {
        this.kbViewCommands.add(commandId);
    }
}
