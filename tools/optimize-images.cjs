/* Build smaller browser assets while retaining the supplied originals.
   Usage: node tools/optimize-images.cjs [absolute path to the sharp package]
   Sharp is a development-only tool; the website has no package dependency. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.argv[2] || 'sharp');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const output = path.join(assets, 'optimized');
const slash = value => value.split(path.sep).join('/');

function images(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (filename === output || entry.name === 'vendor') return [];
    return entry.isDirectory() ? images(filename) : /\.(png|jpe?g)$/i.test(entry.name) ? [filename] : [];
  });
}

function settings(relative) {
  if (/^aegis-(front|back)-detailed\.png$/.test(relative)) return { lossless: true };
  if (relative.startsWith('medals/')) return { width: 192, height: 192, lossless: true };
  if (relative.startsWith('teams/')) {
    const parts = relative.split('/');
    const logo = path.parse(parts.at(-1)).name === parts.at(-2);
    return logo ? { width: 420, height: 420, lossless: true } : { width: 960, height: 1280, quality: 90 };
  }
  if (/^player-(man|woman)\.png$/.test(relative)) return { width: 720, height: 960, quality: 92 };
  if (relative === 'smokespammers.png') return { width: 840, height: 840, lossless: true };
  if (relative === 'smokespammers-background.png') return { width: 1024, height: 1280, quality: 88 };
  return { width: 2048, height: 1536, quality: 90 };
}

async function encode(source, target, options) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let pipeline = sharp(source);
  if (options.width || options.height) pipeline = pipeline.resize({
    width: options.width, height: options.height, fit: 'inside', withoutEnlargement: true
  });
  const result = await pipeline.webp({
    quality: options.quality || 90, alphaQuality: 100,
    lossless: !!options.lossless, exact: !!options.lossless, effort: 6
  }).toFile(target);
  return { path: slash(path.relative(root, target)), width: result.width, height: result.height, bytes: result.size };
}

async function main() {
  const manifest = [];
  for (const source of images(assets).sort()) {
    const relative = slash(path.relative(assets, source));
    const options = settings(relative);
    const target = path.join(output, relative.replace(/\.(png|jpe?g)$/i, '.webp'));
    const original = fs.readFileSync(source);
    const metadata = await sharp(original).metadata();
    let optimized = await encode(original, target, options);
    if (!options.lossless && optimized.bytes >= original.length) {
      optimized = await encode(original, target, { ...options, quality: 85 });
    }
    manifest.push({
      source: 'assets/' + relative, sourceBytes: original.length,
      sourceSHA256: crypto.createHash('sha256').update(original).digest('hex'),
      sourceWidth: metadata.width, sourceHeight: metadata.height,
      hasAlpha: !!metadata.hasAlpha, lossless: !!options.lossless, ...optimized
    });
    console.log(relative + ': ' + Math.round(original.length / 1024) + ' -> ' + Math.round(optimized.bytes / 1024) + ' KB');
  }
  const variants = [
    { source: 'gamingbg.png', filename: 'gamingbg-960.webp', width: 960, quality: 90 },
    { source: 'aegis-front-detailed.png', filename: 'aegis-front-preview.webp', width: 512, height: 512, quality: 92 }
  ];
  for (const variant of variants) {
    const optimized = await encode(path.join(assets, variant.source), path.join(output, variant.filename), variant);
    manifest.push({ source: 'assets/' + variant.source, variant: true, ...optimized });
  }
  const textures = Object.fromEntries(['front', 'back'].map(side => [side,
    'data:image/webp;base64,' + fs.readFileSync(path.join(output, 'aegis-' + side + '-detailed.webp')).toString('base64')
  ]));
  fs.writeFileSync(path.join(assets, 'aegis-local-textures.js'),
    '/* Lossless WebP textures for direct file:// opening. Hosted pages load the same WebP files. */\nwindow.FTAPAegisTextures=' + JSON.stringify(textures) + ';\n');
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const originalBytes = manifest.filter(item => !item.variant).reduce((total, item) => total + item.sourceBytes, 0);
  const optimizedBytes = manifest.reduce((total, item) => total + item.bytes, 0);
  console.log(JSON.stringify({ images: manifest.length, originalBytes, optimizedBytes, savedPercent: +(100 * (1 - optimizedBytes / originalBytes)).toFixed(1) }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
