#!/usr/bin/env node
/**
 * Configuration loader for boxwatcher
 * Loads config from boxwatcher.config.json or uses defaults
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  boxesandarrows: {
    path: '../boxesandarrows',
    command: 'node ../boxesandarrows/src/index.js'
  },
  paths: {
    definitions: './diagram-definitions',
    output: './output',
    builds: './diagram-definitions/builds.csv',
    pngConfig: './diagram-definitions/png-config.json',
    pngCache: './.png-cache.json'
  },
  watch: {
    patterns: ['diagram-definitions'],
    extensions: ['yaml', 'csv', 'json'],
    ignore: ['output', 'node_modules']
  },
  png: {
    enabled: true,
    defaultScale: 2
  },
  serve: {
    port: 8080,
    open: '/index.html'
  }
};

/**
 * Load configuration from file or use defaults
 * @param {string} configPath - Path to config file (optional)
 * @param {string} cwd - Current working directory (defaults to process.cwd())
 * @returns {object} Merged configuration
 */
function loadConfig(configPath = null, cwd = null) {
  const workingDir = cwd || process.cwd();

  // Try to find config file
  const possiblePaths = [
    configPath,
    path.join(workingDir, 'boxwatcher.config.json'),
    path.join(workingDir, '.boxwatcherrc'),
    path.join(workingDir, '.boxwatcherrc.json')
  ].filter(p => p != null);

  let userConfig = {};
  let configFile = null;

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        userConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        configFile = filePath;
        break;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load config from ${filePath}:`, error.message);
    }
  }

  // Deep merge configs
  const config = deepMerge(DEFAULT_CONFIG, userConfig);

  // Resolve relative paths from working directory
  config.paths = resolvePaths(config.paths, workingDir);

  // Store metadata
  config._meta = {
    configFile,
    workingDir,
    loadedAt: new Date().toISOString()
  };

  return config;
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Resolve all relative paths from working directory
 */
function resolvePaths(paths, workingDir) {
  const resolved = {};

  for (const [key, value] of Object.entries(paths)) {
    if (typeof value === 'string' && !path.isAbsolute(value)) {
      resolved[key] = path.resolve(workingDir, value);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const errors = [];

  // Check required paths exist
  if (!fs.existsSync(config.paths.definitions)) {
    errors.push(`Definitions directory not found: ${config.paths.definitions}`);
  }

  if (!fs.existsSync(config.paths.builds)) {
    errors.push(`Builds CSV not found: ${config.paths.builds}`);
  }

  // Check boxesandarrows is accessible
  const boxesArrowsPath = path.resolve(config._meta.workingDir, config.boxesandarrows.path);
  const indexPath = path.join(boxesArrowsPath, 'src', 'index.js');
  if (!fs.existsSync(indexPath)) {
    errors.push(`boxesandarrows not found at: ${boxesArrowsPath}`);
    errors.push(`Expected index.js at: ${indexPath}`);
  }

  return errors;
}

module.exports = {
  loadConfig,
  validateConfig,
  DEFAULT_CONFIG
};
