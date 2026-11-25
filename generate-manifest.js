#!/usr/bin/env node
/**
 * Generate manifest of SVG files from builds.csv
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsv(csvContent) {
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

function generateManifest(config = null) {
  if (!config) {
    config = loadConfig();
  }

  const outputDir = config.paths.output;
  const buildsFile = config.paths.builds;
  const manifestFile = path.join(outputDir, 'manifest.json');

  if (!fs.existsSync(outputDir)) {
    console.log('Output directory does not exist yet');
    return;
  }

  if (!fs.existsSync(buildsFile)) {
    console.log('builds.csv not found, falling back to directory scan');
    // Fallback to old behavior
    const files = fs.readdirSync(outputDir);
    const svgFiles = files
      .filter(f => f.endsWith('.svg'))
      .map(file => ({
        name: file.replace('.svg', ''),
        file: file,
        timestamp: Date.now()
      }));

    const manifest = {
      generated: new Date().toISOString(),
      count: svgFiles.length,
      diagrams: svgFiles
    };

    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log(`✓ Generated manifest with ${svgFiles.length} diagram(s)`);
    return;
  }

  // Read builds.csv
  const csvContent = fs.readFileSync(buildsFile, 'utf8');
  const builds = parseCsv(csvContent);

  // Filter enabled builds and check if SVG exists
  const diagrams = builds
    .filter(b => b.enabled && b.enabled.toLowerCase() === 'true')
    .map(build => {
      const svgFile = `${build.name}.svg`;
      const svgPath = path.join(outputDir, svgFile);

      if (!fs.existsSync(svgPath)) {
        return null;
      }

      const stats = fs.statSync(svgPath);

      return {
        buildName: build.name,
        name: build.name,
        file: svgFile,
        timestamp: stats.mtimeMs
      };
    })
    .filter(d => d !== null);

  const manifest = {
    generated: new Date().toISOString(),
    count: diagrams.length,
    diagrams: diagrams
  };

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`✓ Generated manifest with ${diagrams.length} diagram(s) from builds.csv`);
}

if (require.main === module) {
  generateManifest();
}

module.exports = { generateManifest };
