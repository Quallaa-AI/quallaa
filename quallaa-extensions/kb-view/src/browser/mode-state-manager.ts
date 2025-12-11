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
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { EditorManager } from '@theia/editor/lib/browser';
import { URI } from '@theia/core/lib/common/uri';
import { KB_WIDGET_IDS } from './kb-view-constants';

/**
 * State for a single widget (open/closed, area, rank)
 */
export interface WidgetState {
    id: string;
    isOpen: boolean;
    area: 'left' | 'right' | 'main' | 'bottom';
    rank?: number;
}

/**
 * Layout state (panel sizes, positions)
 */
export interface LayoutState {
    leftSidebarWidth?: number;
    rightSidebarWidth?: number;
    bottomPanelHeight?: number;
}

/**
 * Editor state (open file, cursor position, scroll position)
 */
export interface EditorState {
    uri: string;
    scrollPosition?: number;
    cursorLine?: number;
    cursorColumn?: number;
}

/**
 * Complete state for a view mode
 */
export interface ModeState {
    widgetStates: WidgetState[];
    layoutState: LayoutState;
    editorStates: EditorState[];
    activeEditorUri?: string;
}

/**
 * Manages UI state persistence per view mode.
 *
 * Captures and restores:
 * - Widget visibility (which widgets are open/closed)
 * - Panel sizes (sidebar widths, bottom panel height)
 * - Open editors and their cursor/scroll positions
 * - Active editor
 *
 * State is stored separately for KB View and Developer modes,
 * allowing users to maintain different working contexts.
 */
@injectable()
export class ModeStateManager {
    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(StorageService)
    protected readonly storage: StorageService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    private readonly STORAGE_KEY_PREFIX = 'kb-view.mode-state';

    /**
     * Capture current UI state for the given layout/mode
     */
    async captureState(layoutId: string): Promise<ModeState> {
        const widgetStates = this.captureWidgetStates();
        const layoutState = this.captureLayoutState();
        const editorStates = await this.captureEditorStates();
        const activeEditorUri = this.editorManager.currentEditor?.editor.uri.toString();

        return {
            widgetStates,
            layoutState,
            editorStates,
            activeEditorUri,
        };
    }

    /**
     * Save state to persistent storage
     */
    async saveState(layoutId: string, state: ModeState): Promise<void> {
        const key = `${this.STORAGE_KEY_PREFIX}.${layoutId}`;
        await this.storage.setData(key, state);
    }

    /**
     * Load state from persistent storage
     */
    async loadState(layoutId: string): Promise<ModeState | undefined> {
        const key = `${this.STORAGE_KEY_PREFIX}.${layoutId}`;
        return this.storage.getData<ModeState>(key);
    }

    /**
     * Restore UI to match the given state
     */
    async restoreState(state: ModeState): Promise<void> {
        // Close all current widgets first
        await this.closeAllWidgets();

        // Close all current editors first
        await this.closeAllEditors();

        // Restore layout (panel sizes)
        this.restoreLayoutState(state.layoutState);

        // Restore widgets
        await this.restoreWidgetStates(state.widgetStates);

        // Restore editors
        await this.restoreEditorStates(state.editorStates, state.activeEditorUri);
    }

    /**
     * Get default state for first-time KB View mode
     */
    getDefaultKBViewState(): ModeState {
        return {
            widgetStates: [
                {
                    id: KB_WIDGET_IDS.TAGS,
                    isOpen: true,
                    area: 'left',
                },
                {
                    id: KB_WIDGET_IDS.BACKLINKS,
                    isOpen: true,
                    area: 'right',
                },
                {
                    id: KB_WIDGET_IDS.GRAPH,
                    isOpen: false, // Graph opened manually via command
                    area: 'main',
                },
            ],
            layoutState: {
                leftSidebarWidth: 300,
                rightSidebarWidth: 300,
            },
            editorStates: [],
            activeEditorUri: undefined,
        };
    }

    /**
     * Capture current widget states
     */
    private captureWidgetStates(): WidgetState[] {
        const states: WidgetState[] = [];

        for (const area of ['left', 'right', 'main', 'bottom'] as const) {
            const widgets = this.shell.getWidgets(area);
            for (const widget of widgets) {
                states.push({
                    id: widget.id,
                    isOpen: widget.isAttached && widget.isVisible,
                    area,
                });
            }
        }

        return states;
    }

    /**
     * Capture current layout state (panel sizes)
     */
    private captureLayoutState(): LayoutState {
        const layoutState: LayoutState = {};

        // Get left sidebar width
        const leftPanel = this.shell.leftPanelHandler;
        if (leftPanel && leftPanel.dockPanel && leftPanel.dockPanel.node) {
            layoutState.leftSidebarWidth = leftPanel.dockPanel.node.offsetWidth;
        }

        // Get right sidebar width
        const rightPanel = this.shell.rightPanelHandler;
        if (rightPanel && rightPanel.dockPanel && rightPanel.dockPanel.node) {
            layoutState.rightSidebarWidth = rightPanel.dockPanel.node.offsetWidth;
        }

        // Get bottom panel height
        const bottomPanel = this.shell.bottomPanel;
        if (bottomPanel && bottomPanel.node) {
            layoutState.bottomPanelHeight = bottomPanel.node.offsetHeight;
        }

        return layoutState;
    }

