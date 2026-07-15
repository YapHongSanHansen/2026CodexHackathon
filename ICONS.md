# Icon Generation Instructions

The project includes SVG icon files that need to be converted to PNG for PWA compatibility.

## Quick Method: Use an online converter

1. Visit https://cloudconvert.com/svg-to-png
2. Upload `public/icon-192.svg` → Convert to PNG → Download as `icon-192.png`
3. Upload `public/icon-512.svg` → Convert to PNG → Download as `icon-512.png`
4. Place both PNG files in the `public/` directory

## Alternative: Use ImageMagick (if installed)

```bash
# Install ImageMagick (if not installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Convert icons
convert public/icon-192.svg public/icon-192.png
convert public/icon-512.svg public/icon-512.png
```

## Alternative: Use Node.js script

```bash
npm install sharp
node -e "
const sharp = require('sharp');
const fs = require('fs');

sharp('public/icon-192.svg')
  .png()
  .toFile('public/icon-192.png')
  .then(() => console.log('192px icon created'));

sharp('public/icon-512.svg')
  .png()
  .toFile('public/icon-512.png')
  .then(() => console.log('512px icon created'));
"
```

## For Demo/Testing

If you want to skip icon conversion for now, the app will still work. The SVG icons are provided as placeholders. Just be aware that PWA installation may not work perfectly without the PNG versions.
