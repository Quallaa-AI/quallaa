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

import { PreferenceSchema, PreferenceContribution } from '@theia/core/lib/common/preferences';

export const KB_VIEW_PREFERENCES_SCHEMA: PreferenceSchema = {
    properties: {
        // Mode Settings
        'kbView.mode': {
            type: 'string',
            enum: ['kb-view', 'developer'],
            default: 'kb-view',
            description: '[DEPRECATED] Use kbView.currentLayout instead. Current view mode: KB View (knowledge management) or Developer (full IDE)',
        },

        // Layout Settings (Priority 2 - Named Workspace Layouts)
        'kbView.currentLayout': {
            type: 'string',
            default: 'kb-view',
            description: 'Current workspace layout ID (e.g., kb-view, developer, research-mode, writing-mode)',
        },

        // File Display
        'kbView.hideFileExtensions': {
            type: 'boolean',
            default: true,
            description: 'Hide .md file extensions in KB View mode',
        },

        // Widget Behavior
        'kbView.autoSwitchWidgets': {
            type: 'boolean',
            default: true,
            description: 'Automatically open KB widgets when switching to KB View mode',
        },
        'kbView.defaultWidgets': {
            type: 'array',
            items: { type: 'string' },
            default: ['tags-widget', 'backlinks-widget'],
            description: 'Default widgets to open when entering KB View mode',
        },
        'kbView.showKnowledgeGraph': {
            type: 'boolean',
            default: false,
            description: 'Show knowledge graph widget by default in KB View mode',
        },

        // Activity Bar Customization (Phase 7.5)
        'kbView.hideDebugIcon': {
            type: 'boolean',
            default: true,
            description: 'Hide Debug icon from Activity Bar in KB View mode',
        },
        'kbView.hideTerminalIcon': {
            type: 'boolean',
            default: true,
            description: 'Hide Terminal icon from Activity Bar in KB View mode',
        },
        'kbView.hideSCMIcon': {
            type: 'boolean',
            default: true,
            description: 'Hide Source Control icon from Activity Bar in KB View mode',
        },
        'kbView.hideExtensionsIcon': {
            type: 'boolean',
            default: false,
            description: 'Hide Extensions icon from Activity Bar in KB View mode',
        },

        // Command/Menu Filtering (Phase 7.5)
        'kbView.enableCommandFiltering': {
            type: 'boolean',
            default: true,
            description: 'Enable command filtering in KB View mode (hides developer commands)',
        },
        'kbView.enableMenuFiltering': {
            type: 'boolean',
            default: true,
            description: 'Enable menu filtering in KB View mode (hides developer menus)',
        },
        'kbView.customHiddenCommands': {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional command IDs to hide in KB View mode',
        },

        // Typography Customization (Phase 7.5)
        'kbView.contentFontFamily': {
            type: 'string',
            default: 'Georgia, Palatino, Times New Roman, serif',
            description: 'Font family for markdown content in KB View mode',
        },
        'kbView.contentFontSize': {
            type: 'number',
            default: 16,
            minimum: 12,
            maximum: 24,
            description: 'Font size (in pixels) for markdown content in KB View mode',
        },
        'kbView.contentLineHeight': {
            type: 'number',
            default: 1.6,
            minimum: 1.0,
            maximum: 2.5,
            description: 'Line height for markdown content in KB View mode',
        },

        // Layout Customization (Phase 7.5)
        'kbView.defaultLeftSidebarWidth': {
            type: 'number',
            default: 300,
            minimum: 200,
            maximum: 600,
            description: 'Default width (in pixels) of left sidebar in KB View mode',
        },
        'kbView.defaultRightSidebarWidth': {
            type: 'number',
            default: 300,
            minimum: 200,
            maximum: 600,
            description: 'Default width (in pixels) of right sidebar in KB View mode',
        },
        'kbView.hideBottomPanel': {
            type: 'boolean',
            default: true,
            description: 'Hide bottom panel (Terminal, Output, Problems) in KB View mode',
        },
        'kbView.hideMinimap': {
            type: 'boolean',
            default: true,
            description: 'Hide editor minimap in KB View mode',
        },

        // Color Theme Customization (Phase 7.5)
        'kbView.useWarmColors': {
            type: 'boolean',
            default: true,
            description: 'Use warm color palette in KB View mode',
        },
        'kbView.customAccentColor': {
            type: 'string',
            default: '#8b7355',
            description: 'Custom accent color (hex code) for KB View mode',
        },
    },
};

export interface KBViewConfiguration {
    'kbView.mode': 'kb-view' | 'developer'; // Deprecated - use currentLayout
    'kbView.currentLayout': string;
    'kbView.hideFileExtensions': boolean;
    'kbView.autoSwitchWidgets': boolean;
    'kbView.defaultWidgets': string[];
    'kbView.showKnowledgeGraph': boolean;
    'kbView.hideDebugIcon': boolean;
    'kbView.hideTerminalIcon': boolean;
    'kbView.hideSCMIcon': boolean;
    'kbView.hideExtensionsIcon': boolean;
    'kbView.enableCommandFiltering': boolean;
    'kbView.enableMenuFiltering': boolean;
    'kbView.customHiddenCommands': string[];
    'kbView.contentFontFamily': string;
    'kbView.contentFontSize': number;
    'kbView.contentLineHeight': number;
    'kbView.defaultLeftSidebarWidth': number;
    'kbView.defaultRightSidebarWidth': number;
    'kbView.hideBottomPanel': boolean;
    'kbView.hideMinimap': boolean;
    'kbView.useWarmColors': boolean;
    'kbView.customAccentColor': string;
}

export const KBViewPreferenceContribution = Symbol('KBViewPreferenceContribution');
export type KBViewPreferenceContribution = PreferenceContribution;
