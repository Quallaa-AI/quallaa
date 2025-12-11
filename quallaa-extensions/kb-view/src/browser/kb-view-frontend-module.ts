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
 * Frontend module for KB View extension.
 *
 * Follows the same pattern as knowledge-base-frontend-module.ts:
 * - Use ContainerModule from inversify
 * - Bind services with .toSelf().inSingletonScope()
 * - Bind contributions to FrontendApplicationContribution for guaranteed instantiation
 * - Bind to CommandContribution/MenuContribution for command registration
 */

import '../../src/browser/style/ribbon.css';

import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution, MenuContribution, PreferenceContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';
import { LabelProviderContribution } from '@theia/core/lib/browser/label-provider';

// Core services
import { ViewModeService, ViewModeServiceImpl } from './view-mode-service';
import { LayoutManager, LayoutManagerImpl } from './layout-manager';
import { ModeStateManager } from './mode-state-manager';

// UI components
import { KBViewLabelProvider } from './kb-view-label-provider';
import { KBViewFileOperations } from './kb-view-file-operations';
import { KBViewWidgetManager } from './kb-view-widget-manager';
import { KBViewExtensionDetector } from './kb-view-extension-detector';

// Filtering services
import { KBViewCommandFilter } from './kb-view-command-filter';
import { KBViewMenuFilter } from './kb-view-menu-filter';
import { KBViewCustomizationService } from './kb-view-customization-service';

// Main contribution and preferences
import { KBViewContribution } from './kb-view-contribution';
import { KB_VIEW_PREFERENCES_SCHEMA } from './kb-view-preferences';

// Widgets
import { RibbonWidget, RIBBON_WIDGET_ID } from './ribbon-widget';

export default new ContainerModule(bind => {
    console.log('[KB-VIEW] Frontend module loading...');

    // Preferences
    bind(PreferenceContribution).toConstantValue({ schema: KB_VIEW_PREFERENCES_SCHEMA });

    // Core services
    bind(ViewModeService).to(ViewModeServiceImpl).inSingletonScope();
    bind(LayoutManager).to(LayoutManagerImpl).inSingletonScope();
    bind(ModeStateManager).toSelf().inSingletonScope();

    // Label provider for hiding .md extensions
    bind(KBViewLabelProvider).toSelf().inSingletonScope();
    bind(LabelProviderContribution).toService(KBViewLabelProvider);

    // UI services
    bind(KBViewFileOperations).toSelf().inSingletonScope();
    bind(KBViewWidgetManager).toSelf().inSingletonScope();
    bind(KBViewExtensionDetector).toSelf().inSingletonScope();

    // Filtering services
    bind(KBViewCommandFilter).toSelf().inSingletonScope();
    bind(KBViewMenuFilter).toSelf().inSingletonScope();
    bind(KBViewCustomizationService).toSelf().inSingletonScope();

    // Main contribution - MUST bind to FrontendApplicationContribution
    // This ensures KBViewContribution is instantiated at startup
    bind(KBViewContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(KBViewContribution);
    bind(CommandContribution).toService(KBViewContribution);
    bind(MenuContribution).toService(KBViewContribution);

    // Command and menu filtering contributions
    bind(CommandContribution).toService(KBViewCommandFilter);
    bind(MenuContribution).toService(KBViewMenuFilter);

    // Ribbon widget
    bind(RibbonWidget).toSelf();
    bind(WidgetFactory)
        .toDynamicValue(ctx => ({
            id: RIBBON_WIDGET_ID,
            createWidget: () => ctx.container.get<RibbonWidget>(RibbonWidget),
        }))
        .inSingletonScope();

    console.log('[KB-VIEW] Frontend module loaded successfully');
});
