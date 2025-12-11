# Quallaa - Claude Code Context

> **AI Assistant Context Document** This file helps Claude Code and other AI
> assistants understand the Quallaa project structure, development workflows,
> and key decisions.

---

## Project Overview

**Quallaa** is a knowledge-first IDE for natural language developers, built on
Eclipse Theia as a **standalone product** (not a fork).

**Key Philosophy:**

- Traditional IDEs assume you're writing code
- Quallaa assumes you're building a knowledge base that happens to be executable
- Think Obsidian meets VS Code

**Design Principles (LLM-Native):**

- **No scaffolding templates** - LLMs can generate contextual content on demand;
  static templates add complexity without value
- **Declarative structures only for integrations** - Use templates/schemas only
  when external systems require specific formats (GitHub Issue templates, CI
  configs, API contracts)
- **Prefer runtime generation over static patterns** - If an LLM can produce it
  contextually, don't hardcode it

**Target Users:**

- Natural language developers who think in markdown
- AI-assisted coders (Claude, ChatGPT, etc.)
- Technical writers and researchers
- Anyone who prefers knowledge graphs over file trees

**Current Status:**

- Based on Theia v1.66.2
- Version: 1.67.0
- License: EPL-2.0 (Open Core model)
- Priority 1 complete (KB View default mode)

---

## Architecture: Standalone Product (Not a Fork)

Quallaa is built on Theia as a **standalone product**, not a fork. This means:

- **Theia comes from npm** - `@theia/*` packages are dependencies
- **No upstream merge conflicts** - Updates via `yarn upgrade @theia/*`
- **Clean git history** - Only Quallaa code, no Theia commits
- **Full product control** - Branding, defaults, UX all customizable

**Why this approach:**

- Easier maintenance than fork-based approach
- Cleaner separation of concerns
- Still full control over product experience
- Theia team recommended this pattern

---

## Repository Structure

**Key Directories:**

- `applications/` - Browser and Electron apps
- `quallaa-extensions/` - Custom extensions (knowledge-base, kb-view, product,
  launcher, updater)
- `configs/` - ESLint, TypeScript configs
- `scripts/` - Build and utility scripts
- `logo/` - Branding assets

**Main Extensions:**

- `knowledge-base/` - Wiki links, backlinks, graph, tags, daily notes
- `kb-view/` - Mode system, state management, widget management
- `product/` - Branding, Getting Started widget
- `launcher/` - CLI launcher (Electron)
- `updater/` - Auto-update (Electron)

---

## Core Extensions

### Knowledge Base Extension (`quallaa-extensions/knowledge-base/`)

The **crown jewel** of Quallaa - comprehensive knowledge management features.

**Implemented Features:**

- Wiki Links: `[[Note Name]]` syntax with autocomplete
- Backlinks Panel: Shows incoming links
- Knowledge Graph: D3.js force-directed visualization
- Tags Browser: Hierarchical tags with counts
- Daily Notes: Date-based note creation

**Backend Architecture:**

- Indexing service - Indexes markdown files, builds link graph
- File watching with chokidar for real-time updates
- In-memory graph for instant autocomplete

### KB View Extension (`quallaa-extensions/kb-view/`)

Mode system for knowledge-first vs developer experience.

**Core Services:**

- `ViewModeService` - Mode switching with lazy initialization
- `ModeStateManager` - State capture/restore per mode
- `KBViewWidgetManager` - Widget visibility management
- `KBViewPreferences` - Configuration options

**What KB View Mode Does:**

- Hides developer UI (Terminal, Debug, SCM icons)
- Shows Tags (left) + Backlinks (right) by default
- Applies warm color palette, Georgia font
- Hides .md extensions

---

## Development Workflows

**Building:**

- Development: `yarn && yarn build:dev && yarn download:plugins`
- Production: `yarn && yarn build && yarn download:plugins`
- Extensions only: `yarn build:extensions`
- Applications only: `yarn build:applications:dev`

**Running:**

