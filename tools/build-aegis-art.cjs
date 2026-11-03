/* Converts the generated PNG alpha outline into geometry metadata.
   Original PNG bytes are preserved. Embedded copies support direct file:// opening. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');

function readPNG(filename) {
  const bytes = fs.readFileSync(filename);
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected a PNG image');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0) throw new Error('Expected non-interlaced, 8-bit RGBA PNG');
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const size = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4, rgba = new Uint8Array(stride * height);
  let input = 0;
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  for (let y = 0; y < height; y++) {
    const filter = raw[input++], row = y * stride;
    if (filter > 4) throw new Error('Unknown PNG filter');
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[row + x - 4] : 0, b = y ? rgba[row + x - stride] : 0, c = x >= 4 && y ? rgba[row + x - stride - 4] : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c);
      rgba[row + x] = (raw[input++] + prediction) & 255;
    }
  }
  const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let largest = [], minX = width, maxX = 0, minY = height, maxY = 0;
  for (let index = 0; index < visited.length; index++) {
    if (visited[index] || rgba[index * 4 + 3] < 170) continue;
    let head = 0, tail = 1;
    queue[0] = index; visited[index] = 1;
    while (head < tail) {
      const current = queue[head++], x = current % width, y = Math.floor(current / width);
      for (const next of [x > 0 ? current - 1 : -1, x + 1 < width ? current + 1 : -1, y > 0 ? current - width : -1, y + 1 < height ? current + width : -1]) {
        if (next < 0 || visited[next] || rgba[next * 4 + 3] < 170) continue;
        visited[next] = 1; queue[tail++] = next;
      }
    }
    if (tail > largest.length) largest = Array.from(queue.subarray(0, tail));
  }
  const mask = new Uint8Array(width * height);
  for (const index of largest) {
    mask[index] = 1;
    const x = index % width, y = Math.floor(index / width);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const directions = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const inside = (x, y) => x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x];
  const startIndex = mask.indexOf(1), start = [startIndex % width, Math.floor(startIndex / width)];
  let current = start, previous = [start[0] - 1, start[1]], firstNext = null;
  const contour = [];
  for (let step = 0; step < width * height; step++) {
    const direction = directions.findIndex(([dx, dy]) => current[0] + dx === previous[0] && current[1] + dy === previous[1]);
    let next = null, before = null;
    for (let i = 0; i < 8; i++) {
      const k = ((direction < 0 ? 7 : direction) + i) % 8;
      const x = current[0] + directions[k][0], y = current[1] + directions[k][1];
      if (inside(x, y)) {
        next = [x, y];
        const preceding = directions[(k + 7) % 8];
        before = [current[0] + preceding[0], current[1] + preceding[1]];
        break;
      }
    }
    if (!next) break;
    if (firstNext && current[0] === start[0] && current[1] === start[1] && next[0] === firstNext[0] && next[1] === firstNext[1]) break;
    if (!firstNext) firstNext = next;
    contour.push(current); previous = before; current = next;
  }
  if (contour.length < 50 || contour.length >= width * height) throw new Error('Unable to trace the trophy silhouette');
  return { bytes, width, height, contour, bounds: { minX, minY, maxX, maxY }, opaquePixels: largest.length };
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const a = points[0], b = points[points.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
  let maximum = 0, split = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
    const distance = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
    if (distance > maximum) { maximum = distance; split = i; }
  }
  return maximum > epsilon ? [...simplify(points.slice(0, split + 1), epsilon).slice(0, -1), ...simplify(points.slice(split), epsilon)] : [a, b];
}

if (process.argv[2] === '--inspect') {
  const image = readPNG(path.resolve(process.argv[3]));
  console.log(JSON.stringify({ width: image.width, height: image.height, bounds: image.bounds, contourPoints: image.contour.length, opaquePixels: image.opaquePixels }));
} else {
  const front = readPNG(path.join(root, 'assets/aegis-front-detailed.png'));
  const back = readPNG(path.join(root, 'assets/aegis-back-detailed.png'));
  const width = 5, height = width * (front.bounds.maxY - front.bounds.minY) / (front.bounds.maxX - front.bounds.minX);
  const centerX = (front.bounds.maxX + front.bounds.minX) / 2, centerY = (front.bounds.maxY + front.bounds.minY) / 2;
  const scale = width / (front.bounds.maxX - front.bounds.minX);
  let farthest = 0, distance = 0;
  front.contour.forEach((p, index) => { const d = Math.hypot(p[0] - front.contour[0][0], p[1] - front.contour[0][1]); if (d > distance) { distance = d; farthest = index; } });
  const outline = [...simplify(front.contour.slice(0, farthest + 1), 2).slice(0, -1), ...simplify([...front.contour.slice(farthest), front.contour[0]], 2).slice(0, -1)]
    .map(([x, y]) => [Number(((x - centerX) * scale).toFixed(5)), Number(((centerY - y) * scale).toFixed(5))]);
  function imageInfo(image) {
    const b = image.bounds;
    return {
      width: image.width, height: image.height,
      uvScale: [(b.maxX - b.minX) / (width * image.width), (b.maxY - b.minY) / (height * image.height)],
      uvOffset: [(b.maxX + b.minX) / (2 * image.width), 1 - (b.maxY + b.minY) / (2 * image.height)]
    };
  }
  const metadata = { width, height, outline, front: imageInfo(front), back: imageInfo(back) };
  fs.writeFileSync(path.join(root, 'assets/aegis-shape.js'), '/* Alpha-traced geometry metadata; generated by tools/build-aegis-art.cjs. */\nwindow.FTAPAegisShape=' + JSON.stringify(metadata) + ';\n');
  const textures = { front: 'data:image/png;base64,' + front.bytes.toString('base64'), back: 'data:image/png;base64,' + back.bytes.toString('base64') };
  fs.writeFileSync(path.join(root, 'assets/aegis-local-textures.js'), '/* Original image bytes embedded for direct file:// WebGL compatibility. HTTP sites use the PNG files. */\nwindow.FTAPAegisTextures=' + JSON.stringify(textures) + ';\n');
  console.log(JSON.stringify({ width, height, outlinePoints: outline.length, front: metadata.front, back: metadata.back }));
}
