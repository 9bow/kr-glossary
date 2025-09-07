#!/usr/bin/env node

/**
 * Update domain URLs in built files based on environment configuration
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DOMAINS_CONFIG_PATH = join(__dirname, '..', 'config', 'domains.json');
const DIST_DIR = join(__dirname, '..', 'dist');

/**
 * Load domain configuration
 */
function loadDomainConfig() {
  try {
    if (!existsSync(DOMAINS_CONFIG_PATH)) {
      throw new Error(`Domain config file not found: ${DOMAINS_CONFIG_PATH}`);
    }
    
    const configContent = readFileSync(DOMAINS_CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('❌ Error loading domain configuration:', error.message);
    process.exit(1);
  }
}

/**
 * Determine environment (same logic as generate-cname.js)
 */
function determineEnvironment() {
  if (process.argv.includes('--production') || process.argv.includes('--prod')) {
    return 'production';
  }
  
  if (process.argv.includes('--staging')) {
    return 'staging';
  }
  
  if (process.argv.includes('--development') || process.argv.includes('--dev')) {
    return 'development';
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.USE_CUSTOM_DOMAIN === 'true') {
      return 'production';
    }
    return 'staging';
  }
  
  return 'development';
}

/**
 * Find HTML files recursively
 */
function findHtmlFiles(dir) {
  let results = [];
  const items = readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  
  return results;
}

/**
 * Update HTML files with correct domain URLs
 */
function updateHtmlFiles(baseUrl) {
  if (!existsSync(DIST_DIR)) {
    console.log('ℹ️ dist directory not found, skipping HTML updates');
    return;
  }
  
  const htmlFiles = findHtmlFiles(DIST_DIR);
  console.log(`📝 Updating ${htmlFiles.length} HTML files...`);
  
  htmlFiles.forEach(filePath => {
    try {
      let content = readFileSync(filePath, 'utf-8');
      
      // Update Open Graph URLs
      content = content.replace(
        /content="https:\/\/glossary\.kr\//g,
        `content="${baseUrl}/`
      );
      
      // Update Twitter Card URLs  
      content = content.replace(
        /property="twitter:url" content="https:\/\/glossary\.kr\//g,
        `property="twitter:url" content="${baseUrl}/`
      );
      
      // Update canonical URL
      content = content.replace(
        /href="https:\/\/aiml-glossary\.github\.io\/kr-glossary\/"/g,
        `href="${baseUrl}/"`
      );
      
      // Update manifest and icon URLs if needed
      if (baseUrl.includes('github.io')) {
        const pathMatch = baseUrl.match(/github\.io(\/.*)?/);
        const basePath = pathMatch ? pathMatch[1] || '' : '';
        
        content = content.replace(
          /href="\/manifest\.json"/g,
          `href="${basePath}/manifest.json"`
        );
      }
      
      writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath.replace(DIST_DIR, '')}`);
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  });
}

/**
 * Update manifest.json with correct URLs
 */
function updateManifestFile(baseUrl, basePath = '') {
  const manifestPath = join(DIST_DIR, 'manifest.json');
  
  if (!existsSync(manifestPath)) {
    console.log('ℹ️ manifest.json not found, skipping update');
    return;
  }
  
  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Update start_url and scope
    manifest.start_url = `${basePath}/`;
    manifest.scope = `${basePath}/`;
    
    // Update shortcut URLs
    if (manifest.shortcuts) {
      manifest.shortcuts = manifest.shortcuts.map(shortcut => ({
        ...shortcut,
        url: `${basePath}${shortcut.url}`
      }));
    }
    
    // Update screenshot URLs
    if (manifest.screenshots) {
      manifest.screenshots = manifest.screenshots.map(screenshot => ({
        ...screenshot,
        src: `${basePath}${screenshot.src}`
      }));
    }
    
    // Icons are already handled by generate-manifest.js
    
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Updated manifest.json`);
    
  } catch (error) {
    console.error('❌ Error updating manifest.json:', error.message);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Domain URL Update Script');
  console.log('=' .repeat(50));
  
  const domainConfig = loadDomainConfig();
  const environment = determineEnvironment();
  const envConfig = domainConfig[environment];
  
  if (!envConfig) {
    console.error(`❌ Configuration not found for environment: ${environment}`);
    process.exit(1);
  }
  
  const baseUrl = `${envConfig.protocol}://${envConfig.domain}`;
  let basePath = '';
  
  // Extract base path for GitHub Pages
  if (envConfig.domain.includes('github.io') && envConfig.domain.includes('/')) {
    basePath = '/' + envConfig.domain.split('/').slice(1).join('/');
  }
  
  console.log(`🌐 Updating URLs for ${environment} environment`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Base Path: ${basePath || '/'}`);
  
  updateHtmlFiles(baseUrl);
  updateManifestFile(baseUrl, basePath);
  
  console.log('✨ Domain URL updates completed successfully!');
}

main();