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
import { PreferenceService, PreferenceScope } from '@theia/core/lib/common/preferences';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import { ModeStateManager, ModeState } from './mode-state-manager';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { MessageService } from '@theia/core';

/**
 * Unique identifier for a layout
 */
export type LayoutId = string;

/**
 * Configuration for a workspace layout
 */
export interface LayoutConfig {
    /** Unique identifier (e.g., 'kb-view', 'research-mode', 'writing-mode') */
    id: LayoutId;

    /** Display name shown in UI */
    name: string;

    /** Whether this is a built-in layout (cannot be deleted) */
    isBuiltIn: boolean;

    /** Optional CSS class to apply when layout is active */
    cssClass?: string;

    /** Optional description */
    description?: string;

    /** Base mode for custom layouts (kb-view or developer) - determines UI behavior */
    baseMode?: 'kb-view' | 'developer';

    /** Creation timestamp */
    createdAt?: number;

    /** Last modified timestamp */
    modifiedAt?: number;
}

/**
 * Built-in layouts that ship with Quallaa
 */
export const BUILT_IN_LAYOUTS: Record<string, LayoutConfig> = {
    'kb-view': {
        id: 'kb-view',
        name: 'KB View',
        isBuiltIn: true,
        cssClass: 'kb-view-mode',
        description: 'Knowledge-first mode with Tags and Backlinks visible',
    },
    developer: {
        id: 'developer',
        name: 'Developer',
        isBuiltIn: true,
        cssClass: 'developer-mode',
        description: 'Full IDE mode with terminal, debugger, and SCM',
    },
};

export const LayoutManager = Symbol('LayoutManager');

/**
 * Service for managing named workspace layouts
 *
 * Supports multiple named layouts beyond the two built-in modes (KB View and Developer).
 * Users can save current state as a new layout, switch between layouts, and delete custom layouts.
 */
export interface LayoutManager {
    /** Current active layout ID */
    readonly currentLayoutId: LayoutId;

    /** Event fired when layout changes */
    readonly onDidChangeLayout: Event<LayoutId>;

    /** Initialize the service (call once at startup) */
    initialize(): Promise<void>;

    /** Switch to a different layout */
    switchLayout(layoutId: LayoutId): Promise<void>;

    /** Save current state as a new or updated layout */
    saveLayout(layoutId: LayoutId, name: string, description?: string): Promise<void>;

    /** Get all available layouts (built-in + custom) */
    listLayouts(): Promise<LayoutConfig[]>;

    /** Get a specific layout config */
    getLayout(layoutId: LayoutId): Promise<LayoutConfig | undefined>;

    /** Delete a custom layout (cannot delete built-in layouts) */
    deleteLayout(layoutId: LayoutId): Promise<void>;

    /** Rename a custom layout */
    renameLayout(layoutId: LayoutId, newName: string): Promise<void>;
}

@injectable()
export class LayoutManagerImpl implements LayoutManager {
    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    @inject(ContextKeyService)
    protected readonly contextKeyService: ContextKeyService;

    @inject(ModeStateManager)
    protected readonly stateManager: ModeStateManager;

    @inject(StorageService)
    protected readonly storage: StorageService;

    @inject(MessageService)
    protected readonly messages: MessageService;

    private _currentLayoutId: LayoutId = 'kb-view';
    private _initialized = false;

    private readonly onDidChangeLayoutEmitter = new Emitter<LayoutId>();
    readonly onDidChangeLayout: Event<LayoutId> = this.onDidChangeLayoutEmitter.event;

    private readonly LAYOUT_CONTEXT_KEY = 'currentLayoutId';
    private readonly KB_VIEW_MODE_CONTEXT_KEY = 'kbViewMode';
    private readonly LAYOUTS_METADATA_KEY = 'kb-view.layouts-metadata';
    private readonly LAYOUT_STATE_PREFIX = 'kb-view.layout-state';
    private readonly CURRENT_LAYOUT_PREF = 'kbView.currentLayout';

