#!/usr/bin/env node
/**
 * Generate PNG files from SVG diagrams when they change
 * Uses crypto hashing to detect actual content changes, not just rebuilds
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function loadDiagramsFromBuilds(config) {
  try {
    const csvContent = fs.readFileSync(config.paths.builds, 'utf8');
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    const headers = parseCsvLine(lines[0]);

    const diagrams = {};
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      if (row.enabled && row.enabled.toLowerCase() === 'true' && row.name) {
        diagrams[row.name] = { scale: config.png.defaultScale };
      }
    }

    return diagrams;
  } catch (error) {
    console.error('❌ Failed to read builds.csv:', error.message);
    return {};
  }
}

function loadPngConfig(config) {
  try {
    if (fs.existsSync(config.paths.pngConfig)) {
      const pngConfig = JSON.parse(fs.readFileSync(config.paths.pngConfig, 'utf8'));
      return pngConfig;
    }
  } catch (error) {
    console.warn('⚠️  Could not load png-config.json (optional)');
  }
  return { enabled: true, defaultScale: config.png.defaultScale, diagrams: {} };
}

function loadCache(config) {
  try {
    if (fs.existsSync(config.paths.pngCache)) {
      return JSON.parse(fs.readFileSync(config.paths.pngCache, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not load cache, will regenerate all PNGs');
  }
  return {};
}

function saveCache(cache, config) {
  try {
    fs.writeFileSync(config.paths.pngCache, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('❌ Failed to save cache:', error.message);
  }
}

function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

function hasChanged(diagramName, currentHash, cache) {
  if (!cache[diagramName]) {
    return true;
  }
  return cache[diagramName].hash !== currentHash;
}

function getSvgDimensions(svgContent) {
  const svgString = svgContent.toString();

  const widthMatch = svgString.match(/\swidth="(\d+(?:\.\d+)?)"/);
  const heightMatch = svgString.match(/\sheight="(\d+(?:\.\d+)?)"/);

  if (widthMatch && heightMatch) {
    return {
      width: parseFloat(widthMatch[1]),
      height: parseFloat(heightMatch[1])
    };
  }

  const viewBoxMatch = svgString.match(/viewBox="[^"]*\s+[^"]*\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/);
  if (viewBoxMatch) {
    return {
      width: parseFloat(viewBoxMatch[1]),
      height: parseFloat(viewBoxMatch[2])
    };
  }

  return { width: 1600, height: 900 };
}

async function convertSvgToPng(svgPath, pngPath, scale = 2) {
  try {
    const sharp = require('sharp');
    const { Resvg } = require('@resvg/resvg-js');

    const svgContent = fs.readFileSync(svgPath);
    const dimensions = getSvgDimensions(svgContent);
    const targetWidth = Math.round(dimensions.width * scale);

    const resvg = new Resvg(svgContent, {
      fitTo: {
        mode: 'width',
        value: targetWidth,
      },
    });
    const pngBuffer = resvg.render().asPng();

    fs.writeFileSync(pngPath, pngBuffer);
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Required packages not installed. Run:');
      console.error('   npm install sharp @resvg/resvg-js');
      return false;
    }
    console.error(`❌ Failed to convert ${path.basename(svgPath)}:`, error.message);
    return false;
  }
}

async function main(config = null) {
  if (!config) {
    config = loadConfig();
  }

  if (!config.png.enabled) {
    console.log('ℹ️  PNG generation disabled in config');
    return;
  }

  console.log('🖼️  PNG Generator - Detecting changed SVGs...\n');

  const diagrams = loadDiagramsFromBuilds(config);

  if (Object.keys(diagrams).length === 0) {
    console.log('⚠️  No enabled diagrams found in builds.csv');
    return;
  }

  const pngConfig = loadPngConfig(config);
  if (pngConfig && pngConfig.enabled === false) {
    console.log('ℹ️  PNG generation disabled in png-config.json');
    return;
  }

  // Merge config overrides
  const mergedDiagrams = { ...diagrams };
  if (pngConfig && pngConfig.diagrams) {
    Object.keys(mergedDiagrams).forEach(name => {
      if (pngConfig.diagrams[name]) {
        mergedDiagrams[name] = { ...mergedDiagrams[name], ...pngConfig.diagrams[name] };
      }
    });
  }

  const cache = loadCache(config);
  const newCache = {};
  let changedCount = 0;
  let generatedCount = 0;

  console.log(`📋 Found ${Object.keys(mergedDiagrams).length} enabled diagram(s) from builds.csv\n`);

  for (const [diagramName, settings] of Object.entries(mergedDiagrams)) {
    const svgPath = path.join(config.paths.output, `${diagramName}.svg`);
    const pngPath = path.join(config.paths.output, `${diagramName}.png`);

    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  ${diagramName}: SVG not found, skipping`);
      continue;
    }

    const currentHash = getFileHash(svgPath);
    if (!currentHash) {
      console.log(`❌ ${diagramName}: Failed to read SVG`);
      continue;
    }

    newCache[diagramName] = {
      hash: currentHash,
      timestamp: new Date().toISOString()
    };

    if (hasChanged(diagramName, currentHash, cache)) {
      changedCount++;
      const scale = settings.scale || pngConfig.defaultScale || config.png.defaultScale;
      console.log(`🔄 ${diagramName}: Content changed, generating PNG at ${scale}x...`);

      const success = await convertSvgToPng(svgPath, pngPath, scale);
      if (success) {
        generatedCount++;
        const stats = fs.statSync(pngPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   ✅ Generated ${diagramName}.png (${sizeMB} MB)`);
      }
    } else {
      console.log(`⏭️  ${diagramName}: No changes, skipping`);
    }
  }

  saveCache(newCache, config);

  console.log(`\n📊 Summary: ${changedCount} changed, ${generatedCount} generated`);

  if (changedCount > 0 && generatedCount === 0) {
    console.log('\n💡 Tip: Install dependencies to enable automatic PNG generation:');
    console.log('   npm install sharp @resvg/resvg-js');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
