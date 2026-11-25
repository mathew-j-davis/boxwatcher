#!/usr/bin/env node
/**
 * Build all diagrams defined in builds.csv
 * Reads CSV configuration and executes enabled build commands
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { loadConfig, validateConfig } = require('./config');

function parseCsvLine(line) {
  // Parse CSV line handling quoted fields
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
  const lines = csvContent.trim().split('\n');
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

function executeBuild(build, config) {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Building: ${build.name}`);
  console.log(`Command: ${build.command}`);
  console.log(`${'='.repeat(60)}`);

  try {
    execSync(build.command, {
      stdio: 'inherit',
      cwd: config._meta.workingDir
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ${build.name} completed in ${duration}s`);
    return { success: true, name: build.name, duration };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ ${build.name} failed after ${duration}s`);
    return { success: false, name: build.name, duration, error: error.message };
  }
}

async function main() {
  console.log('🔨 BoxWatcher Build System\n');

  // Load configuration
  const config = loadConfig();

  if (config._meta.configFile) {
    console.log(`📋 Loaded config from: ${config._meta.configFile}`);
  } else {
    console.log(`📋 Using default configuration`);
  }

  // Validate configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('\n❌ Configuration errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n💡 Create a boxwatcher.config.json file or check paths in existing config\n');
    process.exit(1);
  }

  console.log(`📁 Builds file: ${config.paths.builds}`);
  console.log(`📁 Output directory: ${config.paths.output}\n`);

  if (!fs.existsSync(config.paths.builds)) {
    console.error(`Error: ${config.paths.builds} not found`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(config.paths.builds, 'utf8');
  const builds = parseCsv(csvContent);

  // Filter enabled builds
  const enabledBuilds = builds.filter(b =>
    b.enabled && b.enabled.toLowerCase() === 'true'
  );

  if (enabledBuilds.length === 0) {
    console.log('No enabled builds found in builds.csv');
    process.exit(0);
  }

  console.log(`Found ${enabledBuilds.length} enabled build(s)\n`);

  const results = [];
  const overallStart = Date.now();

  for (const build of enabledBuilds) {
    const result = executeBuild(build, config);
    results.push(result);
  }

  // Summary
  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('BUILD SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total: ${results.length} builds`);
  console.log(`✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log(`⏱️  Total time: ${overallDuration}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Generate manifest of SVG files
  try {
    require('./generate-manifest').generateManifest(config);
  } catch (error) {
    console.error('Failed to generate manifest:', error.message);
  }

  // Generate PNGs for changed SVGs
  if (config.png.enabled) {
    try {
      await require('./generate-pngs').main(config);
    } catch (error) {
      console.error('Failed to generate PNGs:', error.message);
    }
  }

  // Exit with error code if any builds failed
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { parseCsv, executeBuild, main };
