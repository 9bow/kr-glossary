#!/usr/bin/env node

/**
 * Generate CNAME file for GitHub Pages based on environment and domain configuration
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DOMAINS_CONFIG_PATH = join(__dirname, '..', 'config', 'domains.json');
const DIST_DIR = join(__dirname, '..', 'dist');
const CNAME_PATH = join(DIST_DIR, 'CNAME');

/**
 * Load domain configuration
 * @returns {Object} Domain configuration object
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
 * Determine environment based on command line arguments and environment variables
 * @returns {string} Environment name
 */
function determineEnvironment() {
  // Check command line arguments
  if (process.argv.includes('--production') || process.argv.includes('--prod')) {
    return 'production';
  }
  
  if (process.argv.includes('--staging')) {
    return 'staging';
  }
  
  if (process.argv.includes('--development') || process.argv.includes('--dev')) {
    return 'development';
  }
  
  // Check environment variables
  if (process.env.NODE_ENV === 'production') {
    // In production, check if we should use custom domain
    if (process.env.USE_CUSTOM_DOMAIN === 'true') {
      return 'production';
    }
    // Default to staging (GitHub Pages) in production
    return 'staging';
  }
  
  return 'development';
}

/**
 * Generate CNAME file
 * @param {string} environment - Target environment
 * @param {Object} domainConfig - Domain configuration
 */
function generateCNAME(environment, domainConfig) {
  const envConfig = domainConfig[environment];
  
  if (!envConfig) {
    console.error(`❌ Configuration not found for environment: ${environment}`);
    process.exit(1);
  }
  
  // Only create CNAME file for custom domains (not GitHub Pages subdomains)
  if (environment === 'production' && envConfig.canonical) {
    const domain = envConfig.domain;
    
    console.log(`📝 Generating CNAME file for ${environment} environment`);
    console.log(`🌐 Domain: ${domain}`);
    
    try {
      writeFileSync(CNAME_PATH, domain + '\n');
      console.log(`✅ CNAME file created successfully: ${CNAME_PATH}`);
      console.log(`📄 Content: ${domain}`);
    } catch (error) {
      console.error('❌ Error writing CNAME file:', error.message);
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ Skipping CNAME generation for ${environment} environment`);
    console.log(`🌐 Will use: ${envConfig.protocol}://${envConfig.domain}`);
    
    // Remove CNAME file if it exists (for GitHub Pages subdomain)
    if (existsSync(CNAME_PATH)) {
      try {
        unlinkSync(CNAME_PATH);
        console.log(`🗑️ Existing CNAME file removed`);
      } catch (error) {
        console.warn(`⚠️ Could not remove existing CNAME file: ${error.message}`);
      }
    }
  }
}

/**
 * Update HTML meta tags and manifest URLs based on domain configuration
 * @param {string} environment - Target environment  
 * @param {Object} domainConfig - Domain configuration
 */
function updateMetaTags(environment, domainConfig) {
  const envConfig = domainConfig[environment];
  const baseUrl = `${envConfig.protocol}://${envConfig.domain}`;
  
  console.log(`🔄 Domain configuration summary:`);
  console.log(`   Environment: ${environment}`);
  console.log(`   Domain: ${envConfig.domain}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Canonical: ${envConfig.canonical}`);
  console.log(`   Description: ${envConfig.description}`);
}

// Main execution
function main() {
  console.log('🚀 CNAME Generation Script');
  console.log('=' .repeat(50));
  
  const domainConfig = loadDomainConfig();
  const environment = determineEnvironment();
  
  updateMetaTags(environment, domainConfig);
  generateCNAME(environment, domainConfig);
  
  console.log('✨ CNAME generation completed successfully!');
}

// Run the script
main();