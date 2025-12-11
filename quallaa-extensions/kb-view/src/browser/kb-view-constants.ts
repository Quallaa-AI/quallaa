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
 * Widget IDs for knowledge base widgets
 * These should match the IDs defined in the knowledge-base extension
 *
 * Extracted to separate file to avoid circular dependencies.
 */
export const KB_WIDGET_IDS = {
    GRAPH: 'knowledge-base-graph-widget',
    TAGS: 'knowledge-base-tags-widget',
    BACKLINKS: 'knowledge-base-backlinks',
} as const;
