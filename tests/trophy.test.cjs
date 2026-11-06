/* Node-only integration checks: real Three.js geometry, a simulated DOM and renderer.
   Run with node --test tests/trophy.test.cjs. No browser or packages are required. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'trophy.js'), 'utf8');
const library = fs.readFileSync(path.join(root, 'assets/vendor/three-trophy.min.js'), 'utf8');
const shapeSource = fs.readFileSync(path.join(root, 'assets/aegis-shape.js'), 'utf8');

function fixture({ noWebGL = false, protocol = 'file', omitRollCall = false } = {}) {
  const nodes = new Map(), allNodes = [], contexts = [], renderers = [], frames = new Map(), resizeCallbacks = [];
  let frameId = 0, time = 0, context;
  let stageSize = { width: 1200, height: 600 };
  class Element {
    constructor(tag = 'div', id = '') {
      this.tagName = tag; this.id = id; this.children = []; this.parentElement = null;
      this.attributes = new Map(); this.listeners = new Map(); this.style = {};
      this.dataset = {}; this.textContent = ''; this.open = false; this.isConnected = true;
      const classes = new Set();
      this.classList = { add: value => classes.add(value), contains: value => classes.has(value), remove: value => classes.delete(value) };
      allNodes.push(this);
      if (id) nodes.set('#' + id, this);
    }
    append(...children) {
      for (const child of children) {
        if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
        child.parentElement = this; this.children.push(child);
      }
    }
    replaceChildren(...children) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; this.append(...children); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.get(key) || null; }
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    }
    fire(type, supplied = {}) {
      const event = { button: 0, pointerType: 'mouse', preventDefault() { this.defaultPrevented = true; }, ...supplied };
      for (const listener of this.listeners.get(type) || []) listener(event);
      return event;
    }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { if (this.open) { this.open = false; this.fire('close'); } }
    setPointerCapture() {}
    getBoundingClientRect() {
      const width = this.id === 'trophy-stage' ? stageSize.width : 600;
      const height = this.id === 'trophy-stage' ? stageSize.height : 600;
      return { width, height, left: 0, top: 0, right: width, bottom: height };
    }
    querySelector(selector) { return this === section && selector === '[data-trophy-players]' && !omitRollCall ? players : null; }
  }
  class Canvas extends Element {
    constructor() {
      super('canvas');
      let transform = [1, 0, 0, 1, 0, 0];
      const stack = [];
      const ctx = {
        texts: [], textRuns: [], drawnImages: [], drawImage(image) { this.drawnImages.push(image); }, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        bezierCurveTo() {}, arc() {},
        translate(x, y) { transform[4] += transform[0] * x + transform[2] * y; transform[5] += transform[1] * x + transform[3] * y; },
        rotate(angle) {
          const [a, b, c, d, e, f] = transform, cos = Math.cos(angle), sin = Math.sin(angle);
          transform = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, e, f];
        },
        save() { stack.push({ transform: [...transform], font: this.font }); },
        restore() { const saved = stack.pop(); transform = saved.transform; this.font = saved.font; },
        putImageData() {}, createPattern() { return {}; }, createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
        createRadialGradient() { return { addColorStop() {} }; },
        measureText(text) { return { width: String(text).length * parseFloat((this.font || '10px').match(/[\d.]+px/)[0]) * 0.55 }; },
        fillText(text, x, y, maxWidth) {
          this.texts.push(text);
          this.textRuns.push({ text, x: transform[0] * x + transform[2] * y + transform[4], y: transform[1] * x + transform[3] * y + transform[5], font: this.font, maxWidth });
        }
      };
      this.getContext = () => ctx;
      this.toDataURL = () => 'data:image/png;base64,' + Buffer.from(ctx.texts.join('')).toString('base64');
      contexts.push(ctx);
    }
  }
  const section = new Element('section', 'trophy');
  const dialog = new Element('dialog', 'trophy-dialog');
  const preview = new Element('span', 'trophy-preview-stage');
  const stage = new Element('div', 'trophy-stage');
  const flat = new Element('img', 'trophy-flat-image');
  flat.alt = 'Front of a bronze championship shield with silver swirls.';
  const backImage = new Element('img', 'trophy-back-image');
  const imageModel = new Element('div', 'trophy-image-model');
  imageModel.append(flat, backImage);
  stage.append(imageModel);
  const loading = new Element('p', 'trophy-loading');
  const zoom = new Element('output', 'trophy-zoom-value');
  const status = new Element('p', 'trophy-view-status');
  new Element('p', 'trophy-accessible-engraving');
  new Element('p', 'trophy-controls-help');
  const plus = new Element('button', 'trophy-zoom-in');
  const minus = new Element('button', 'trophy-zoom-out');
  const reset = new Element('button', 'trophy-reset');
  const move = new Element('button', 'trophy-pan');
  const front = new Element('button'); front.dataset.trophyView = 'front';
  const back = new Element('button'); back.dataset.trophyView = 'back';
  const open = new Element('button');
  const players = new Element('ul');
  const team = new Element('p'); team.textContent = 'Smoke Spammers';
  const year = new Element('span'); year.textContent = '2025';
  const names = ['BRYAN', 'JAYRIES', 'JHIM', 'LLOYD', 'DEN'].map(name => { const el = new Element('li'); el.textContent = name; return el; });
  const document = {
    currentScript: { src: protocol === 'file' ? 'file:///ftap/trophy.js' : 'http://localhost/trophy.js' }, activeElement: open, head: new Element('head'),
    createElement: tag => tag === 'canvas' ? new Canvas() : new Element(tag),
    querySelector: selector => selector === '.champions-copy h3' ? team : selector === '.champions-year' ? year : nodes.get(selector),
    querySelectorAll: selector => ({
      '[data-trophy-team]': [team], '[data-trophy-year]': [year], '[data-trophy-view]': [front, back],
      '[data-trophy-open]': [open], '.champions-roster li': names, 'dialog[open]': dialog.open ? [dialog] : []
    })[selector] || []
  };
  class Renderer {
    constructor() {
      if (noWebGL) throw new Error('Simulated unavailable GPU');
      this.domElement = new Canvas();
      this.capabilities = { getMaxAnisotropy: () => 4 };
      renderers.push(this);
    }
    setPixelRatio() {} setClearColor() {}
    setSize(width, height) { this.domElement.width = width; this.domElement.height = height; }
    render(scene, camera) { this.scene = scene; this.camera = camera; this.renders = (this.renders || 0) + 1; }
  }
  context = vm.createContext({
    console, document, URL, performance: { now: () => time }, Uint8ClampedArray,
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    Image: class {
      constructor() { this.width = this.height = this.naturalWidth = this.naturalHeight = 1254; }
      set src(value) { this.value = value; queueMicrotask(() => this.onload?.()); }
      get src() { return this.value; }
    },
    ResizeObserver: class { constructor(callback) { resizeCallbacks.push(callback); } observe() {} },
    IntersectionObserver: class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }
  });
  context.window = context;
  context.devicePixelRatio = 1;
  context.matchMedia = () => ({ matches: true });
  vm.runInContext(shapeSource, context, { filename: 'aegis-shape.js' });
  context.FTAPAegisTextures = { front: 'data:image/webp;base64,front', back: 'data:image/webp;base64,back' };
  vm.runInContext(library, context, { filename: 'three-trophy.min.js' });
  context.FTAPThree = {
    ...context.FTAPThree,
    WebGLRenderer: Renderer,
    PMREMGenerator: class {
      fromEquirectangular(texture) { return { texture }; }
      dispose() {}
    }
  };
  vm.runInContext(source, context, { filename: 'trophy.js' });
  async function settle() {
    await new Promise(resolve => setImmediate(resolve));
    time += 600;
    const current = [...frames.values()]; frames.clear();
    current.forEach(callback => callback(time));
    await new Promise(resolve => setImmediate(resolve));
  }
  function resize(width, height) { stageSize = { width, height }; resizeCallbacks.forEach(callback => callback()); }
  return { document, nodes, contexts, renderers, preview, stage, dialog, open, front, back, plus, minus, reset, move, zoom, status, loading, flat, backImage, imageModel, settle, resize };
}

test('fits the default trophy view into portrait, landscape and desktop camera frames', async () => {
  const app = fixture();
  app.open.fire('click'); await app.settle();
  const renderer = app.renderers[0];
  for (const [width, height] of [[320, 400], [390, 540], [844, 250], [1440, 700]]) {
    app.resize(width, height); await app.settle();
    assert.equal(renderer.domElement.width, width);
    assert.equal(renderer.domElement.height, height);
    renderer.scene.updateMatrixWorld(true);
    renderer.camera.updateMatrixWorld(true);
    renderer.scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = mesh.position.clone().set(x, y, z).applyMatrix4(mesh.matrixWorld).project(renderer.camera);
        assert.ok(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1, 'the trophy should fit the default camera frame at ' + width + '×' + height);
      }
    });
  }
});

test('builds finite, dimensional geometry and paints the champion engraving', async () => {
  const app = fixture({ omitRollCall: true });
  app.open.fire('click');
  await app.settle();
  assert.equal(app.stage.classList.contains('is-ready'), true, 'the 3D engine should initialize');
  assert.equal(app.renderers.length, 1);
  const meshes = [];
  app.renderers[0].scene.traverse(object => { if (object.isMesh) meshes.push(object); });
  assert.ok(meshes.length > 15, 'the model should have dimensional edge, boss and stud details');
  const model = app.renderers[0].scene.children.find(object => object.isGroup);
  model.quaternion.identity();
  let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity, positionCount = 0;
  app.renderers[0].scene.updateMatrixWorld(true);
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    positionCount += position.count;
    for (const value of position.array) assert.ok(Number.isFinite(value), 'mesh positions must remain finite');
    const normal = mesh.geometry.getAttribute('normal');
    for (const value of normal.array) assert.ok(Number.isFinite(value), 'mesh normals must remain finite');
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = mesh.position.clone().set(x, y, z).applyMatrix4(mesh.matrixWorld);
      minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z);
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
    }
  }
  assert.ok(positionCount > 10000);
  assert.ok(maxZ - minZ > 0.1, 'the trophy should have physical depth');
  assert.ok((maxZ - minZ) / (maxX - minX) < 0.08, 'the edge and relief should keep the reference thin profile');
  const face = meshes.find(mesh => mesh.name === 'Aegis front relief');
  assert.ok(face.material.map.image.src.includes('data:image/webp'), 'the detailed artwork must be used on the visible front');
  assert.ok(face.material.alphaTest > 0, 'the trophy image must not render as a rectangular card');
  const expected = ['2025', 'Smoke Spammers', 'BRYAN', 'JAYRIES', 'JHIM', 'LLOYD', 'DEN'];
  const engravedSurfaces = app.contexts.filter(ctx => expected.every(text => ctx.texts.includes(text)));
  assert.equal(engravedSurfaces.length, 2, 'both the color and bump maps must engrave the complete winning team');
  for (const surface of engravedSurfaces) {
    for (const row of surface.textRuns) {
      const radius = Math.hypot(row.x - 1024, row.y - 984);
      assert.ok(radius >= 370 && radius <= 548, 'engraving must stay inside the silver annulus');
      assert.ok(Math.abs(row.x - 1024) < 2 && row.y < 984, 'the roster must occupy one panel, leaving the rest blank');
    }
    assert.equal(new Set(surface.texts).size, 7, 'there should be no filler text in future champion spaces');
    const rows = surface.textRuns.filter((row, index, runs) => runs.findIndex(other => other.text === row.text) === index);
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i].y - rows[i - 1].y >= 20, 'year, team and five names must have separate rows');
  }
});

test('HTTP pages load lossless WebP artwork while direct-file copies preserve the same bytes', async () => {
  const app = fixture({ protocol: 'http' });
  app.open.fire('click'); await app.settle();
  const meshes = [];
  app.renderers[0].scene.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh); });
  const face = meshes.find(mesh => mesh.name === 'Aegis front relief');
  assert.equal(face.material.map.image.src, 'http://localhost/assets/optimized/aegis-front-detailed.webp');
  const embedded = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/aegis-local-textures.js'), 'utf8'), embedded);
  for (const side of ['front', 'back']) {
    const dataURL = embedded.window.FTAPAegisTextures[side];
    assert.ok(dataURL.startsWith('data:image/webp;base64,'), 'direct-file textures must use the lossless WebP files');
    const filename = 'assets/optimized/aegis-' + side + '-detailed.webp';
    const original = fs.readFileSync(path.join(root, filename));
    const copy = Buffer.from(dataURL.split(',')[1], 'base64');
    assert.ok(copy.equals(original), 'file-view artwork must use identical texture bytes');
  }
});

test('opens, turns, zooms within limits, resets and restores the preview on close', async () => {
  const app = fixture();
  app.open.fire('click'); await app.settle();
  assert.equal(app.dialog.open, true);
  const renderer = app.renderers[0];
  assert.equal(renderer.domElement.parentElement, app.stage);
  const model = renderer.scene.children.find(object => object.isGroup);
  const original = model.quaternion.toArray();
  const down = app.stage.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
  assert.equal(down.defaultPrevented, true, 'native image dragging must not take over the gesture');
  assert.equal(app.stage.classList.contains('is-dragging'), true);
  assert.equal(app.stage.fire('dragstart').defaultPrevented, true);
  app.stage.fire('pointermove', { pointerId: 1, clientX: 180, clientY: 140 });
  app.stage.fire('pointerup', { pointerId: 1 });
  assert.equal(app.stage.classList.contains('is-dragging'), false);
  await app.settle();
  assert.notDeepEqual(model.quaternion.toArray(), original);
  assert.equal(app.status.textContent, 'Free rotation');
  app.back.fire('click'); await app.settle();
  assert.equal(app.back.getAttribute('aria-pressed'), 'true');
  assert.ok(Math.abs(model.quaternion.y) > 0.99, 'the back should face the camera');
  for (let i = 0; i < 30; i++) app.plus.fire('click');
  await app.settle();
  assert.equal(app.zoom.textContent, '250%');
  assert.equal(app.plus.disabled, true);
  for (let i = 0; i < 30; i++) app.minus.fire('click');
  await app.settle();
  assert.equal(app.zoom.textContent, '75%');
  assert.equal(app.minus.disabled, true);
  app.reset.fire('click'); await app.settle();
  assert.equal(app.zoom.textContent, '100%');
  assert.equal(app.front.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(model.quaternion.toArray(), original);
  app.dialog.close(); await app.settle();
  assert.equal(renderer.domElement.parentElement, app.preview);
  assert.equal(app.document.activeElement, app.open);
  app.open.fire('click'); await app.settle();
  assert.equal(app.renderers.length, 1, 'opening again must reuse the renderer');
});

test('selecting the engraved back during loading keeps that view when 3D becomes ready', async () => {
  const app = fixture();
  app.open.fire('click');
  app.back.fire('click');
  assert.match(app.imageModel.style.transform, /rotateY\(3\.14159/);
  await app.settle();
  assert.equal(app.stage.classList.contains('is-ready'), true);
  assert.equal(app.back.getAttribute('aria-pressed'), 'true');
  const model = app.renderers[0].scene.children.find(object => object.isGroup);
  assert.ok(Math.abs(model.quaternion.y) > 0.99);
});

test('handles pinch zoom, cancellation, wheel zoom and keyboard controls', async () => {
  const app = fixture();
  app.open.fire('click'); await app.settle();
  app.stage.fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 });
  app.stage.fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 });
  app.stage.fire('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 260, clientY: 100 });
  await app.settle();
  assert.equal(app.zoom.textContent, '160%');
  app.stage.fire('pointercancel', { pointerId: 1 });
  app.stage.fire('pointercancel', { pointerId: 2 });
  const model = app.renderers[0].scene.children.find(object => object.isGroup);
  const pose = model.quaternion.toArray();
  app.stage.fire('pointermove', { pointerId: 2, clientX: 400, clientY: 200 });
  await app.settle();
  assert.deepEqual(model.quaternion.toArray(), pose, 'cancelled pointers must not rotate the model');
  const wheel = app.stage.fire('wheel', { deltaY: 100 });
  assert.equal(wheel.defaultPrevented, true);
  await app.settle();
  assert.ok(parseInt(app.zoom.textContent) < 160);
  app.stage.fire('keydown', { key: 'ArrowLeft' }); await app.settle();
  assert.notDeepEqual(model.quaternion.toArray(), pose);
  app.stage.fire('keydown', { key: 'Home' }); await app.settle();
  assert.equal(app.zoom.textContent, '100%');
  assert.equal(app.front.getAttribute('aria-pressed'), 'true');
});

test('keeps mouse and touch rotation, both faces, zoom, reset and closing available without WebGL', async () => {
  const app = fixture({ noWebGL: true });
  app.open.fire('click'); await app.settle();
  assert.equal(app.dialog.open, true);
  assert.equal(app.stage.classList.contains('is-ready'), false);
  assert.equal(app.stage.classList.contains('is-image-ready'), true);
  assert.equal(app.flat.draggable, false);
  assert.equal(app.backImage.draggable, false);
  const frontPose = app.imageModel.style.transform;
  app.stage.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
  app.stage.fire('pointermove', { pointerId: 1, clientX: 500, clientY: 180 });
  app.stage.fire('pointerup', { pointerId: 1 });
  assert.notEqual(app.imageModel.style.transform, frontPose);
  assert.equal(app.status.textContent, 'Free rotation');
  assert.equal(app.front.getAttribute('aria-pressed'), 'false');
  app.stage.fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 200 });
  const dragPose = app.imageModel.style.transform;
  app.stage.fire('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 180, clientY: 350 });
  assert.notEqual(app.imageModel.style.transform, dragPose);
  app.stage.fire('pointercancel', { pointerId: 2 });
  const cancelledPose = app.imageModel.style.transform;
  app.stage.fire('pointermove', { pointerId: 2, clientX: 700, clientY: 700 });
  assert.equal(app.imageModel.style.transform, cancelledPose);
  app.back.fire('click'); await app.settle();
  assert.ok(app.backImage.src.startsWith('data:image/png'));
  assert.match(app.backImage.alt, /2025/); assert.match(app.backImage.alt, /Smoke Spammers/); assert.match(app.backImage.alt, /JAYRIES/);
  assert.match(app.imageModel.style.transform, /rotateY\(3\.14159/);
  app.stage.fire('keydown', { key: 'ArrowDown' });
  assert.match(app.imageModel.style.transform, /rotateX\(0\.192rad\)/);
  app.plus.fire('click');
  assert.match(app.imageModel.style.transform, /scale\(1\.2\)/);
  app.resize(320, 500);
  assert.equal(app.imageModel.style.width, '284px');
  app.reset.fire('click');
  assert.equal(app.imageModel.style.transform, frontPose);
  app.dialog.close();
  assert.equal(app.dialog.open, false);
  assert.equal(app.document.activeElement, app.open);
  app.open.fire('click'); await app.settle();
  assert.ok(app.flat.src.includes('data:image/webp'));
  assert.match(app.flat.alt, /Front/);
});

test('dragging while artwork loads carries the rotation into the ready 3D view', async () => {
  const app = fixture();
  app.open.fire('click');
  app.back.fire('click');
  app.stage.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
  app.stage.fire('pointermove', { pointerId: 1, clientX: 160, clientY: 125 });
  const photoPose = app.imageModel.style.transform;
  assert.equal(app.status.textContent, 'Free rotation');
  await app.settle();
  const model = app.renderers[0].scene.children.find(object => object.isGroup);
  assert.ok(Math.abs(model.quaternion.y) < 0.99 && Math.abs(model.quaternion.y) > 0.9, 'loading must preserve the back view plus the user drag');
  assert.equal(app.imageModel.style.transform, photoPose);
  assert.equal(app.status.textContent, 'Free rotation');
  app.dialog.close();
  assert.equal(app.stage.classList.contains('is-dragging'), false);
});

test('Move mode, shift-drag and two-finger gestures reposition zoomed trophies in both renderers', async () => {
  for (const noWebGL of [false, true]) {
    const app = fixture({ noWebGL });
    app.open.fire('click'); await app.settle();
    const model = app.renderers[0]?.scene.children.find(object => object.isGroup);
    const position = () => model ? model.position.toArray() : [app.imageModel.style.left, app.imageModel.style.top];
    const original = position();
    const rotation = model ? model.quaternion.toArray() : app.imageModel.style.transform;
    app.move.fire('click');
    assert.equal(app.move.getAttribute('aria-pressed'), 'true');
    app.stage.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    app.stage.fire('pointermove', { pointerId: 1, clientX: 175, clientY: 160 });
    app.stage.fire('pointerup', { pointerId: 1 });
    assert.notDeepEqual(position(), original);
    assert.deepEqual(model ? model.quaternion.toArray() : app.imageModel.style.transform, rotation, 'Move mode must pan without rotating');
    app.reset.fire('click');
    assert.deepEqual(position(), original);
    assert.equal(app.move.getAttribute('aria-pressed'), 'false');
    app.plus.fire('click');
    app.stage.fire('pointerdown', { pointerId: 2, clientX: 100, clientY: 100, shiftKey: true });
    app.stage.fire('pointermove', { pointerId: 2, clientX: 150, clientY: 180, shiftKey: true });
    app.stage.fire('pointerup', { pointerId: 2 });
    assert.notDeepEqual(position(), original, 'shift-drag must reposition the zoomed view');
    app.front.fire('click');
    assert.deepEqual(position(), original, 'view buttons must recenter the trophy');
    for (const [pointerId, clientX] of [[3, 100], [4, 200]]) app.stage.fire('pointerdown', { pointerId, pointerType: 'touch', clientX, clientY: 100 });
    for (const [pointerId, clientX] of [[3, 130], [4, 230]]) app.stage.fire('pointermove', { pointerId, pointerType: 'touch', clientX, clientY: 150 });
    assert.notDeepEqual(position(), original, 'two-finger movement must pan as well as pinch');
    app.dialog.close(); await app.settle();
    assert.deepEqual(position(), original, 'closing must recenter the preview');
  }
});
