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
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { CommonCommands } from '@theia/core/lib/browser';
import { ViewModeService } from '../view-mode-service';

export const VAULT_SELECTOR_WIDGET_ID = 'quallaa-vault-selector';

/**
 * Obsidian-style vault selector widget.
 * Displays at the bottom of the left sidebar with:
 * - Vault icon + current workspace/vault name
 * - Help button
 * - Settings button
 */
@injectable()
export class VaultSelectorWidget extends ReactWidget {
    static readonly ID = VAULT_SELECTOR_WIDGET_ID;
    static readonly LABEL = 'Vault';

    @inject(CommandService)
    protected readonly commandService: CommandService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    protected vaultName: string = 'No Vault Open';
    protected vaultPath: string = '';

    @postConstruct()
    protected init(): void {
        console.log('[VaultSelectorWidget] @postConstruct init() called');
        this.id = VaultSelectorWidget.ID;
        this.title.label = VaultSelectorWidget.LABEL;
        this.title.caption = VaultSelectorWidget.LABEL;
        this.title.closable = false;
        this.addClass('quallaa-vault-selector-widget');

        // Listen for workspace changes
        this.workspaceService.onWorkspaceChanged(() => {
            this.updateVaultInfo();
        });

        // Initialize vault info
        this.updateVaultInfo();
    }

    protected updateVaultInfo(): void {
        const workspace = this.workspaceService.workspace;
        if (workspace) {
            // workspace.resource is already a URI string
            const resourceStr = workspace.resource.toString();
            // Extract the folder name from the path
            const parts = resourceStr.split('/');
            this.vaultName = parts[parts.length - 1] || 'Vault';
            this.vaultPath = resourceStr;
        } else {
            this.vaultName = 'No Vault Open';
            this.vaultPath = '';
        }
        this.update();
    }

    protected handleVaultClick = async (): Promise<void> => {
        // Open folder picker to switch workspace/vault
        try {
            await this.commandService.executeCommand('workspace:openWorkspace');
        } catch (error) {
            console.error('[VaultSelectorWidget] Failed to open workspace:', error);
        }
    };

    protected handleHelpClick = async (): Promise<void> => {
        // Open help - could link to docs or show help widget
        try {
            await this.commandService.executeCommand(CommonCommands.ABOUT_COMMAND.id);
        } catch (error) {
            console.error('[VaultSelectorWidget] Failed to open help:', error);
        }
    };

    protected handleSettingsClick = async (): Promise<void> => {
        // Open settings
        try {
            await this.commandService.executeCommand(CommonCommands.OPEN_PREFERENCES.id);
        } catch (error) {
            console.error('[VaultSelectorWidget] Failed to open settings:', error);
        }
    };

    protected render(): React.ReactNode {
        return (
            <div className="quallaa-vault-selector-container">
                <button className="quallaa-vault-selector-vault-button" onClick={this.handleVaultClick} title={this.vaultPath || 'Click to open a vault'} type="button">
                    <i className="codicon codicon-folder"></i>
                    <span className="quallaa-vault-selector-name">{this.vaultName}</span>
                </button>
                <div className="quallaa-vault-selector-actions">
                    <button className="quallaa-vault-selector-action" onClick={this.handleHelpClick} title="Help" type="button">
                        <i className="codicon codicon-question"></i>
                    </button>
                    <button className="quallaa-vault-selector-action" onClick={this.handleSettingsClick} title="Settings" type="button">
                        <i className="codicon codicon-settings-gear"></i>
                    </button>
                </div>
            </div>
        );
    }
}