- Browser: `yarn browser start` (http://localhost:3000)
- Electron: `yarn electron start`
- Package: `yarn package:applications` (output in `applications/electron/dist`)

**Testing:**

- Unit: `cd quallaa-extensions/knowledge-base && yarn test`
- E2E: `yarn test` (Playwright)
- Specific: `npx playwright test <test-file>`

**Linting:**

- Check: `yarn lint`
- Fix: `yarn lint:fix`
- Markdown: `yarn lint:markdown`
- Format: `yarn format`

---

## Updating Theia

**No more merge conflicts!** Updates are simple dependency upgrades:

```bash
# Update all Theia packages
yarn upgrade @theia/core@latest @theia/editor@latest ...

# Or use the helper script
yarn update:theia
```

**When to update:**

- Security patches
- New features you want
- Bug fixes in Theia core

**What to watch:**

- Breaking changes in Theia release notes
- Peer dependency requirements
- Extension API changes

---

## Common Tasks

**Add Feature to Knowledge Base Extension:**

- Frontend: `src/browser/<feature>/` → Register in
  `knowledge-base-frontend-module.ts`
- Backend: `src/node/` → Register in `knowledge-base-backend-module.ts`
- CSS: `src/browser/style/<feature>.css`
- Tests: `src/**/*.spec.ts`
- Build: `yarn build:extensions`

**Debug:**

- Browser: `yarn browser start` (use DevTools)
- Electron: `yarn electron start:debug` (DevTools auto-open)

**Add New Extension:**

- Create `quallaa-extensions/<name>/` with `package.json` (name:
  `quallaa-<name>-ext`, license: EPL-2.0)
- Add to application dependencies
- Run `yarn install`

**Update Branding:**

- App icons: `applications/electron/resources/` (.icns, .ico, icons/)
- In-app logos: `quallaa-extensions/product/src/browser/icons/` (theme-aware)
- Splash: `applications/electron/resources/QuallaaIDESplash.svg`

---

## Important Conventions

**Naming:**

- Packages: `quallaa-<name>-ext` or `quallaa-<name>-app`
- App name: `"Quallaa"`
- Config folder: `.quallaa`

**Metadata (all package.json files):**

- License: EPL-2.0
- Author: Quallaa AI <hello@quallaa.com>
- URLs: github.com/Quallaa-AI/quallaa

---

## Git Workflow

**Branches:**

- `main` - main development

**Pre-commit Hooks (.husky):**

- Runs lint-staged, Prettier, ESLint, markdownlint

**Commit Messages:**

- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Include Claude attribution for AI-assisted work

---

## Testing

**Unit Tests:**

- Location: `quallaa-extensions/knowledge-base/src/**/*.spec.ts`
- Run: `yarn test` (in extension dir)
- Framework: Mocha + Chai
- Focus: Wiki link parser, knowledge base service

**E2E Tests:**

- Location: `applications/browser/test/*.spec.ts`
- Run: `yarn test` (in root)
- Framework: Playwright
- Focus: UI interactions, mode switching, widgets

---

## Key Dependencies

**Quallaa-Specific:**

- Testing: `@playwright/test`
- Linting: `prettier`, `husky`, `lint-staged`, `markdownlint-cli`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-react`
- Knowledge Base: `d3@6.7.0` (pinned), `gray-matter`, `chokidar`

**Pinned Versions:** d3@6.7.0 (knowledge graph compatibility)

---

## Architecture

**Key Patterns:**

- **Backend Indexing:** Scales to thousands of notes, instant autocomplete
- **Mode System:** KB View vs Developer with state capture/restore
- **Lazy Initialization:** Avoids async DI issues (ViewModeService pattern)
- **Dual Sidebars:** Left + right simultaneously (Theia native)

**Technology Choices:**

- **D3.js:** Knowledge graph (pinned v6.7.0 for stability)
- **chokidar:** File watching (cross-platform, efficient)
- **React:** UI components (Theia standard, good TypeScript/a11y support)

---

## Business Model: Open Core

**Public repo (this one):** EPL-2.0

- Core IDE functionality
- Wiki links, backlinks, graph, tags
- KB View mode system
- Basic branding

**Future private repo (quallaa-pro):** Proprietary

- Cloud sync
- Real-time collaboration
- Advanced AI features
- Enterprise integrations

---

## Quick Commands

- Fresh start: `yarn clean && yarn install && yarn build:dev`
- Test extension: `cd quallaa-extensions/knowledge-base && yarn test`
- Update Theia: `yarn upgrade @theia/*`
- Package: `yarn package:applications`
- Check deps: `yarn list --pattern "quallaa-*"`
- Outdated: `yarn outdated`
- Nuclear: `yarn clean && rm -rf node_modules && yarn install`

---

## Resources

**Documentation:**

- Theia docs: theia-ide.org/docs
- GitHub: github.com/Quallaa-AI/quallaa

**Issues:** github.com/Quallaa-AI/quallaa/issues

---

## For AI Assistants

**Essential Rules:**

1. **Always preserve Quallaa branding** - Never suggest reverting to "Theia IDE"
2. **Keep EPL-2.0 license** - All public code must be EPL-2.0
3. **Follow existing patterns** - See knowledge-base extension for architectural
   style
4. **Test after changes** - Run `yarn build:extensions`
5. **Update this file** - Keep CLAUDE.md current with significant changes
6. **No fork merges** - Theia updates via `yarn upgrade`, not git merge

**Common Requests:**

- Add feature → See "Common Tasks" section above
- Update Theia → `yarn upgrade @theia/*`
- Fix build → `yarn clean && yarn build:dev`
- Update branding → `quallaa-extensions/product/src/browser/`

---

**Last Updated:** 2025-12-11
**Quallaa Version:** 1.67.0
**Based on Theia:** 1.66.2
**Repository:** github.com/Quallaa-AI/quallaa
