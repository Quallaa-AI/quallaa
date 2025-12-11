/********************************************************************************
 * Copyright (C) 2025 Jeff Toffoli
 * Copyright (C) 2020 EclipseSource and others.
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

import * as React from 'react';

import { Message } from '@theia/core/lib/browser';
import { PreferenceService } from '@theia/core/lib/common';
import { inject } from '@theia/core/shared/inversify';
import { CommandRegistry } from '@theia/core/lib/common/command';

import { GettingStartedWidget } from '@theia/getting-started/lib/browser/getting-started-widget';
import { VSXEnvironment } from '@theia/vsx-registry/lib/common/vsx-environment';
import { WindowService } from '@theia/core/lib/browser/window/window-service';

// Note: Do NOT add @injectable() here - parent GettingStartedWidget is already decorated
export class TheiaIDEGettingStartedWidget extends GettingStartedWidget {
    @inject(VSXEnvironment)
    protected readonly environment: VSXEnvironment;

    @inject(WindowService)
    protected readonly windowService: WindowService;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    protected vscodeApiVersion: string;

    protected async doInit(): Promise<void> {
        super.doInit();
        this.vscodeApiVersion = await this.environment.getVscodeApiVersion();
        await this.preferenceService.ready;
        this.update();
    }

    // REMOVED: Focus-stealing behavior that was blocking keyboard shortcuts
    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        // Do NOT call focus() - it blocks F1/command palette
    }

    protected render(): React.ReactNode {
        return (
            <div className="gs-container quallaa-welcome">
                <div className="gs-content-container">
                    {this.renderHeader()}
                    <hr className="gs-hr" />

                    {/* Quick Actions */}
                    <div className="flex-grid">
                        <div className="col">{this.renderQuickActions()}</div>
                    </div>

                    {/* Knowledge Features */}
                    <div className="flex-grid">
                        <div className="col">{this.renderKnowledgeFeatures()}</div>
                    </div>

                    {/* Getting Started */}
                    <div className="flex-grid">
                        <div className="col">{this.renderGettingStarted()}</div>
                    </div>

                    {/* Recent Workspaces */}
                    <div className="flex-grid">
                        <div className="col">{this.renderRecentWorkspaces()}</div>
                    </div>

                    {/* Resources */}
                    <div className="flex-grid">
                        <div className="col">{this.renderResources()}</div>
                    </div>
                </div>

                <div className="gs-preference-container">{this.renderPreferences()}</div>
            </div>
        );
    }

    protected renderHeader(): React.ReactNode {
        return (
            <div className="gs-header">
                <div className="gs-logo"></div>
                <h1>Welcome to Quallaa</h1>
                <p className="gs-sub-header gs-tagline">Where knowledge becomes executable</p>
                <p className="gs-sub-header">{this.applicationInfo ? 'Version ' + this.applicationInfo.version : '1.66.100'}</p>
            </div>
        );
    }

    protected renderQuickActions(): React.ReactNode {
        return (
            <div className="gs-section">
                <h3 className="gs-section-header">Quick Actions</h3>
                <div className="gs-action-container">
                    <button className="theia-button gs-action-button" onClick={() => this.commandRegistry.executeCommand('daily-notes.openToday')}>
                        <i className="codicon codicon-calendar" />
                        <div className="gs-action-details">
                            <span className="gs-action-title">Today's Note</span>
                            <span className="gs-action-desc">Open or create today's daily note</span>
                        </div>
                    </button>

                    <button className="theia-button gs-action-button" onClick={() => this.commandRegistry.executeCommand('templates.createFromTemplate')}>
                        <i className="codicon codicon-file-add" />
                        <div className="gs-action-details">
                            <span className="gs-action-title">New Note from Template</span>
                            <span className="gs-action-desc">Create a note using a template</span>
                        </div>
                    </button>

                    <button className="theia-button gs-action-button" onClick={() => this.commandRegistry.executeCommand('knowledge-graph.focus')}>
                        <i className="codicon codicon-graph" />
                        <div className="gs-action-details">
                            <span className="gs-action-title">Knowledge Graph</span>
                            <span className="gs-action-desc">Visualize your note connections</span>
                        </div>
                    </button>

                    <button className="theia-button gs-action-button" onClick={() => this.commandRegistry.executeCommand('file.openFolder')}>
                        <i className="codicon codicon-folder-opened" />
                        <div className="gs-action-details">
                            <span className="gs-action-title">Open Folder</span>
                            <span className="gs-action-desc">Open a workspace or knowledge base</span>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    protected renderKnowledgeFeatures(): React.ReactNode {
        return (
            <div className="gs-section">
                <h3 className="gs-section-header">Knowledge Management Features</h3>
                <ul className="gs-feature-list">
                    <li>
                        <strong>Wiki-style Linking</strong> - Use <code>[[Note Name]]</code> to link between notes with autocomplete
                    </li>
                    <li>
                        <strong>Backlinks Panel</strong> - See all notes linking to your current note
                    </li>
                    <li>
                        <strong>Knowledge Graph</strong> - Visualize connections between your notes
                    </li>
                    <li>
                        <strong>Tags Browser</strong> - Organize notes with hierarchical tags like <code>#project/backend</code>
                    </li>
                    <li>
                        <strong>Daily Notes</strong> - Quick date-based notes for journaling and time-tracking
                    </li>
                    <li>
                        <strong>Note Templates</strong> - Speed up note creation with customizable templates
                    </li>
                </ul>
            </div>
        );
    }

    protected renderGettingStarted(): React.ReactNode {
        return (
            <div className="gs-section">
                <h3 className="gs-section-header">Getting Started</h3>
                <ol className="gs-steps-list">
                    <li>
                        <strong>Create your first note:</strong> Press <kbd>F1</kbd> and type "Create Note from Template" or just create a new <code>.md</code> file
                    </li>
                    <li>
                        <strong>Link between notes:</strong> Type <code>[[</code> and start typing a note name to see autocomplete suggestions
                    </li>
                    <li>
                        <strong>Explore connections:</strong> Open the Knowledge Graph (<kbd>F1</kbd> → "Knowledge Graph") to see how your notes connect
                    </li>
                    <li>
                        <strong>Organize with tags:</strong> Add tags like <code>#project/backend</code> in frontmatter or inline, then use the Tags Browser
                    </li>
                    <li>
                        <strong>Start journaling:</strong> Press <kbd>F1</kbd> → "Open Today's Note" for quick daily logging
                    </li>
                </ol>
            </div>
        );
    }

    protected renderResources(): React.ReactNode {
        return (
            <div className="gs-section">
                <h3 className="gs-section-header">Resources</h3>
                <div className="gs-links-container">
                    <a
                        href="https://github.com/jefftoffoli/Quallaa-app"
                        onClick={e => {
                            e.preventDefault();
                            this.windowService.openNewWindow('https://github.com/jefftoffoli/Quallaa-app', { external: true });
                        }}
                    >
                        <i className="codicon codicon-github" /> GitHub Repository
                    </a>
                    <a
                        href="https://github.com/jefftoffoli/Quallaa-app/issues"
                        onClick={e => {
                            e.preventDefault();
                            this.windowService.openNewWindow('https://github.com/jefftoffoli/Quallaa-app/issues', { external: true });
                        }}
                    >
                        <i className="codicon codicon-issues" /> Report an Issue
                    </a>
                    <button className="gs-link-button" onClick={() => this.commandRegistry.executeCommand('workbench.action.openSettings')}>
                        <i className="codicon codicon-settings-gear" /> Settings
                    </button>
                    <button className="gs-link-button" onClick={() => this.commandRegistry.executeCommand('workbench.action.showCommands')}>
                        <i className="codicon codicon-terminal" /> Command Palette (<kbd>F1</kbd>)
                    </button>
                </div>
            </div>
        );
    }
}
