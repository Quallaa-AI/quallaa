# Quallaa

**Knowledge-First IDE for Natural Language Developers**

Quallaa is a knowledge-first IDE built on
[Eclipse Theia](https://theia-ide.org/). It reimagines the development
environment for people who think in markdown, build knowledge bases, and
leverage AI assistants.

Think **Obsidian meets VS Code**.

## Features

### Knowledge Management

- **Wiki Links** - `[[Note Name]]` syntax with autocomplete
- **Backlinks Panel** - See all incoming links to the current note
- **Knowledge Graph** - D3.js force-directed visualization of your notes
- **Tags Browser** - Hierarchical tags with counts
- **Daily Notes** - Quick date-based note creation

### KB View Mode

- Minimal, distraction-free interface optimized for writing
- Warm color palette with Georgia font
- Hides developer UI (terminal, debug, SCM)
- Shows Tags (left) + Backlinks (right) by default

### Developer Mode

- Full IDE capabilities when you need them
- All VS Code extensions via Open VSX
- Integrated terminal, debugging, Git

## Getting Started

### Prerequisites

- Node.js >= 20
- Yarn 1.x

### Build

```bash
# Install dependencies
yarn install

# Build (development)
yarn build:dev

# Download VS Code plugins
yarn download:plugins
```

### Run

```bash
# Browser version
yarn browser start
# Open http://localhost:3000

# Electron version
yarn electron start
```

### Package

```bash
# Create distributable
yarn package:applications

# Output in applications/electron/dist/
```

## Project Structure

```
quallaa/
├── applications/
│   ├── browser/          # Web version
│   └── electron/         # Desktop version
├── quallaa-extensions/
│   ├── knowledge-base/   # Wiki links, backlinks, graph, tags
│   ├── kb-view/          # Mode system, UI customization
│   ├── product/          # Branding, Getting Started
│   ├── launcher/         # CLI launcher
│   └── updater/          # Auto-update
└── package.json
```

## License

[EPL-2.0](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Links

- [Website](https://quallaa.com)
- [Documentation](https://docs.quallaa.com)
- [Issues](https://github.com/Quallaa-AI/quallaa/issues)
