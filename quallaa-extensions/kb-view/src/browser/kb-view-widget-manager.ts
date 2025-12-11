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

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { ViewModeService, ViewMode } from './view-mode-service';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { KB_WIDGET_IDS } from './kb-view-constants';

// Re-export for backward compatibility
export { KB_WIDGET_IDS };

/**
 * Manages visibility of KB widgets based on current view mode.
 *
 * When in KB View mode:
 * - Makes KB widgets visible/accessible
 * - Optionally auto-opens widgets based on preference
 *
 * When in Developer mode:
 * - Hides KB widgets from view
 * - Saves widget state for restoration when returning to KB View
 */
@injectable()
export class KBViewWidgetManager {
    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    // Track which KB widgets were open before switching to Developer mode
    private kbWidgetState: Map<string, boolean> = new Map();

    @postConstruct()
    protected init(): void {
        // Listen for mode changes
        this.viewModeService.onDidChangeMode(mode => {
            this.handleModeChange(mode);
        });

        // Initialize widget state tracking
        for (const widgetId of Object.values(KB_WIDGET_IDS)) {
            this.kbWidgetState.set(widgetId, false);
        }

        // Handle initial mode on startup (delay to ensure shell is ready)
        setTimeout(() => {
            const currentMode = this.viewModeService.currentMode;
            if (currentMode === 'kb-view') {
                this.switchToKBView();
            }
        }, 1000);
    }

    /**
     * Handle mode changes between KB View and Developer
     */
    private async handleModeChange(newMode: ViewMode): Promise<void> {
        if (newMode === 'kb-view') {
            await this.switchToKBView();
        } else {
            await this.switchToDeveloper();
        }
    }

    /**
     * Switch to KB View mode - show KB widgets
     */
    private async switchToKBView(): Promise<void> {
        const autoSwitch = this.preferences.get<boolean>('kbView.autoSwitchWidgets', true);

        if (autoSwitch) {
            // Auto-open KB widgets if preference is enabled
            await this.openKBWidgets();
        } else {
            // Restore previous state
            await this.restoreKBWidgetState();
        }
    }

    /**
     * Switch to Developer mode - hide KB widgets
     */
    private async switchToDeveloper(): Promise<void> {
        // Save current state of KB widgets
        this.saveKBWidgetState();

        // Close all KB widgets
        await this.closeKBWidgets();
    }

    /**
     * Open all KB widgets (Graph, Tags, Backlinks)
     */
    private async openKBWidgets(): Promise<void> {
        // Open widgets in the right sidebar
        for (const widgetId of [KB_WIDGET_IDS.BACKLINKS, KB_WIDGET_IDS.TAGS]) {
            try {
                const widget = await this.widgetManager.getOrCreateWidget(widgetId);
                if (!widget.isAttached) {
                    await this.shell.addWidget(widget, { area: 'right' });
                }
                await this.shell.revealWidget(widget.id);
            } catch (error) {
                console.warn(`Failed to open KB widget ${widgetId}:`, error);
            }
        }

        // Note: Graph widget is typically opened via command, not automatically
        // Users can open it with "Knowledge Base: Show Graph" command
    }

    /**
     * Close all KB widgets
     */
    private async closeKBWidgets(): Promise<void> {
        for (const widgetId of Object.values(KB_WIDGET_IDS)) {
            const widget =
                this.shell.getWidgets('main').find(w => w.id === widgetId) ||
                this.shell.getWidgets('left').find(w => w.id === widgetId) ||
                this.shell.getWidgets('right').find(w => w.id === widgetId);

            if (widget && widget.isAttached) {
                widget.close();
            }
        }
    }

    /**
     * Save the current state of KB widgets (open/closed)
     */
    private saveKBWidgetState(): void {
        for (const widgetId of Object.values(KB_WIDGET_IDS)) {
            const widget =
                this.shell.getWidgets('main').find(w => w.id === widgetId) ||
                this.shell.getWidgets('left').find(w => w.id === widgetId) ||
                this.shell.getWidgets('right').find(w => w.id === widgetId);

            this.kbWidgetState.set(widgetId, widget !== undefined && widget.isAttached);
        }
    }

    /**
     * Restore KB widgets to their previous state
     */
    private async restoreKBWidgetState(): Promise<void> {
        for (const [widgetId, wasOpen] of this.kbWidgetState.entries()) {
            if (wasOpen) {
                try {
                    const widget = await this.widgetManager.getOrCreateWidget(widgetId);
                    if (!widget.isAttached) {
                        // Determine area based on widget ID
                        const area = widgetId === KB_WIDGET_IDS.GRAPH ? 'main' : 'right';
                        await this.shell.addWidget(widget, { area });
                    }
                    await this.shell.revealWidget(widget.id);
                } catch (error) {
                    console.warn(`Failed to restore KB widget ${widgetId}:`, error);
                }
            }
        }
    }

    /**
     * Check if a widget ID is a KB widget
     */
    public isKBWidget(widgetId: string): boolean {
        const kbWidgetIds: string[] = Object.values(KB_WIDGET_IDS);
        return kbWidgetIds.includes(widgetId);
    }
}
