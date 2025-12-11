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
import { PreferenceService, PreferenceChange } from '@theia/core/lib/common/preferences';

/**
 * KB View Customization Service (Phase 7.5)
 *
 * Applies user preferences to customize KB View appearance and behavior.
 * Listens for preference changes and updates CSS variables and DOM accordingly.
 *
 * Customization Areas:
 * - Typography (font family, size, line height)
 * - Colors (accent color, warm/cool palette)
 * - Layout (sidebar widths, panel visibility)
 * - Activity Bar (icon visibility)
 * - Commands/Menus (filtering enablement)
 */
@injectable()
export class KBViewCustomizationService {
    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    @postConstruct()
    protected init(): void {
        // Apply customizations on startup
        this.applyAllCustomizations();

        // Listen for preference changes
        this.preferences.onPreferenceChanged((event: PreferenceChange) => {
            if (event.preferenceName.startsWith('kbView.')) {
                this.handlePreferenceChange(event.preferenceName);
            }
        });
    }

    /**
     * Applies all customizations based on current preference values.
     */
    private applyAllCustomizations(): void {
        this.applyTypographyCustomizations();
        this.applyColorCustomizations();
        this.applyLayoutCustomizations();
        this.applyActivityBarCustomizations();
    }

    /**
     * Handles a specific preference change.
     */
    private handlePreferenceChange(preferenceName: string): void {
        if (preferenceName.startsWith('kbView.content')) {
            this.applyTypographyCustomizations();
        } else if (preferenceName.includes('Color')) {
            this.applyColorCustomizations();
        } else if (preferenceName.includes('Width') || preferenceName.includes('Panel') || preferenceName.includes('Minimap')) {
            this.applyLayoutCustomizations();
        } else if (preferenceName.includes('Icon')) {
            this.applyActivityBarCustomizations();
        }
    }

    /**
     * Applies typography customizations (font family, size, line height).
     */
    private applyTypographyCustomizations(): void {
        const fontFamily = this.preferences.get<string>('kbView.contentFontFamily', 'Georgia, Palatino, Times New Roman, serif');
        const fontSize = this.preferences.get<number>('kbView.contentFontSize', 16);
        const lineHeight = this.preferences.get<number>('kbView.contentLineHeight', 1.6);

        const root = document.documentElement;
        root.style.setProperty('--kb-font-content', fontFamily);
        root.style.setProperty('--kb-font-size-medium', `${fontSize}px`);
        root.style.setProperty('--kb-line-height-relaxed', `${lineHeight}`);
    }

    /**
     * Applies color customizations (accent color, warm/cool palette).
     */
    private applyColorCustomizations(): void {
        const useWarmColors = this.preferences.get<boolean>('kbView.useWarmColors', true);
        const customAccentColor = this.preferences.get<string>('kbView.customAccentColor', '#8b7355');

        const root = document.documentElement;

        // Apply custom accent color
        root.style.setProperty('--kb-accent-primary', customAccentColor);

        // Apply warm/cool palette
        if (useWarmColors) {
            // Warm palette (default)
            root.style.setProperty('--kb-bg-secondary', '#faf8f5');
            root.style.setProperty('--kb-bg-tertiary', '#f0ebe3');
            root.style.setProperty('--kb-bg-hover', '#e8dfd0');
        } else {
            // Cool palette
            root.style.setProperty('--kb-bg-secondary', '#f5f8fa');
            root.style.setProperty('--kb-bg-tertiary', '#e3ebf0');
            root.style.setProperty('--kb-bg-hover', '#d0dfe8');
        }
    }

    /**
     * Applies layout customizations (sidebar widths, panel visibility).
     */
    private applyLayoutCustomizations(): void {
        const leftSidebarWidth = this.preferences.get<number>('kbView.defaultLeftSidebarWidth', 300);
        const rightSidebarWidth = this.preferences.get<number>('kbView.defaultRightSidebarWidth', 300);
        const hideBottomPanel = this.preferences.get<boolean>('kbView.hideBottomPanel', true);
        const hideMinimap = this.preferences.get<boolean>('kbView.hideMinimap', true);

        const root = document.documentElement;

        // Apply sidebar widths
        root.style.setProperty('--kb-left-sidebar-width', `${leftSidebarWidth}px`);
        root.style.setProperty('--kb-right-sidebar-width', `${rightSidebarWidth}px`);

        // Apply bottom panel visibility
        if (hideBottomPanel) {
            document.body.classList.add('kb-hide-bottom-panel');
        } else {
            document.body.classList.remove('kb-hide-bottom-panel');
        }

        // Apply minimap visibility
        if (hideMinimap) {
            document.body.classList.add('kb-hide-minimap');
        } else {
            document.body.classList.remove('kb-hide-minimap');
        }
    }

    /**
     * Applies Activity Bar customizations (icon visibility).
     */
    private applyActivityBarCustomizations(): void {
        const hideDebugIcon = this.preferences.get<boolean>('kbView.hideDebugIcon', true);
        const hideTerminalIcon = this.preferences.get<boolean>('kbView.hideTerminalIcon', true);
        const hideSCMIcon = this.preferences.get<boolean>('kbView.hideSCMIcon', true);
        const hideExtensionsIcon = this.preferences.get<boolean>('kbView.hideExtensionsIcon', false);

        // Apply conditional classes
        document.body.classList.toggle('kb-hide-debug-icon', hideDebugIcon);
        document.body.classList.toggle('kb-hide-terminal-icon', hideTerminalIcon);
        document.body.classList.toggle('kb-hide-scm-icon', hideSCMIcon);
        document.body.classList.toggle('kb-hide-extensions-icon', hideExtensionsIcon);
    }

    /**
     * Gets the list of custom hidden commands from preferences.
     */
    public getCustomHiddenCommands(): string[] {
        return this.preferences.get<string[]>('kbView.customHiddenCommands', []);
    }

    /**
     * Checks if command filtering is enabled.
     */
    public isCommandFilteringEnabled(): boolean {
        return this.preferences.get<boolean>('kbView.enableCommandFiltering', true);
    }

    /**
     * Checks if menu filtering is enabled.
     */
    public isMenuFilteringEnabled(): boolean {
        return this.preferences.get<boolean>('kbView.enableMenuFiltering', true);
    }

    /**
     * Gets the list of default widgets to open in KB View mode.
     */
    public getDefaultWidgets(): string[] {
        const defaultWidgets = this.preferences.get<string[]>('kbView.defaultWidgets', ['tags-widget', 'backlinks-widget']);
        const showKnowledgeGraph = this.preferences.get<boolean>('kbView.showKnowledgeGraph', false);

        if (showKnowledgeGraph && !defaultWidgets.includes('knowledge-graph')) {
            return [...defaultWidgets, 'knowledge-graph'];
        }

        return defaultWidgets;
    }
}