    /**
     * Auto-initialize on first access if not already initialized
     */
    private ensureInitialized(): void {
        if (!this._initialized) {
            this._initialized = true;
            this.initializeSync();
        }
    }

    /**
     * Synchronous initialization to avoid async DI issues
     */
    private initializeSync(): void {
        // Read initial layout from preferences
        const savedLayout = this.preferences.get<LayoutId>(this.CURRENT_LAYOUT_PREF, 'kb-view');
        this._currentLayoutId = savedLayout;

        // Apply initial CSS class
        this.applyCSSClass(this._currentLayoutId);

        // Set context keys for when expressions
        this.contextKeyService.createKey(this.LAYOUT_CONTEXT_KEY, this._currentLayoutId);
        // kbViewMode context for backward compatibility with existing when clauses
        this.contextKeyService.createKey(this.KB_VIEW_MODE_CONTEXT_KEY, this.isKBViewLayout(this._currentLayoutId));

        // Listen for preference changes (e.g., from settings UI)
        this.preferences.onPreferenceChanged(event => {
            if (event.preferenceName === this.CURRENT_LAYOUT_PREF) {
                const newLayoutId = event.newValue as LayoutId;
                if (newLayoutId !== this._currentLayoutId) {
                    this.switchLayout(newLayoutId);
                }
            }
        });

        // Perform migration from legacy ViewMode if needed
        this.migrateLegacyMode();
    }

    /**
     * Check if a layout is KB View mode
     * Built-in kb-view layout or custom layouts with baseMode='kb-view'
     */
    private isKBViewLayout(layoutId: LayoutId): boolean {
        if (layoutId === 'kb-view') {
            return true;
        }
        // For custom layouts, we need to check baseMode
        // This is called synchronously, so we can't async lookup
        // The context key will be updated properly when layout switches
        return false;
    }

    /**
     * Legacy async initialize method - now just ensures initialization happened
     */
    async initialize(): Promise<void> {
        this.ensureInitialized();
    }

    get currentLayoutId(): LayoutId {
        this.ensureInitialized();
        return this._currentLayoutId;
    }

    async switchLayout(layoutId: LayoutId): Promise<void> {
        this.ensureInitialized();

        if (this._currentLayoutId === layoutId) {
            return; // Already in this layout
        }

        // Verify layout exists
        const layoutConfig = await this.getLayout(layoutId);
        if (!layoutConfig) {
            this.messages.error(`Layout "${layoutId}" not found`);
            return;
        }

        const previousLayoutId = this._currentLayoutId;

        // Step 1: Capture current state before switching
        const currentState = await this.stateManager.captureState(previousLayoutId);
        await this.saveLayoutState(previousLayoutId, currentState);

        // Step 2: Update layout
        this._currentLayoutId = layoutId;

        // Update preference at User scope (persists across sessions)
        await this.preferences.set(this.CURRENT_LAYOUT_PREF, layoutId, PreferenceScope.User);

        // Update CSS classes - pass config for immediate mode class application
        this.applyCSSClass(layoutId, layoutConfig);
        this.removeCSSClass(previousLayoutId);

        // Update context keys
        this.contextKeyService.setContext(this.LAYOUT_CONTEXT_KEY, layoutId);
        // Update kbViewMode for backward compatibility with when clauses
        // For custom layouts, check the baseMode from the config we already have
        const isKBView = layoutId === 'kb-view' || layoutConfig.baseMode === 'kb-view';
        this.contextKeyService.setContext(this.KB_VIEW_MODE_CONTEXT_KEY, isKBView);

        // Step 3: Load and restore state for new layout
        let savedState = await this.loadLayoutState(layoutId);

        // If no saved state exists and switching to KB View, use default
        if (!savedState && layoutId === 'kb-view') {
            savedState = this.stateManager.getDefaultKBViewState();
        }

        // Restore state if available
        if (savedState) {
            await this.stateManager.restoreState(savedState);
        }

        // Notify listeners (after state restoration is complete)
        this.onDidChangeLayoutEmitter.fire(layoutId);
    }

