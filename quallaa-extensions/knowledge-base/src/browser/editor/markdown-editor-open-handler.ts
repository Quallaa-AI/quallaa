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
import { OpenHandler, OpenerOptions } from '@theia/core/lib/browser';
import { URI } from '@theia/core/lib/common/uri';
import { WidgetManager } from '@theia/core/lib/browser';
import { MarkdownEditorWidget } from './markdown-editor-widget';
import { ApplicationShell } from '@theia/core/lib/browser';

@injectable()
export class MarkdownEditorOpenHandler implements OpenHandler {
    readonly id = 'quallaa-markdown-open-handler';
    readonly label = 'Quallaa Markdown Editor';

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    canHandle(uri: URI): number {
        // High priority (1000) to override default Monaco handler for .md files
        if (uri.path.ext === '.md') {
            return 1000;
        }
        return 0;
    }

    async open(uri: URI, options?: OpenerOptions): Promise<MarkdownEditorWidget> {
        // Create a unique widget ID per file to allow multiple tabs
        const widgetOptions = { uri: uri.toString() };

        // Use widget manager to get or create
        // The widget manager automatically assigns a unique ID based on factory ID + options
        const widget = await this.widgetManager.getOrCreateWidget<MarkdownEditorWidget>(MarkdownEditorWidget.ID, widgetOptions);

        if (MarkdownEditorWidget.is(widget)) {
            await widget.setUri(uri);
        }

        // Add to shell if not already there
        if (!widget.isAttached) {
            await this.shell.addWidget(widget, { area: 'main' });
        }

        // Activate the widget
        this.shell.activateWidget(widget.id);

        return widget;
    }
}
