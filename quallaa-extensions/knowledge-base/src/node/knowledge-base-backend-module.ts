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
 * Backend module for knowledge base extension
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';
import { KnowledgeBaseService, KnowledgeBasePath } from '../common/knowledge-base-protocol';
import { KnowledgeBaseServiceImpl } from './knowledge-base-service-impl';

export default new ContainerModule(bind => {
    // Bind backend service implementation
    bind(KnowledgeBaseServiceImpl).toSelf().inSingletonScope();
    bind(KnowledgeBaseService).toService(KnowledgeBaseServiceImpl);

    // Expose service to frontend via JSON-RPC
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(KnowledgeBasePath, () =>
            ctx.container.get(KnowledgeBaseService)
        )
    ).inSingletonScope();
});
