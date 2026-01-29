/**
 * Icon Generation Script for AutoApplyer PWA
 * 
 * Generates required icon sizes from the SVG source.
 * Requires sharp: npm install --save-dev sharp
 * 
 * Run: node scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const iconSvg = path.join(publicDir, 'icon.svg');

// Icon sizes required for PWA
const iconSizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
];

async function generateIcons() {
  try {
    // Check if sharp is available
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (error) {
      console.error('Error: sharp is not installed.');
      console.error('Please install it with: npm install --save-dev sharp');
      console.error('\nFor now, creating placeholder icon files...');
      createPlaceholderIcons();
      return;
    }

    if (!fs.existsSync(iconSvg)) {
      console.error(`Error: ${iconSvg} not found`);
      createPlaceholderIcons();
      return;
    }

    console.log('Generating icons from SVG...');

    for (const { size, name } of iconSizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(iconSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 13, g: 138, b: 255, alpha: 1 }, // #0d8aff
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${name} (${size}x${size})`);
    }

    // Generate favicon.ico (multi-size ICO)
    const faviconPath = path.join(publicDir, 'favicon.ico');
    const favicon16 = await sharp(iconSvg)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 13, g: 138, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();
    
    const favicon32 = await sharp(iconSvg)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 13, g: 138, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    // For simplicity, just copy 32x32 as favicon.ico
    // In production, use a proper ICO encoder
    fs.writeFileSync(faviconPath, favicon32);
    console.log('✓ Generated favicon.ico');

    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    createPlaceholderIcons();
  }
}

function createPlaceholderIcons() {
  console.log('\nCreating placeholder icon files...');
  console.log('Note: Replace these with proper icons before production deployment.');
  
  // Create a simple SVG-based placeholder that browsers can use
  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#0d8aff"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">AA</text>
</svg>`;

  // Write SVG as fallback
  for (const { name } of iconSizes) {
    const outputPath = path.join(publicDir, name.replace('.png', '.svg'));
    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, placeholderSvg);
    }
  }
  
  console.log('✓ Placeholder SVG icons created');
  console.log('⚠ Please generate proper PNG icons before production');
}

generateIcons();

