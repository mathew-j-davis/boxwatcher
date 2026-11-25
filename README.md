# BoxWatcher

Reusable diagram build system for boxesandarrows - watch, build, serve diagrams with auto-reload.

## Features

- 📁 **Watch mode** - Automatically rebuild diagrams when files change
- 🌐 **Live server** - Serve diagrams with browser auto-reload
- 🖼️ **PNG generation** - Automatic PNG conversion from SVG (with caching)
- 📋 **CSV-driven builds** - Configure all builds in a simple CSV file
- 🔧 **Configurable** - Point to any boxesandarrows installation
- 🚀 **Reusable** - Use across multiple documentation projects

## Installation

### In your documentation project

1. Install boxwatcher as a dependency or copy the files:

```bash
# Option A: Copy from ../boxwatcher
cp -r ../boxwatcher ./tools/boxwatcher

# Option B: Install as npm package (if published)
npm install @boxes/watcher
```

2. Create configuration file:

```bash
cp boxwatcher.config.example.json boxwatcher.config.json
```

3. Edit `boxwatcher.config.json` to point to your boxesandarrows installation:

```json
{
  "boxesandarrows": {
    "path": "../boxesandarrows",
    "command": "node ../boxesandarrows/src/index.js"
  },
  "paths": {
    "definitions": "./diagram-definitions",
    "output": "./output"
  }
}
```

4. Create your project structure:

```
your-project/
├── boxwatcher.config.json
├── diagram-definitions/
│   ├── builds.csv
│   ├── diagram1.yaml
│   ├── diagram2.yaml
│   └── ...
└── output/
    └── (generated files)
```

5. Create `diagram-definitions/builds.csv`:

```csv
name,command,enabled
my-diagram,node ../boxesandarrows/src/index.js -y ./diagram-definitions/my-diagram.yaml -r svg -o ./output/my-diagram,true
another-diagram,node ../boxesandarrows/src/index.js -y ./diagram-definitions/another.yaml -r svg -o ./output/another,true
```

6. Install dependencies:

```bash
npm install -g nodemon live-server
npm install sharp @resvg/resvg-js  # For PNG generation
```

## Usage

### Build all diagrams once

```bash
node ./build-all.js
```

### Watch mode with live-reload server

```bash
./watch-and-serve.sh
```

This will:
- Start a live-reload server on http://localhost:8080
- Watch `diagram-definitions/` for changes
- Rebuild diagrams automatically
- Refresh browser automatically

### Generate PNGs only

```bash
node ./generate-pngs.js
```

## Configuration

### boxwatcher.config.json

```json
{
  "boxesandarrows": {
    "path": "../boxesandarrows",
    "command": "node ../boxesandarrows/src/index.js"
  },
  "paths": {
    "definitions": "./diagram-definitions",
    "output": "./output",
    "builds": "./diagram-definitions/builds.csv",
    "pngConfig": "./diagram-definitions/png-config.json",
    "pngCache": "./.png-cache.json"
  },
  "watch": {
    "patterns": ["diagram-definitions"],
    "extensions": ["yaml", "csv", "json"],
    "ignore": ["output", "node_modules"]
  },
  "png": {
    "enabled": true,
    "defaultScale": 2
  },
  "serve": {
    "port": 8080,
    "open": "/index.html"
  }
}
```

### builds.csv Format

```csv
name,command,enabled
diagram-name,node ../boxesandarrows/src/index.js -y ./file.yaml -r svg -o ./output/name,true
another-diagram,<command>,false
```

**Columns:**
- `name` - Unique identifier for the diagram
- `command` - Shell command to build the diagram
- `enabled` - `true` to build, `false` to skip

### PNG Configuration (optional)

Create `diagram-definitions/png-config.json` to customize PNG generation:

```json
{
  "enabled": true,
  "defaultScale": 2,
  "diagrams": {
    "my-diagram": {
      "scale": 3
    },
    "another-diagram": {
      "scale": 1.5
    }
  }
}
```

## Examples

### Example 1: Simple YAML diagram

**diagram-definitions/architecture.yaml:**
```yaml
---
type: node
name: frontend
label: Frontend
x: 0
y: 0
---
type: node
name: backend
label: Backend
x: 5
y: 0
---
type: edge
from: frontend
to: backend
```

**builds.csv:**
```csv
name,command,enabled
architecture,node ../boxesandarrows/src/index.js -y ./diagram-definitions/architecture.yaml -r svg -o ./output/architecture,true
```

### Example 2: Table-based diagram

**diagram-definitions/table-diagram.yaml:**
```yaml
table:
  width: 46.6
  height: 40.0
  rows:
    - height: auto
      columns:
        - width: 8.0
          cells_stack:
            - label: "Header"
              type: header
            - label: "Cell 1"
            - label: "Cell 2"
```

Then use the table-to-diagram generator:

```csv
name,command,enabled
table-diagram,cd ../concept_pack && ./generate-diagram.sh table-diagram.yaml ../your-project/output/table-diagram,true
```

## Integration with boxesandarrows

BoxWatcher is designed to work with any boxesandarrows installation. Just configure the path:

```json
{
  "boxesandarrows": {
    "path": "../../boxesandarrows",
    "command": "node ../../boxesandarrows/src/index.js"
  }
}
```

## Development

### Project Structure

```
boxwatcher/
├── package.json
├── config.js                      # Configuration loader
├── build-all.js                   # Main build orchestrator
├── generate-manifest.js           # Generate manifest.json
├── generate-pngs.js               # PNG conversion with caching
├── watch-and-serve.sh             # Watch + serve script
├── boxwatcher.config.example.json # Example configuration
└── README.md
```

### Adding to a New Project

1. Copy boxwatcher files to your project
2. Create `boxwatcher.config.json`
3. Create `diagram-definitions/` folder
4. Create `builds.csv` with your diagrams
5. Run `./watch-and-serve.sh`

## Troubleshooting

### "boxesandarrows not found"

Check your `boxwatcher.config.json` path:

```json
{
  "boxesandarrows": {
    "path": "../boxesandarrows"  // Relative to your project root
  }
}
```

### "No enabled builds found"

Check your `builds.csv`:
- Make sure `enabled` column has `true` values
- Check for syntax errors (quotes, commas)

### PNG generation not working

Install required dependencies:

```bash
npm install sharp @resvg/resvg-js
```

Or disable PNG generation:

```json
{
  "png": {
    "enabled": false
  }
}
```

### Watch not detecting changes

Check your watch patterns in config:

```json
{
  "watch": {
    "patterns": ["diagram-definitions"],
    "extensions": ["yaml", "csv", "json"]
  }
}
```

## License

MIT

## Contributing

Contributions welcome! This is a reusable tool extracted from the ai-roadmap project to make diagram workflows easier across multiple documentation projects.
