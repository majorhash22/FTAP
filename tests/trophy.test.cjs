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

function fixture({ noWebGL = false } = {}) {
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
    querySelector(selector) { return this === section && selector === '[data-trophy-players]' ? players : null; }
  }
  class Canvas extends Element {
    constructor() {
      super('canvas');
      const ctx = {
        texts: [], fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        bezierCurveTo() {}, arc() {}, translate() {}, rotate() {}, save() {}, restore() {},
        putImageData() {}, createPattern() { return {}; }, createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
        createRadialGradient() { return { addColorStop() {} }; },
        measureText(text) { return { width: String(text).length * parseFloat(this.font || '10') * 0.55 }; },
        fillText(text) { this.texts.push(text); }
      };
      this.getContext = () => ctx;
      contexts.push(ctx);
    }
  }
  const section = new Element('section', 'trophy');
  const dialog = new Element('dialog', 'trophy-dialog');
  const preview = new Element('span', 'trophy-preview-stage');
  const stage = new Element('div', 'trophy-stage');
  const flat = new Element('img', 'trophy-flat-image');
  const loading = new Element('p', 'trophy-loading');
  const zoom = new Element('output', 'trophy-zoom-value');
  const status = new Element('p', 'trophy-view-status');
  new Element('p', 'trophy-accessible-engraving');
  new Element('p', 'trophy-controls-help');
  const plus = new Element('button', 'trophy-zoom-in');
  const minus = new Element('button', 'trophy-zoom-out');
  const reset = new Element('button', 'trophy-reset');
  const front = new Element('button'); front.dataset.trophyView = 'front';
  const back = new Element('button'); back.dataset.trophyView = 'back';
  const open = new Element('button');
  const players = new Element('ul');
  const team = new Element('p'); team.textContent = 'Smoke Spammers';
  const year = new Element('span'); year.textContent = '2025';
  const names = ['BRYAN', 'JAYRIES', 'JHIM', 'LLOYD', 'DEN'].map(name => { const el = new Element('li'); el.textContent = name; return el; });
  const document = {
    currentScript: { src: 'file:///ftap/trophy.js' }, activeElement: open, head: new Element('head'),
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
    ResizeObserver: class { constructor(callback) { resizeCallbacks.push(callback); } observe() {} },
    IntersectionObserver: class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }
  });
  context.window = context;
  context.devicePixelRatio = 1;
  context.matchMedia = () => ({ matches: true });
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
  return { document, nodes, contexts, renderers, preview, stage, dialog, open, front, back, plus, minus, reset, zoom, status, loading, flat, settle, resize };
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
  const app = fixture();
  app.open.fire('click');
  await app.settle();
  assert.equal(app.stage.classList.contains('is-ready'), true, 'the 3D engine should initialize');
  assert.equal(app.renderers.length, 1);
  const meshes = [];
  app.renderers[0].scene.traverse(object => { if (object.isMesh) meshes.push(object); });
  assert.ok(meshes.length > 25, 'the model should have actual frame and face detail');
  let minZ = Infinity, maxZ = -Infinity, positionCount = 0;
  app.renderers[0].scene.updateMatrixWorld(true);
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    positionCount += position.count;
    for (const value of position.array) assert.ok(Number.isFinite(value), 'mesh positions must remain finite');
    const normal = mesh.geometry.getAttribute('normal');
    for (const value of normal.array) assert.ok(Number.isFinite(value), 'mesh normals must remain finite');
    mesh.geometry.computeBoundingBox();
    minZ = Math.min(minZ, mesh.geometry.boundingBox.min.z + mesh.position.z);
    maxZ = Math.max(maxZ, mesh.geometry.boundingBox.max.z + mesh.position.z);
  }
  assert.ok(positionCount > 10000);
  assert.ok(maxZ - minZ > 0.3, 'the trophy should have depth');
  const paintedText = app.contexts.map(ctx => ctx.texts.join('').replace(/\s+/g, ' '));
  assert.ok(paintedText.some(text => text.includes('2025 / SMOKE SPAMMERS') && ['BRYAN', 'JAYRIES', 'JHIM', 'LLOYD', 'DEN'].every(name => text.includes(name))), 'the engraved texture should contain the year, team and all five names');
});

test('opens, turns, zooms within limits, resets and restores the preview on close', async () => {
  const app = fixture();
  app.open.fire('click'); await app.settle();
  assert.equal(app.dialog.open, true);
  const renderer = app.renderers[0];
  assert.equal(renderer.domElement.parentElement, app.stage);
  const model = renderer.scene.children.find(object => object.isGroup);
  const original = model.quaternion.toArray();
  app.stage.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
  app.stage.fire('pointermove', { pointerId: 1, clientX: 180, clientY: 140 });
  app.stage.fire('pointerup', { pointerId: 1 });
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

test('keeps front, engraving and close behavior available when 3D cannot initialize', async () => {
  const app = fixture({ noWebGL: true });
  app.open.fire('click'); await app.settle();
  assert.equal(app.dialog.open, true);
  assert.equal(app.stage.classList.contains('is-ready'), false);
  assert.match(app.loading.textContent, /Image view/);
  app.back.fire('click'); await app.settle();
  assert.ok(app.flat.src.startsWith('data:image/svg+xml'));
  const svg = decodeURIComponent(app.flat.src.split(',').slice(1).join(','));
  assert.match(svg, /2025/); assert.match(svg, /SMOKE SPAMMERS/); assert.match(svg, /JAYRIES/);
  app.dialog.close();
  assert.equal(app.dialog.open, false);
  assert.equal(app.document.activeElement, app.open);
  app.open.fire('click'); await app.settle();
  assert.ok(app.flat.src.endsWith('assets/trophy-front.svg'));
  assert.match(app.flat.alt, /Front/);
});
