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
 * Document link provider for wiki links - provides clickable underlined links
 * Following Foam's pattern of using DocumentLinkProvider instead of decorations
 */

import { injectable, inject } from '@theia/core/shared/inversify';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as monaco from '@theia/monaco-editor-core';
import { KnowledgeBaseService } from '../../common/knowledge-base-protocol';
import { parseWikiLinks } from '../../common/wiki-link-parser';

@injectable()
export class WikiLinkProvider implements monaco.languages.LinkProvider {
    @inject(KnowledgeBaseService)
    protected readonly knowledgeBaseService: KnowledgeBaseService;

    async provideLinks(model: monaco.editor.ITextModel, token: monaco.CancellationToken): Promise<monaco.languages.ILinksList | undefined> {
        const languageId = model.getLanguageId();
        const uri = model.uri.toString();
        const isMarkdown = languageId === 'markdown' || uri.endsWith('.md');

        if (!isMarkdown) {
            return undefined;
        }

        const content = model.getValue();
        const wikiLinks = parseWikiLinks(content);

        const links: monaco.languages.ILink[] = [];

        for (const link of wikiLinks) {
            const startPos = model.getPositionAt(link.start);
            const endPos = model.getPositionAt(link.end);

            // Try to resolve the link
            const resolved = await this.knowledgeBaseService.resolveWikiLink(link.target);

            // Following Foam's pattern: use command URI for unresolved links
            const linkUrl = resolved
                ? resolved.uri
                : `command:knowledge-base.create-note?${encodeURIComponent(
                      JSON.stringify({
                          target: link.target,
                          sourceUri: uri,
                      })
                  )}`;

            links.push({
                range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                url: linkUrl,
                tooltip: resolved ? `Go to ${link.target}` : `Create ${link.target} (Cmd+Click)`,
            });
        }

        console.log('[WikiLinkProvider] Provided', links.length, 'links');

        return { links };
    }

    async resolveLink(link: monaco.languages.ILink, token: monaco.CancellationToken): Promise<monaco.languages.ILink | undefined> {
        // Links are already resolved in provideLinks
        return link;
    }
}
