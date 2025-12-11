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
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import URI from '@theia/core/lib/common/uri';
import { ViewModeService } from './view-mode-service';
import { PreferenceService } from '@theia/core/lib/common/preferences';

/**
 * Service to handle file operations in KB View mode.
 * Ensures .md extensions are automatically added/preserved when creating or renaming files.
 */
@injectable()
export class KBViewFileOperations {
    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(ViewModeService)
    protected readonly viewModeService: ViewModeService;

    @inject(PreferenceService)
    protected readonly preferences: PreferenceService;

    /**
     * Create a new file, automatically adding .md extension in KB View mode if needed.
     */
    async createFile(parent: URI, name: string, content?: string): Promise<URI> {
        const finalName = this.ensureMarkdownExtension(name);
        const uri = parent.resolve(finalName);

        await this.fileService.create(uri, content);
        return uri;
    }

    /**
     * Rename a file, preserving .md extension in KB View mode if the original had it.
     */
    async renameFile(uri: URI, newName: string): Promise<URI> {
        // If original file is .md and we're in KB View mode, ensure new name has .md
        if (uri.path.ext === '.md') {
            newName = this.ensureMarkdownExtension(newName);
        }

        const newUri = uri.parent.resolve(newName);
        await this.fileService.move(uri, newUri, { overwrite: false });
        return newUri;
    }

    /**
     * Check if file operations should auto-add .md extensions.
     */
    private shouldAutoAddExtension(): boolean {
        // Only in KB View mode
        if (this.viewModeService.currentMode !== 'kb-view') {
            return false;
        }

        // Check if hiding extensions is enabled
        const hideExtensions = this.preferences.get<boolean>('kbView.hideFileExtensions', true);
        return hideExtensions;
    }

    /**
     * Ensure a filename has .md extension if needed.
     */
    private ensureMarkdownExtension(name: string): string {
        if (!this.shouldAutoAddExtension()) {
            return name;
        }

        // Don't add if already has .md
        if (name.endsWith('.md')) {
            return name;
        }

        // Don't add if it has another extension
        if (/\.\w+$/.test(name)) {
            return name;
        }

        // Add .md extension
        return `${name}.md`;
    }
}
