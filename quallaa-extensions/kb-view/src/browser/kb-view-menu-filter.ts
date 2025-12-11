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
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { ViewModeService } from './view-mode-service';

/**
 * KB View Menu Filter (Phase 7)
 *
 * Filters menu items based on the current view mode.
 * In KB View mode, hides developer-specific menus and menu items
 * to maintain a clean, document-focused interface.
 *
 * Strategy:
 * - Uses menu item visibility predicates
 * - Checks ViewModeService.currentMode before showing items
 * - Maintains lists of developer-only and KB-only menu paths
 */
@injectable()
export class KBViewMenuFilter implements MenuContribution {
    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    /**
     * Developer-specific menu paths to hide in KB View mode.
     *
     * These are high-level menus that are primarily used for development tasks.
     */
    private readonly developerMenus = new Set<string>([
        // Top-level menus
        'terminal',
        'run',
        'debug',

        // View menu items
        'view_debug',
        'view_terminal',
        'view_scm',
        'view_output',
        'view_problems',

        // SCM menu items
        'scm_groups',
        'scm_change',
        'scm_commit',

        // Debug menu items
        'debug_configuration',
        'debug_controls',
        'debug_breakpoint',
    ]);

    /**
     * Developer-specific menu item patterns (for more granular filtering).
     */
    private readonly developerMenuPatterns = [/^terminal\//, /^debug\//, /^run\//, /^scm\//, /^git\//, /^task\//, /^build\//, /^test\//];

    /**
     * KB View-specific menu paths that should only be visible in KB View mode.
     */
    private readonly kbViewMenus = new Set<string>(['kb-view', 'kb-view_create', 'kb-view_show', 'kb-view_mode']);

    registerMenus(registry: MenuModelRegistry): void {
        // Register KB View main menu
        registry.registerSubmenu(['menubar', '5_kb-view'], 'KB View');

        // KB View > Create submenu
        registry.registerSubmenu(['menubar', '5_kb-view', '1_create'], 'Create');

        // KB View > Show submenu
        registry.registerSubmenu(['menubar', '5_kb-view', '2_show'], 'Show');

        // KB View > Mode submenu
        registry.registerSubmenu(['menubar', '5_kb-view', '3_mode'], 'Mode');

        // Note: We don't filter menus here directly.
        // Instead, we use CSS to hide menu items based on mode.
        // This is more performant and avoids menu rebuilding overhead.
    }

    /**
     * Checks if a menu path should be visible in the current mode.
     */
    public isMenuVisible(menuPath: string): boolean {
        const currentMode = this.viewModeService.currentMode;

        if (currentMode === 'kb-view') {
            // In KB View: hide developer menus
            if (this.developerMenus.has(menuPath)) {
                return false;
            }
            // Check patterns
            if (this.developerMenuPatterns.some(pattern => pattern.test(menuPath))) {
                return false;
            }
            return true;
        } else {
            // In Developer mode: hide KB View-specific menus
            return !this.kbViewMenus.has(menuPath);
        }
    }

    /**
     * Adds a custom developer menu to the filter list.
     */
    public addDeveloperMenu(menuPath: string): void {
        this.developerMenus.add(menuPath);
    }

    /**
     * Adds a custom KB View menu to the filter list.
     */
    public addKBViewMenu(menuPath: string): void {
        this.kbViewMenus.add(menuPath);
    }

    /**
     * Generates CSS selectors to hide developer menus in KB View mode.
     * This is more efficient than rebuilding menus on mode switch.
     */
    public generateMenuFilterCSS(): string {
        const developerSelectors = Array.from(this.developerMenus)
            .map(menuPath => `body.kb-view-mode [data-menu-path="${menuPath}"]`)
            .join(',\n');

        const kbViewSelectors = Array.from(this.kbViewMenus)
            .map(menuPath => `body.developer-mode [data-menu-path="${menuPath}"]`)
            .join(',\n');

        return `
/* Auto-generated menu filters (Phase 7) */

/* Hide developer menus in KB View mode */
${developerSelectors} {
    display: none !important;
}

/* Hide KB View menus in Developer mode */
${kbViewSelectors} {
    display: none !important;
}
        `.trim();
    }
}