    /**
     * Capture current editor states
     */
    private async captureEditorStates(): Promise<EditorState[]> {
        const states: EditorState[] = [];

        for (const editorWidget of this.editorManager.all) {
            const uri = editorWidget.editor.uri.toString();
            const editor = editorWidget.editor;

            // Get cursor position
            const position = editor.cursor;

            // Get scroll position (if available)
            let scrollPosition: number | undefined;
            if ('getScrollPosition' in editor && typeof editor.getScrollPosition === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                scrollPosition = (editor as any).getScrollPosition();
            }

            states.push({
                uri,
                cursorLine: position?.line,
                cursorColumn: position?.character,
                scrollPosition,
            });
        }

        return states;
    }

    /**
     * Restore layout state (panel sizes)
     */
    private restoreLayoutState(layoutState: LayoutState): void {
        // Note: Actual panel resizing requires manipulating Lumino layout
        // This is a simplified implementation
        // Full implementation would use Lumino's SplitPanel.setRelativeSizes()

        if (layoutState.leftSidebarWidth) {
            const leftPanel = this.shell.leftPanelHandler;
            if (leftPanel && leftPanel.dockPanel && leftPanel.dockPanel.node) {
                leftPanel.dockPanel.node.style.width = `${layoutState.leftSidebarWidth}px`;
            }
        }

        if (layoutState.rightSidebarWidth) {
            const rightPanel = this.shell.rightPanelHandler;
            if (rightPanel && rightPanel.dockPanel && rightPanel.dockPanel.node) {
                rightPanel.dockPanel.node.style.width = `${layoutState.rightSidebarWidth}px`;
            }
        }

        if (layoutState.bottomPanelHeight) {
            const bottomPanel = this.shell.bottomPanel;
            if (bottomPanel && bottomPanel.node) {
                bottomPanel.node.style.height = `${layoutState.bottomPanelHeight}px`;
            }
        }
    }

    /**
     * Restore widget states
     */
    private async restoreWidgetStates(widgetStates: WidgetState[]): Promise<void> {
        for (const widgetState of widgetStates) {
            if (widgetState.isOpen) {
                try {
                    const widget = await this.widgetManager.getOrCreateWidget(widgetState.id);
                    if (!widget.isAttached) {
                        await this.shell.addWidget(widget, {
                            area: widgetState.area,
                            rank: widgetState.rank,
                        });
                    }
                    await this.shell.revealWidget(widget.id);
                } catch (error) {
                    console.warn(`Failed to restore widget ${widgetState.id}:`, error);
                }
            }
        }
    }

    /**
     * Restore editor states
     */
    private async restoreEditorStates(editorStates: EditorState[], activeEditorUri?: string): Promise<void> {
        for (const editorState of editorStates) {
            try {
                const uri = editorState.uri;

                // Open the editor
                const editorWidget = await this.editorManager.open(new URI(uri));

                // Restore cursor position
                if (editorState.cursorLine !== undefined && editorState.cursorColumn !== undefined) {
                    editorWidget.editor.cursor = {
                        line: editorState.cursorLine,
                        character: editorState.cursorColumn,
                    };
                }

                // Restore scroll position (if available)
                if (editorState.scrollPosition !== undefined && 'setScrollPosition' in editorWidget.editor && typeof editorWidget.editor.setScrollPosition === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (editorWidget.editor as any).setScrollPosition(editorState.scrollPosition);
                }
            } catch (error) {
                // File might have been deleted - skip silently
                console.debug(`Could not restore editor for ${editorState.uri}:`, error);
            }
        }

        // Activate the previously active editor
        if (activeEditorUri) {
            try {
                const activeEditor = this.editorManager.all.find(e => e.editor.uri.toString() === activeEditorUri);
                if (activeEditor) {
                    this.shell.activateWidget(activeEditor.id);
                }
            } catch (error) {
                console.warn(`Could not activate editor ${activeEditorUri}:`, error);
            }
        }
    }

    /**
     * Close all widgets
     */
    private async closeAllWidgets(): Promise<void> {
        for (const area of ['left', 'right', 'main', 'bottom'] as const) {
            const widgets = this.shell.getWidgets(area);
            for (const widget of widgets) {
                if (widget.isAttached) {
                    widget.close();
                }
            }
        }
    }

    /**
     * Close all editors
     */
    private async closeAllEditors(): Promise<void> {
        await this.editorManager.closeAll();
    }
}
