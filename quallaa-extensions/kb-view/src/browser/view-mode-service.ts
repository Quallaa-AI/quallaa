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
import { Emitter, Event } from '@theia/core/lib/common/event';
import { LayoutManager } from './layout-manager';

export type ViewMode = 'kb-view' | 'developer';

export const ViewModeService = Symbol('ViewModeService');

export interface ViewModeService {
    readonly currentMode: ViewMode;
    readonly onDidChangeMode: Event<ViewMode>;
    initialize(): Promise<void>;
    switchMode(mode: ViewMode): Promise<void>;
    toggleMode(): Promise<void>;
}

/**
 * ViewModeService - Backward-compatible wrapper around LayoutManager
 *
 * This service is maintained for backward compatibility with existing code
 * that uses the ViewMode concept (kb-view/developer). It delegates to
 * LayoutManager which is now the single source of truth for all layouts.
 */
@injectable()
export class ViewModeServiceImpl implements ViewModeService {
    @inject(LayoutManager)
    protected readonly layoutManager: LayoutManager;

    private readonly onDidChangeModeEmitter = new Emitter<ViewMode>();
    readonly onDidChangeMode: Event<ViewMode> = this.onDidChangeModeEmitter.event;

    private _initialized = false;

    /**
     * Auto-initialize on first access
     */
    private ensureInitialized(): void {
        if (!this._initialized) {
            this._initialized = true;
            // Subscribe to layout changes and fire mode change events
            this.layoutManager.onDidChangeLayout(layoutId => {
                const mode = this.layoutIdToMode(layoutId);
                this.onDidChangeModeEmitter.fire(mode);
            });
        }
    }

    /**
     * Convert layout ID to ViewMode
     * Only 'kb-view' is considered kb-view mode, everything else is developer
     */
    private layoutIdToMode(layoutId: string): ViewMode {
        return layoutId === 'kb-view' ? 'kb-view' : 'developer';
    }

    /**
     * @deprecated Initialization is automatic
     */
    async initialize(): Promise<void> {
        this.ensureInitialized();
    }

    get currentMode(): ViewMode {
        this.ensureInitialized();
        return this.layoutIdToMode(this.layoutManager.currentLayoutId);
    }

    async switchMode(mode: ViewMode): Promise<void> {
        this.ensureInitialized();
        // Delegate to LayoutManager - modes are just built-in layouts
        await this.layoutManager.switchLayout(mode);
    }

    async toggleMode(): Promise<void> {
        this.ensureInitialized();
        const currentLayoutId = this.layoutManager.currentLayoutId;
        // Toggle between kb-view and developer
        const newMode: ViewMode = currentLayoutId === 'kb-view' ? 'developer' : 'kb-view';
        await this.layoutManager.switchLayout(newMode);
    }
}
