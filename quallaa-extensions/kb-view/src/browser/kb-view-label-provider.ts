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
import { LabelProviderContribution, DidChangeLabelEvent } from '@theia/core/lib/browser/label-provider';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import URI from '@theia/core/lib/common/uri';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { ViewModeService } from './view-mode-service';

@injectable()
export class KBViewLabelProvider implements LabelProviderContribution {
    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    private readonly onDidChangeEmitter = new Emitter<DidChangeLabelEvent>();
    readonly onDidChange: Event<DidChangeLabelEvent> = this.onDidChangeEmitter.event;

    @postConstruct()
    protected init(): void {
        // Listen for mode changes and refresh labels
        this.viewModeService.onDidChangeMode(() => {
            this.fireLabelsChanged();
        });
    }

    canHandle(element: object): number {
        // Only handle URIs
        if (!(element instanceof URI)) {
            return 0;
        }

        // Only in KB View mode
        if (this.viewModeService.currentMode !== 'kb-view') {
            return 0;
        }

        // Check if we should hide extensions for this file
        if (!this.shouldHideExtension(element)) {
            return 0;
        }

        // Priority 100 - higher than default label provider (which is 1)
        return 100;
    }

    getName(element: URI): string | undefined {
        const name = element.path.name;

        if (!this.shouldHideExtension(element)) {
            return name;
        }

        // Strip .md extension
        return name.replace(/\.md$/, '');
    }

    getLongName(element: URI): string | undefined {
        const fullPath = element.path.toString();

        if (!this.shouldHideExtension(element)) {
            return fullPath;
        }

        // Strip .md extension from full path
        return fullPath.replace(/\.md$/, '');
    }

    getIcon(element: URI): string | undefined {
        // Only customize icon for markdown files in KB View mode
        if (this.viewModeService.currentMode === 'kb-view' && element.path.ext === '.md') {
            // Use note icon from codicons
            return 'codicon codicon-note';
        }

        return undefined; // Let default label provider handle other files
    }

    private shouldHideExtension(uri: URI): boolean {
        // Only hide .md extensions
        if (uri.path.ext !== '.md') {
            return false;
        }

        // Check preference
        const hideExtensions = this.preferences.get<boolean>('kbView.hideFileExtensions', true);
        return hideExtensions;
    }

    private fireLabelsChanged(): void {
        this.onDidChangeEmitter.fire({
            affects: (element: object) =>
                // Refresh labels for all markdown files
                element instanceof URI && element.path.ext === '.md',
        });
    }
}
