# Icon Generation for AutoApplyer PWA

This directory should contain the following icon files for PWA support:

- `icon-192x192.png` - Standard Android icon (192x192)
- `icon-512x512.png` - High-resolution Android icon (512x512)
- `apple-touch-icon.png` - iOS icon (180x180)
- `favicon-32x32.png` - Standard favicon (32x32)
- `favicon-16x16.png` - Small favicon (16x16)
- `favicon.ico` - Multi-size ICO file (optional)

## Generating Icons

### Option 1: Using the Icon Generation Script (Recommended)

If you have `sharp` installed:

```bash
npm install --save-dev sharp
node scripts/generate-icons.js
```

This will generate all required PNG icons from `public/icon.svg`.

### Option 2: Manual Generation

1. Use the existing logo: `ui/static/autoapplyer-logo-typeface.png`
2. Resize to required sizes using an image editor (Photoshop, GIMP, ImageMagick, etc.)
3. Save as PNG files with the exact names listed above
4. Place all files in the `public/` directory

### Option 3: Online Tools

Use online PWA icon generators:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## Icon Design Guidelines

- Use the AutoApplyer brand colors: Primary blue (#0d8aff)
- Ensure icons are clear and recognizable at small sizes
- Icons should work on both light and dark backgrounds
- For maskable icons, ensure important content is within the safe zone (80% of icon area)

## Current Status

SVG placeholder icons have been created. Replace these with proper PNG icons before production deployment.

