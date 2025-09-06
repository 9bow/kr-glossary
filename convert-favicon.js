import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertFavicon() {
  const inputPath = path.join(__dirname, 'public', 'favicon.svg');
  const outputDir = path.join(__dirname, 'public');

  try {
    // Convert to 32x32 PNG
    await sharp(inputPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(outputDir, 'favicon-32x32.png'));

    // Convert to 16x16 PNG
    await sharp(inputPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(outputDir, 'favicon-16x16.png'));

    console.log('✅ Favicon PNG files generated successfully!');
    console.log('- favicon-32x32.png');
    console.log('- favicon-16x16.png');
  } catch (error) {
    console.error('❌ Error converting favicon:', error);
  }
}

convertFavicon();
