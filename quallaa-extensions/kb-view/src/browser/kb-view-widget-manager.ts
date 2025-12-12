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
import { ApplicationShell, WidgetManager, FrontendApplicationContribution } from '@theia/core/lib/browser';
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
export class KBViewWidgetManager implements FrontendApplicationContribution {
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

    private initialized = false;

    /**
     * Required for FrontendApplicationContribution - called when frontend starts
     */
    async onStart(): Promise<void> {
        console.log('[KBViewWidgetManager] onStart() called');
        this.doInitialize();
    }

    @postConstruct()
    protected init(): void {
        console.log('[KBViewWidgetManager] @postConstruct init() called');
        // Also try to initialize here in case onStart isn't called first
        this.doInitialize();
    }

    /**
     * Initialize the widget manager - idempotent, can be called multiple times
     */
    protected doInitialize(): void {
        if (this.initialized) {
            console.log('[KBViewWidgetManager] Already initialized, skipping');
            return;
        }
        this.initialized = true;

        console.log('[KBViewWidgetManager] Initializing - setting up mode change listener');

        // Listen for mode changes
        this.viewModeService.onDidChangeMode(mode => {
            console.log('[KBViewWidgetManager] Mode changed to:', mode);
            this.handleModeChange(mode);
        });

        // Initialize widget state tracking
        for (const widgetId of Object.values(KB_WIDGET_IDS)) {
            this.kbWidgetState.set(widgetId, false);
        }

        // Handle initial mode on startup (delay to ensure shell is ready)
        const currentMode = this.viewModeService.currentMode;
        console.log('[KBViewWidgetManager] Current mode:', currentMode);

        setTimeout(() => {
            const delayedMode = this.viewModeService.currentMode;
            console.log('[KBViewWidgetManager] Delayed check - current mode:', delayedMode);
            if (delayedMode === 'kb-view') {
                console.log('[KBViewWidgetManager] Already in KB View mode at startup, switching...');
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
     * Open all KB widgets (Ribbon, Tags, Backlinks)
     */
    private async openKBWidgets(): Promise<void> {
        console.log('[KBViewWidgetManager] Opening KB widgets...');

        // Open ribbon widget in the left sidebar (far left position)
        try {
            console.log('[KBViewWidgetManager] Getting ribbon widget with ID:', KB_WIDGET_IDS.RIBBON);
            const ribbon = await this.widgetManager.getOrCreateWidget(KB_WIDGET_IDS.RIBBON);
            console.log('[KBViewWidgetManager] Ribbon widget obtained:', ribbon?.id, 'isAttached:', ribbon?.isAttached);
            if (!ribbon.isAttached) {
                // Add ribbon to left area - it will be styled to appear as a slim bar
                console.log('[KBViewWidgetManager] Adding ribbon to left area...');
                await this.shell.addWidget(ribbon, { area: 'left' });
                console.log('[KBViewWidgetManager] Ribbon added to shell');
            }
            await this.shell.revealWidget(ribbon.id);
            console.log('[KBViewWidgetManager] Ribbon revealed');
        } catch (error) {
            console.error('[KBViewWidgetManager] Failed to open ribbon widget:', error);
        }

        // Open vault selector at the bottom of left sidebar
        try {
            console.log('[KBViewWidgetManager] Getting vault selector widget with ID:', KB_WIDGET_IDS.VAULT_SELECTOR);
            const vaultSelector = await this.widgetManager.getOrCreateWidget(KB_WIDGET_IDS.VAULT_SELECTOR);
            console.log('[KBViewWidgetManager] Vault selector widget obtained:', vaultSelector?.id, 'isAttached:', vaultSelector?.isAttached);
            if (!vaultSelector.isAttached) {
                // Add vault selector to left area (will be styled at bottom)
                console.log('[KBViewWidgetManager] Adding vault selector to left area...');
                await this.shell.addWidget(vaultSelector, { area: 'left' });
                console.log('[KBViewWidgetManager] Vault selector added to shell');
            }
            await this.shell.revealWidget(vaultSelector.id);
            console.log('[KBViewWidgetManager] Vault selector revealed');
        } catch (error) {
            console.error('[KBViewWidgetManager] Failed to open vault selector widget:', error);
        }

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
                        let area: 'main' | 'left' | 'right' = 'right';
                        if (widgetId === KB_WIDGET_IDS.GRAPH) {
                            area = 'main';
                        } else if (widgetId === KB_WIDGET_IDS.RIBBON || widgetId === KB_WIDGET_IDS.VAULT_SELECTOR) {
                            area = 'left';
                        }
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