    async saveLayout(layoutId: LayoutId, name: string, description?: string): Promise<void> {
        this.ensureInitialized();

        // Capture current state
        const currentState = await this.stateManager.captureState(this._currentLayoutId);

        // Get existing layouts
        const layouts = await this.listLayouts();
        const existingLayout = layouts.find(l => l.id === layoutId);

        if (existingLayout && existingLayout.isBuiltIn) {
            // Update built-in layout state only (can't modify metadata)
            await this.saveLayoutState(layoutId, currentState);
            this.messages.info(`Updated state for ${existingLayout.name}`);
            return;
        }

        // Determine base mode from current layout
        const currentLayout = await this.getLayout(this._currentLayoutId);
        let baseMode: 'kb-view' | 'developer';
        if (this._currentLayoutId === 'kb-view') {
            baseMode = 'kb-view';
        } else if (this._currentLayoutId === 'developer') {
            baseMode = 'developer';
        } else {
            // Inherit from current layout's baseMode, default to developer
            baseMode = currentLayout?.baseMode || 'developer';
        }

        // Create or update custom layout
        const layoutConfig: LayoutConfig = {
            id: layoutId,
            name,
            isBuiltIn: false,
            description,
            baseMode,
            createdAt: existingLayout?.createdAt || Date.now(),
            modifiedAt: Date.now(),
        };

        // Save layout metadata
        const updatedLayouts = existingLayout ? layouts.map(l => (l.id === layoutId ? layoutConfig : l)) : [...layouts, layoutConfig];

        await this.saveLayoutsMetadata(updatedLayouts);

        // Save layout state
        await this.saveLayoutState(layoutId, currentState);

        this.messages.info(`Layout "${name}" saved successfully`);
    }

    async listLayouts(): Promise<LayoutConfig[]> {
        this.ensureInitialized();

        // Get custom layouts from storage
        const customLayouts = await this.loadLayoutsMetadata();

        // Combine built-in and custom layouts
        const builtInLayouts = Object.values(BUILT_IN_LAYOUTS);
        const allLayouts = [...builtInLayouts, ...customLayouts];

        return allLayouts;
    }

    async getLayout(layoutId: LayoutId): Promise<LayoutConfig | undefined> {
        const layouts = await this.listLayouts();
        return layouts.find(l => l.id === layoutId);
    }

    async deleteLayout(layoutId: LayoutId): Promise<void> {
        this.ensureInitialized();

        const layout = await this.getLayout(layoutId);
        if (!layout) {
            this.messages.error(`Layout "${layoutId}" not found`);
            return;
        }

        if (layout.isBuiltIn) {
            this.messages.error(`Cannot delete built-in layout "${layout.name}"`);
            return;
        }

        // Can't delete current layout
        if (layoutId === this._currentLayoutId) {
            this.messages.error('Cannot delete the currently active layout. Switch to another layout first.');
            return;
        }

        // Remove from metadata
        const layouts = await this.listLayouts();
        const updatedLayouts = layouts.filter(l => l.id !== layoutId && !l.isBuiltIn);
        await this.saveLayoutsMetadata(updatedLayouts);

        // Remove layout state
        await this.storage.setData(this.getLayoutStateKey(layoutId), undefined);

        this.messages.info(`Layout "${layout.name}" deleted`);
    }

