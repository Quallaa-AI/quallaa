/********************************************************************************
 * Copyright (C) 2025 Jeff Toffoli
 * Copyright (C) 2020 EclipseSource and others.
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

import { WindowService } from '@theia/core/lib/browser/window/window-service';
import * as React from 'react';

export interface ExternalBrowserLinkProps {
    text: string;
    url: string;
    windowService: WindowService;
}

function BrowserLink(props: ExternalBrowserLinkProps): JSX.Element {
    return <a
        role={'button'}
        tabIndex={0}
        href={props.url}
        target='_blank'
        >
        {props.text}
    </a>;
}

export function renderWhatIs(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            What is Quallaa?
        </h3>
        <div>
            Quallaa is a <span className='gs-text-bold'>knowledge-first IDE</span> for natural language developers.
            Think in markdown, organize with wiki-style linking, and execute code when you need to.
        </div>
        <div>
            Built on the <BrowserLink text="Eclipse Theia platform" url="https://theia-ide.org" windowService={windowService} />,
            Quallaa combines the knowledge graph experience of Obsidian with the full power of a modern IDE.
        </div>
        <div>
            <span className='gs-text-bold'>Where knowledge becomes executable.</span>
        </div>
    </div>;
}

export function renderWhoIsThisFor(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Who is this for?
        </h3>
        <div>
            Quallaa is designed for <span className='gs-text-bold'>natural language developers</span>—people who:
        </div>
        <ul>
            <li>Think and work primarily in markdown and natural language</li>
            <li>Use AI to assist with coding (Claude, ChatGPT, etc.)</li>
            <li>Prefer knowledge graphs over file trees</li>
            <li>Want Obsidian-like note-taking with real IDE capabilities</li>
        </ul>
        <div>
            Technical writers, researchers, product managers, and AI-assisted developers will feel right at home.
        </div>
    </div>;
}

export function renderExtendingCustomizing(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Extending Quallaa
        </h3>
        <div >
            You can extend Quallaa at runtime by installing VS Code extensions from the <BrowserLink text="OpenVSX registry"
            url="https://open-vsx.org/" windowService={windowService} />, an open marketplace for VS Code extensions.
            Just open the extension view or browse <BrowserLink text="OpenVSX online" url="https://open-vsx.org/"
            windowService={windowService} />.
        </div>
        <div>
            Quallaa is built on the Eclipse Theia platform and is open source (EPL-2.0). You can customize and fork it
            to build your own knowledge-first tools.
        </div>
    </div>;
}

export function renderKeyFeatures(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Key Features (Planned)
        </h3>
        <ul>
            <li><span className='gs-text-bold'>Wiki-style linking</span> - [[Link between notes]] with autocomplete</li>
            <li><span className='gs-text-bold'>Backlinks panel</span> - See what links to your current note</li>
            <li><span className='gs-text-bold'>Knowledge graph</span> - Visualize connections between your notes</li>
            <li><span className='gs-text-bold'>WYSIWYG markdown</span> - Edit markdown visually, not just in source</li>
            <li><span className='gs-text-bold'>Daily notes</span> - Quick-capture system for organizing your day</li>
            <li><span className='gs-text-bold'>Progressive disclosure</span> - IDE features appear when you need them</li>
        </ul>
        <div>
            Plus all the power of a full IDE: debugging, git integration, terminal, and extension support.
        </div>
    </div>;
}

export function renderTickets(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Reporting Issues & Feature Requests
        </h3>
        <div >
            Found a bug or have a feature idea? Please <BrowserLink text="open an issue on GitHub"
            url="https://github.com/jefftoffoli/Quallaa-app/issues/new" windowService={windowService} />.
        </div>
        <div>
            Quallaa is in early development. Your feedback helps shape the future of the knowledge-first IDE.
        </div>
    </div>;
}

export function renderSourceCode(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Source Code
        </h3>
        <div >
            Quallaa is open source under the EPL-2.0 license. The source code is available
            on <BrowserLink text="GitHub" url="https://github.com/jefftoffoli/Quallaa-app"
            windowService={windowService} />.
        </div>
        <div>
            Contributions are welcome! See our <BrowserLink text="Contributing Guide"
            url="https://github.com/jefftoffoli/Quallaa-app/blob/master/CONTRIBUTING.md" windowService={windowService} /> for details.
        </div>
    </div>;
}

export function renderDocumentation(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Documentation
        </h3>
        <div >
            Documentation is currently being developed. For now, see the <BrowserLink text="README"
            url="https://github.com/jefftoffoli/Quallaa-app#readme" windowService={windowService} /> for
            getting started information.
        </div>
        <div>
            Quallaa is built on Eclipse Theia. For platform documentation, see the <BrowserLink text="Theia docs"
            url="https://theia-ide.org/docs/" windowService={windowService} />.
        </div>
    </div>;
}

export function renderCollaboration(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Collaboration
        </h3>
        <div >
            The IDE features a built-in collaboration feature.
            You can share your workspace with others and work together in real-time by clicking on the <i>Collaborate</i> item in the status bar.
            The collaboration feature is powered by
            the <BrowserLink text="Open Collaboration Tools" url="https://www.open-collab.tools/" windowService={windowService} /> project
            and uses their public server infrastructure.
        </div>
    </div>;
}

export function renderDownloads(): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            Updates and Downloads
        </h3>
        <div className='gs-action-container'>
            You can update Quallaa directly in this application by navigating to
            File {'>'} Preferences {'>'} Check for Updates… The application will also check for updates
            after each launch automatically.
        </div>
        <div className='gs-action-container'>
            Download the latest version from the <a href="https://github.com/jefftoffoli/Quallaa-app/releases">GitHub Releases page</a>.
        </div>
    </div>;
}
