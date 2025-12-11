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

import { injectable } from '@theia/core/shared/inversify';

/**
 * Detects and tracks third-party extensions in KB View mode.
 *
 * This service identifies widgets that come from user-installed extensions
 * (neither Theia core nor Quallaa built-in widgets) and can be used to
 * provide special handling or onboarding for these extensions.
 *
 * Future enhancements:
 * - Dialog prompting users to choose visibility (KB View, Developer, Both, Neither)
 * - Heuristic detection of KB-relevant extensions
 * - Storage of user preferences per extension
 */
@injectable()
export class KBViewExtensionDetector {
    /**
     * Known widget IDs from Theia core and Quallaa.
     * Third-party widgets are those NOT in this list.
     */
    private readonly knownWidgetIds = new Set([
        // Theia core widgets
        'explorer-view-container',
        'scm-view-container',
        'debug-view-container',
        'plugin-view-container',
        'search-view-container',
        'problems',
        'output',
        'terminal',
        'debug-console',

        // Quallaa knowledge-base widgets
        'knowledge-graph',
        'tags-widget',
        'backlinks-widget',

        // Quallaa KB View widgets
        // (none currently - all KB widgets are in knowledge-base extension)
    ]);

    /**
     * Check if a widget ID belongs to a third-party extension.
     *
     * @param widgetId The widget ID to check
     * @returns true if the widget is from a third-party extension
     */
    public isThirdPartyWidget(widgetId: string): boolean {
        return !this.knownWidgetIds.has(widgetId);
    }

    /**
     * Register a widget ID as known (not third-party).
     * Useful for programmatically adding new Quallaa widgets.
     *
     * @param widgetId The widget ID to register as known
     */
    public registerKnownWidget(widgetId: string): void {
        this.knownWidgetIds.add(widgetId);
    }

    /**
     * Get all known widget IDs.
     *
     * @returns Set of known widget IDs
     */
    public getKnownWidgetIds(): ReadonlySet<string> {
        return this.knownWidgetIds;
    }

    /**
     * Detect if a widget might be KB-relevant based on naming heuristics.
     * This is used to provide better default suggestions to users.
     *
     * @param widgetId The widget ID to analyze
     * @returns true if the widget appears to be KB/note-taking related
     */
    public detectKBRelevance(widgetId: string): boolean {
        const kbKeywords = ['note', 'markdown', 'wiki', 'knowledge', 'foam', 'obsidian', 'tag', 'link', 'graph', 'backlink'];

        const lowerWidgetId = widgetId.toLowerCase();
        return kbKeywords.some(keyword => lowerWidgetId.includes(keyword));
    }
}