    async renameLayout(layoutId: LayoutId, newName: string): Promise<void> {
        this.ensureInitialized();

        const layout = await this.getLayout(layoutId);
        if (!layout) {
            this.messages.error(`Layout "${layoutId}" not found`);
            return;
        }

        if (layout.isBuiltIn) {
            this.messages.error(`Cannot rename built-in layout "${layout.name}"`);
            return;
        }

        // Update name in metadata
        const layouts = await this.listLayouts();
        const updatedLayouts = layouts.map(l => (l.id === layoutId && !l.isBuiltIn ? { ...l, name: newName, modifiedAt: Date.now() } : l));

        const customLayouts = updatedLayouts.filter(l => !l.isBuiltIn);
        await this.saveLayoutsMetadata(customLayouts);

        this.messages.info(`Layout renamed to "${newName}"`);
    }

    /**
     * Storage helpers
     */

    private async loadLayoutsMetadata(): Promise<LayoutConfig[]> {
        const data = await this.storage.getData<LayoutConfig[]>(this.LAYOUTS_METADATA_KEY);
        return data || [];
    }

    private async saveLayoutsMetadata(layouts: LayoutConfig[]): Promise<void> {
        // Only save custom layouts (built-in layouts are in BUILT_IN_LAYOUTS constant)
        const customLayouts = layouts.filter(l => !l.isBuiltIn);
        await this.storage.setData(this.LAYOUTS_METADATA_KEY, customLayouts);
    }

    private getLayoutStateKey(layoutId: LayoutId): string {
        return `${this.LAYOUT_STATE_PREFIX}.${layoutId}`;
    }

    private async loadLayoutState(layoutId: LayoutId): Promise<ModeState | undefined> {
        const key = this.getLayoutStateKey(layoutId);
        return this.storage.getData<ModeState>(key);
    }

    private async saveLayoutState(layoutId: LayoutId, state: ModeState): Promise<void> {
        const key = this.getLayoutStateKey(layoutId);
        await this.storage.setData(key, state);
    }

    /**
     * CSS class management
     */

    private applyCSSClass(layoutId: LayoutId, config?: LayoutConfig): void {
        // Built-in layouts have their mode class (kb-view-mode, developer-mode)
        const builtInLayout = BUILT_IN_LAYOUTS[layoutId];
        if (builtInLayout) {
            document.body.classList.add(builtInLayout.cssClass!);
        } else {
            // Custom layouts: apply both custom class and mode class
            document.body.classList.add(`custom-layout-${layoutId}`);

            // Apply the base mode class based on config
            if (config?.baseMode === 'kb-view') {
                document.body.classList.remove('developer-mode');
                document.body.classList.add('kb-view-mode');
            } else {
                document.body.classList.remove('kb-view-mode');
                document.body.classList.add('developer-mode');
            }
        }
    }

    private removeCSSClass(layoutId: LayoutId): void {
        const builtInLayout = BUILT_IN_LAYOUTS[layoutId];
        if (builtInLayout) {
            document.body.classList.remove(builtInLayout.cssClass!);
        } else {
            // Custom layouts: remove both custom class and mode classes
            document.body.classList.remove(`custom-layout-${layoutId}`);
            // Mode classes will be replaced by the new layout's mode
        }
    }

    /**
     * Migration from legacy ViewMode system
     */

    private async migrateLegacyMode(): Promise<void> {
        // Check if we need to migrate from old 'kbView.mode' preference
        const legacyMode = this.preferences.get<string>('kbView.mode');
        const hasNewPreference = this.preferences.inspect<string>(this.CURRENT_LAYOUT_PREF);

        if (legacyMode && !hasNewPreference?.value) {
            console.log('[LayoutManager] Migrating from legacy ViewMode:', legacyMode);

            // Migrate legacy state to new layout state format
            const legacyStateKey = `kb-view.mode-state.${legacyMode}`;
            const legacyState = await this.storage.getData<ModeState>(legacyStateKey);

            if (legacyState) {
                // Copy to new layout state key
                await this.saveLayoutState(legacyMode, legacyState);
            }

            // Set current layout preference
            await this.preferences.set(this.CURRENT_LAYOUT_PREF, legacyMode, PreferenceScope.User);

            console.log('[LayoutManager] Migration complete');
        }
    }
}
