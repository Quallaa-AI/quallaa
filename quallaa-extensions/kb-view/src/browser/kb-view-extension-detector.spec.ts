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

/* eslint-disable no-unused-expressions */

import { expect } from 'chai';
import { KBViewExtensionDetector } from './kb-view-extension-detector';

describe('KBViewExtensionDetector', () => {
    let detector: KBViewExtensionDetector;

    beforeEach(() => {
        detector = new KBViewExtensionDetector();
    });

    describe('isThirdPartyWidget', () => {
        it('should identify Theia core widgets as NOT third-party', () => {
            const coreWidgets = ['explorer-view-container', 'scm-view-container', 'debug-view-container', 'search-view-container', 'problems', 'output', 'terminal'];

            for (const widgetId of coreWidgets) {
                expect(detector.isThirdPartyWidget(widgetId)).to.be.false;
            }
        });

        it('should identify Quallaa knowledge-base widgets as NOT third-party', () => {
            const quallaaWidgets = ['knowledge-graph', 'tags-widget', 'backlinks-widget'];

            for (const widgetId of quallaaWidgets) {
                expect(detector.isThirdPartyWidget(widgetId)).to.be.false;
            }
        });

        it('should identify unknown widgets as third-party', () => {
            const thirdPartyWidgets = ['my-custom-extension-widget', 'foam-graph', 'obsidian-vault-viewer', 'vscode-markdown-preview'];

            for (const widgetId of thirdPartyWidgets) {
                expect(detector.isThirdPartyWidget(widgetId)).to.be.true;
            }
        });
    });

    describe('registerKnownWidget', () => {
        it('should add a widget to the known list', () => {
            const newWidgetId = 'my-new-quallaa-widget';

            expect(detector.isThirdPartyWidget(newWidgetId)).to.be.true;

            detector.registerKnownWidget(newWidgetId);

            expect(detector.isThirdPartyWidget(newWidgetId)).to.be.false;
        });

        it('should not fail if registering the same widget twice', () => {
            const widgetId = 'duplicate-widget';

            detector.registerKnownWidget(widgetId);
            detector.registerKnownWidget(widgetId);

            expect(detector.isThirdPartyWidget(widgetId)).to.be.false;
        });
    });

    describe('getKnownWidgetIds', () => {
        it('should return all known widget IDs', () => {
            const knownIds = detector.getKnownWidgetIds();

            expect(knownIds.has('knowledge-graph')).to.be.true;
            expect(knownIds.has('explorer-view-container')).to.be.true;
            expect(knownIds.has('some-random-widget')).to.be.false;
        });

        it('should return a readonly set', () => {
            const knownIds = detector.getKnownWidgetIds();

            // TypeScript should prevent mutation, but JavaScript allows it
            // This test documents the expected immutability
            expect(knownIds).to.be.an.instanceof(Set);
        });
    });

    describe('detectKBRelevance', () => {
        it('should detect KB-relevant widgets by keywords', () => {
            const kbRelevantWidgets = [
                'markdown-notes-widget',
                'obsidian-vault',
                'wiki-links-viewer',
                'knowledge-base-graph',
                'foam-preview',
                'note-taker',
                'backlink-explorer',
                'tag-manager',
            ];

            for (const widgetId of kbRelevantWidgets) {
                expect(detector.detectKBRelevance(widgetId)).to.be.true;
            }
        });

        it('should not detect irrelevant widgets', () => {
            const irrelevantWidgets = ['git-history', 'docker-container-view', 'database-explorer', 'rest-client', 'color-picker'];

            for (const widgetId of irrelevantWidgets) {
                expect(detector.detectKBRelevance(widgetId)).to.be.false;
            }
        });

        it('should be case-insensitive', () => {
            expect(detector.detectKBRelevance('MARKDOWN-WIDGET')).to.be.true;
            expect(detector.detectKBRelevance('Note-Taking-App')).to.be.true;
            expect(detector.detectKBRelevance('WikiLinkViewer')).to.be.true;
        });
    });
});
