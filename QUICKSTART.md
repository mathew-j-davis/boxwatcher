# BoxWatcher Quick Start

Get up and running with BoxWatcher in 5 minutes.

## 1. Set up your project structure

```bash
your-project/
├── diagram-definitions/
│   ├── builds.csv
│   └── example-diagram.yaml
├── output/
└── (boxwatcher files here)
```

## 2. Copy BoxWatcher files

```bash
# From your project directory
cp -r ../boxwatcher/* ./
# or
cp -r path/to/boxwatcher/* ./
```

## 3. Create configuration

```bash
cp boxwatcher.config.example.json boxwatcher.config.json
```

Edit `boxwatcher.config.json`:

```json
{
  "boxesandarrows": {
    "path": "../boxesandarrows",
    "command": "node ../boxesandarrows/src/index.js"
  }
}
```

## 4. Create your first diagram

**diagram-definitions/example-diagram.yaml:**

```yaml
---
type: node
name: start
label: Start
x: 0
y: 0
w: 3
h: 2
shape: rectangle
edge_color: '#0073A8'
fill_color: '#E8F4F8'

---
type: node
name: end
label: End
position_of: start
anchor: s
x_offset: 0
y_offset: 3
w: 3
h: 2
shape: rectangle
edge_color: '#0073A8'
fill_color: '#E8F4F8'

---
type: edge
from: start
to: end
arrow_end: triangle
color: '#0073A8'

---
type: page
background: white
scale:
  position: {x: 60, y: 60}
  size: {w: 60, h: 60}
margin: {w: 2, h: 2}
```

## 5. Create builds.csv

**diagram-definitions/builds.csv:**

```csv
name,command,enabled
example,node ../boxesandarrows/src/index.js -y ./diagram-definitions/example-diagram.yaml -r svg -o ./output/example,true
```

## 6. Install dependencies

```bash
# Global tools (once)
npm install -g nodemon live-server

# Project dependencies (for PNG generation)
npm install
```

## 7. Build your diagram

```bash
node ./build-all.js
```

Output: `./output/example.svg`

## 8. Watch mode (optional)

```bash
./watch-and-serve.sh
```

This will:
- Open http://localhost:8080 in your browser
- Rebuild automatically when you edit YAML files
- Refresh browser automatically

## Next Steps

### Add more diagrams

Just add more rows to `builds.csv`:

```csv
name,command,enabled
example,node ../boxesandarrows/src/index.js -y ./diagram-definitions/example-diagram.yaml -r svg -o ./output/example,true
architecture,node ../boxesandarrows/src/index.js -y ./diagram-definitions/architecture.yaml -r svg -o ./output/architecture,true
flowchart,node ../boxesandarrows/src/index.js -y ./diagram-definitions/flowchart.yaml -r svg -o ./output/flowchart,true
```

### Enable PNG generation

PNGs are generated automatically for all enabled diagrams. Configure per-diagram:

**diagram-definitions/png-config.json:**

```json
{
  "enabled": true,
  "defaultScale": 2,
  "diagrams": {
    "example": {
      "scale": 3
    },
    "architecture": {
      "scale": 2
    }
  }
}
```

### Use table-based diagrams

If you have the concept_pack table system:

```csv
name,command,enabled
table-diagram,cd ../concept_pack && ./generate-diagram.sh my-table.yaml ../your-project/output/my-diagram && cd ../your-project,true
```

Or integrate the table generator into your project.

## Troubleshooting

**"boxesandarrows not found"**
- Check the `path` in `boxwatcher.config.json`
- Make sure it's relative to your project root

**"No enabled builds found"**
- Check `builds.csv` has `enabled` set to `true`
- Check CSV syntax (commas, quotes)

**Watch not working**
- Make sure nodemon is installed: `npm install -g nodemon`
- Check you're watching the right directory in config

**PNG not generating**
- Install dependencies: `npm install`
- Or disable: set `"png": { "enabled": false }` in config

## Example Projects

### ai-roadmap (the original)
```
ai-roadmap/
├── diagram-definitions/
│   ├── builds.csv
│   ├── ai-gateway-architecture.yaml
│   └── ...
├── output/
│   ├── ai-gateway.svg
│   └── ...
└── boxwatcher/ (or copied files)
```

### Your new project
```
my-docs/
├── diagram-definitions/
│   ├── builds.csv
│   └── diagrams...
├── output/
└── (boxwatcher files)
```

Just copy the structure and customize `builds.csv` for your diagrams!
