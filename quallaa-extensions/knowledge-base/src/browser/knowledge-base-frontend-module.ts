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
/**
 * Frontend module for knowledge base extension
 */

import '../../src/browser/style/wiki-links.css';
import '../../src/browser/style/backlinks.css';
import '../../src/browser/style/graph.css';
import '../../src/browser/style/tags.css';
import '../../src/browser/editor/editor-styles.css';

import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WidgetFactory, OpenHandler } from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { URI } from '@theia/core/lib/common/uri';
// eslint-disable-next-line deprecation/deprecation
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { WikiLinkContribution } from './wiki-links/wiki-link-contribution';
import { WikiLinkCompletionProvider } from './wiki-links/wiki-link-completion-provider';
import { WikiLinkProvider } from './wiki-links/wiki-link-provider';
import { KnowledgeBaseWorkspaceContribution } from './knowledge-base-workspace-contribution';
import { KnowledgeBaseService, KnowledgeBasePath } from '../common/knowledge-base-protocol';
import { BacklinksWidget, BACKLINKS_WIDGET_ID } from './backlinks/backlinks-widget';
import { BacklinksContribution } from './backlinks/backlinks-contribution';
import { DailyNotesContribution } from './daily-notes/daily-notes-contribution';
import { GraphWidget, GRAPH_WIDGET_ID } from './graph/graph-widget';
import { GraphContribution } from './graph/graph-contribution';
import { TagsWidget, TAGS_WIDGET_ID } from './tags/tags-widget';
import { TagsContribution } from './tags/tags-contribution';
import { MarkdownEditorWidget } from './editor/markdown-editor-widget';
import { MarkdownEditorOpenHandler } from './editor/markdown-editor-open-handler';

export default new ContainerModule(bind => {
    // Wiki link services - following Foam's pattern: LinkProvider handles everything
    bind(WikiLinkCompletionProvider).toSelf().inSingletonScope();
    bind(WikiLinkProvider).toSelf().inSingletonScope();

    // Workspace indexing contribution
    bind(KnowledgeBaseWorkspaceContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(KnowledgeBaseWorkspaceContribution);

    // Main contribution
    bind(WikiLinkContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(WikiLinkContribution);
    bind(CommandContribution).toService(WikiLinkContribution);

    // Backlinks panel - following Foam's connections pattern
    bind(BacklinksWidget).toSelf();
    bind(WidgetFactory)
        .toDynamicValue(ctx => ({
            id: BACKLINKS_WIDGET_ID,
            createWidget: () => ctx.container.get<BacklinksWidget>(BacklinksWidget),
        }))
        .inSingletonScope();
    bind(BacklinksContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(BacklinksContribution);
    bind(CommandContribution).toService(BacklinksContribution);
    bind(MenuContribution).toService(BacklinksContribution);

    // Daily notes - following Foam's dated-notes pattern
    bind(DailyNotesContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(DailyNotesContribution);

    // Knowledge Graph - following Foam's dataviz pattern
    bind(GraphWidget).toSelf();
    bind(WidgetFactory)
        .toDynamicValue(ctx => ({
            id: GRAPH_WIDGET_ID,
            createWidget: () => ctx.container.get<GraphWidget>(GraphWidget),
        }))
        .inSingletonScope();
    bind(GraphContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(GraphContribution);
    bind(CommandContribution).toService(GraphContribution);
    bind(MenuContribution).toService(GraphContribution);

    // Tags Browser - following Foam's tags pattern
    bind(TagsWidget).toSelf();
    bind(WidgetFactory)
        .toDynamicValue(ctx => ({
            id: TAGS_WIDGET_ID,
            createWidget: () => ctx.container.get<TagsWidget>(TagsWidget),
        }))
        .inSingletonScope();
    bind(TagsContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TagsContribution);
    bind(CommandContribution).toService(TagsContribution);
    bind(MenuContribution).toService(TagsContribution);

    // Connect to backend service via JSON-RPC
    bind(KnowledgeBaseService)
        .toDynamicValue(ctx => {
            const connection = ctx.container.get(WebSocketConnectionProvider);
            return connection.createProxy<KnowledgeBaseService>(KnowledgeBasePath);
        })
        .inSingletonScope();

    // --- WYSIWYG Editor (Phase 3) ---

    // Bind the widget
    bind(MarkdownEditorWidget).toSelf();

    // Bind the Widget Factory
    bind(WidgetFactory)
        .toDynamicValue(context => ({
            id: MarkdownEditorWidget.ID,
            createWidget: (options: { uri?: string }) => {
                const widget = context.container.get(MarkdownEditorWidget);
                // If URI was passed in options, set it
                if (options && options.uri) {
                    widget.setUri(new URI(options.uri));
                }
                return widget;
            },
        }))
        .inSingletonScope();

    // Bind the Open Handler
    bind(MarkdownEditorOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(MarkdownEditorOpenHandler);
});
