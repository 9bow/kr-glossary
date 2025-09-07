#!/usr/bin/env node

/**
 * Generate manifest.json with correct base path for GitHub Pages
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isGitHub = process.env.NODE_ENV === 'production' && process.argv.includes('--github');
const basePath = isGitHub ? '/kr-glossary' : '';

const manifestTemplate = {
  "name": "AI/ML 용어집",
  "short_name": "용어집",
  "description": "한국어 AI/ML 용어 표준화 플랫폼",
  "start_url": `${basePath}/`,
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2196f3",
  "orientation": "portrait-primary",
  "scope": `${basePath}/`,
  "lang": "ko",
  "dir": "ltr",
  "categories": ["education", "productivity", "reference"],
  "icons": [
    {
      "src": `${basePath}/favicon.svg`,
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": `${basePath}/favicon-16x16.png`,
      "sizes": "16x16",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": `${basePath}/favicon-32x32.png`,
      "sizes": "32x32",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": `${basePath}/favicon-32x32.png`,
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": `${basePath}/favicon-32x32.png`,
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "검색",
      "short_name": "검색", 
      "description": "용어 검색",
      "url": `${basePath}/search`,
      "icons": [{ "src": `${basePath}/favicon-32x32.png`, "sizes": "32x32" }]
    },
    {
      "name": "기여하기",
      "short_name": "기여",
      "description": "새 용어 추가", 
      "url": `${basePath}/contribute`,
      "icons": [{ "src": `${basePath}/favicon-32x32.png`, "sizes": "32x32" }]
    }
  ],
  "screenshots": [
    {
      "src": `${basePath}/og-image.png`,
      "sizes": "1200x630",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
};

const distPath = join(__dirname, '..', 'dist', 'manifest.json');
writeFileSync(distPath, JSON.stringify(manifestTemplate, null, 2));

console.log(`Generated manifest.json with base path: ${basePath || '/'}`);