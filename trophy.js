/* Alpha-traced Aegis geometry with detailed local artwork and live champion engraving. */
(() => {
  'use strict';
  const section = document.querySelector('#trophy');
  const dialog = document.querySelector('#trophy-dialog');
  if (!section || !dialog) return;
  const preview = document.querySelector('#trophy-preview-stage');
  const stage = document.querySelector('#trophy-stage');
  const flatImage = document.querySelector('#trophy-flat-image');
  const loading = document.querySelector('#trophy-loading');
  const zoomValue = document.querySelector('#trophy-zoom-value');
  const status = document.querySelector('#trophy-view-status');
  const viewButtons = [...document.querySelectorAll('[data-trophy-view]')];
  const baseURL = new URL('.', document.currentScript.src);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const identity = {
    team: clean(document.querySelector('.champions-copy h3')?.textContent) || 'Smoke Spammers',
    year: clean(document.querySelector('.champions-year')?.textContent) || '2025',
    players: [...document.querySelectorAll('.champions-roster li')].map(el => clean(el.textContent))
  };
  if (!identity.players.length) identity.players = ['Bryan', 'Jayries', 'Jhim', 'Lloyd', 'Den'];
  document.querySelectorAll('[data-trophy-team]').forEach(el => { el.textContent = identity.team; });
  document.querySelectorAll('[data-trophy-year]').forEach(el => { el.textContent = identity.year; });
  const rollCall = section.querySelector('[data-trophy-players]');
  rollCall.replaceChildren(...identity.players.map(name => {
    const item = document.createElement('li');
    item.textContent = name;
    return item;
  }));
  document.querySelector('#trophy-accessible-engraving').textContent = 'Engraved: ' + identity.year + ', ' + identity.team + ', ' + identity.players.join(', ') + '.';
  stage.setAttribute('aria-label', 'Interactive ' + identity.team + ' championship trophy');

  let engine = null;
  let initialization = null;
  let fallback = false;
  let artwork = null;
  let lastFocus = null;
  let currentSide = 'front';
  let zoom = 1;
  const pointers = new Map();
  let pinchDistance = 0;

  function updateZoom() {
    zoomValue.textContent = Math.round(zoom * 100) + '%';
    document.querySelector('#trophy-zoom-out').disabled = zoom <= 0.75;
    document.querySelector('#trophy-zoom-in').disabled = zoom >= 2.5;
  }
  function announceSide(side) {
    currentSide = side;
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.trophyView === side)));
    status.textContent = side === 'front' ? 'Front view' : side === 'back' ? 'Engraving view. ' + identity.players.join(', ') + '.' : 'Free rotation';
  }
  function setZoom(value) {
    zoom = Math.max(0.75, Math.min(2.5, value));
    if (engine) engine.setZoom(zoom);
    else flatImage.style.transform = 'scale(' + zoom + ')';
    updateZoom();
  }
  function backImageURL() {
    return artwork ? artwork.backSurface.toDataURL('image/png') : new URL('assets/aegis-back-detailed.png', baseURL).href;
  }
  function showSide(side, animate = true) {
    announceSide(side);
    if (engine) engine.setView(side, animate && !reducedMotion.matches);
    else {
      flatImage.src = side === 'back' ? backImageURL() : artwork ? artwork.front.src : new URL('assets/aegis-front-detailed.png', baseURL).href;
      flatImage.alt = side === 'back' ? 'Back of the trophy, engraved with ' + identity.year + ', ' + identity.team + ', ' + identity.players.join(', ') + '.' : 'Front of the bronze and silver championship trophy.';
    }
  }
  function loadThree() {
    if (window.FTAPThree) return Promise.resolve(window.FTAPThree);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('assets/vendor/three-trophy.min.js', baseURL).href;
      script.onload = () => window.FTAPThree ? resolve(window.FTAPThree) : reject(new Error('Trophy library unavailable'));
      script.onerror = () => reject(new Error('Trophy library unavailable'));
      document.head.append(script);
    });
  }
  function loadScript(filename, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(filename, baseURL).href;
      script.onload = () => ready() ? resolve() : reject(new Error('Aegis asset unavailable'));
      script.onerror = () => reject(new Error('Aegis asset unavailable'));
      document.head.append(script);
    });
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Aegis image unavailable'));
      image.src = url;
    });
  }
  function paintEngraving(image, bump = false) {
    const surface = document.createElement('canvas');
    surface.width = surface.height = 2048;
    const ctx = surface.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, 2048, 2048);
    function arc(text, radius, fontSize, bottom) {
      ctx.font = fontSize + 'px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const letters = [...text], widths = letters.map(letter => ctx.measureText(letter).width + 1.4);
      const span = widths.reduce((sum, width) => sum + width, 0) / radius;
      let angle = bottom ? Math.PI / 2 + span / 2 : -Math.PI / 2 - span / 2;
      const direction = bottom ? -1 : 1;
      letters.forEach((letter, index) => {
        angle += direction * widths[index] / radius / 2;
        ctx.save();
        ctx.translate(1024 + Math.cos(angle) * radius, 984 + Math.sin(angle) * radius);
        ctx.rotate(angle + (bottom ? -Math.PI / 2 : Math.PI / 2));
        if (!bump) { ctx.fillStyle = '#dfd5c2'; ctx.fillText(letter, 0.8, 1.1); }
        ctx.fillStyle = bump ? '#171717' : '#41372d';
        ctx.fillText(letter, 0, 0);
        ctx.restore();
        angle += direction * widths[index] / radius / 2;
      });
    }
    arc(identity.year + '  /  ' + identity.team.toUpperCase(), 505, 52, false);
    arc(identity.players.join('  ·  ').toUpperCase(), 435, 39, false);
    arc('YEAR-END CIVIL WAR', 505, 36, true);
    return surface;
  }
  async function loadArtwork() {
    await loadScript('assets/aegis-shape.js', () => !!window.FTAPAegisShape);
    let frontURL = new URL('assets/aegis-front-detailed.png', baseURL).href;
    let backURL = new URL('assets/aegis-back-detailed.png', baseURL).href;
    // File-origin images cannot be uploaded to WebGL in every browser.
    // Embedded, unchanged copies avoid that restriction for direct index.html opening.
    if (baseURL.protocol === 'file:') {
      await loadScript('assets/aegis-local-textures.js', () => !!window.FTAPAegisTextures);
      frontURL = window.FTAPAegisTextures.front;
      backURL = window.FTAPAegisTextures.back;
    }
    const [front, back] = await Promise.all([loadImage(frontURL), loadImage(backURL)]);
    artwork = { shape: window.FTAPAegisShape, front, back, backSurface: paintEngraving(back), backBump: paintEngraving(back, true) };
    const previewImage = preview.querySelector('img');
    if (previewImage) previewImage.src = front.src;
    if (fallback && dialog.open) showSide(currentSide, false);
    return artwork;
  }
  function mountEngine() {
    if (!engine) return;
    const target = dialog.open ? stage : preview;
    target.append(engine.canvas);
    preview.classList.add('is-ready');
    stage.classList.add('is-ready');
    engine.resize(target);
  }
  function ensureEngine() {
    if (initialization) return initialization;
    initialization = Promise.all([loadThree(), loadArtwork()]).then(([THREE, art]) => {
      engine = createEngine(THREE, art);
      mountEngine();
      engine.setView(currentSide, false);
      engine.setZoom(zoom);
      return engine;
    }).catch(() => {
      fallback = true;
      loading.textContent = 'Image view · 3D is unavailable on this device.';
      document.querySelector('#trophy-controls-help').textContent = 'Use Front and Engraving to turn the trophy · Zoom controls · Esc to close';
      const label = document.querySelector('.trophy-preview-label');
      if (label) label.textContent = 'Championship trophy';
      showSide(currentSide, false);
      return null;
    });
    return initialization;
  }
  function openTrophy() {
    if (dialog.open) return;
    lastFocus = document.activeElement;
    document.querySelectorAll('dialog[open]').forEach(item => item.close());
    zoom = 1;
    updateZoom();
    flatImage.style.transform = '';
    dialog.showModal();
    stage.focus({ preventScroll: true });
    if (engine) {
      mountEngine();
      engine.setZoom(1);
    }
    showSide('front', false);
    if (!engine) ensureEngine();
  }
  document.querySelectorAll('[data-trophy-open]').forEach(button => button.addEventListener('click', openTrophy));
  dialog.addEventListener('close', () => {
    pointers.clear();
    pinchDistance = 0;
    if (engine) {
      engine.cancelAnimation();
      preview.append(engine.canvas);
      engine.setView('front', false);
      engine.setZoom(1);
      engine.resize(preview);
    }
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  });
  viewButtons.forEach(button => button.addEventListener('click', () => showSide(button.dataset.trophyView)));
  document.querySelector('#trophy-reset').addEventListener('click', () => { setZoom(1); showSide('front'); });
  document.querySelector('#trophy-zoom-in').addEventListener('click', () => setZoom(zoom + 0.2));
  document.querySelector('#trophy-zoom-out').addEventListener('click', () => setZoom(zoom - 0.2));
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    setZoom(zoom * Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.0025));
  }, { passive: false });
  function pointerDistance() {
    const values = [...pointers.values()];
    return values.length < 2 ? 0 : Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    pinchDistance = pointerDistance();
    stage.focus({ preventScroll: true });
  });
  stage.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) {
      const distance = pointerDistance();
      if (pinchDistance > 0) setZoom(zoom * distance / pinchDistance);
      pinchDistance = distance;
    } else if (engine && (Math.abs(dx) + Math.abs(dy) > 0)) {
      engine.rotate(dx, dy);
      announceSide('free');
    }
  });
  function releasePointer(event) {
    pointers.delete(event.pointerId);
    pinchDistance = pointerDistance();
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => stage.addEventListener(type, releasePointer));
  stage.addEventListener('keydown', event => {
    const rotations = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
    if (rotations[event.key]) {
      event.preventDefault();
      if (engine) { engine.rotate(...rotations[event.key]); announceSide('free'); }
      else if (fallback) showSide(currentSide === 'front' ? 'back' : 'front', false);
    } else if (['+', '=', '-', '0', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0' || event.key === 'Home') { setZoom(1); showSide('front'); }
      else setZoom(zoom + (event.key === '-' ? -0.2 : 0.2));
    }
  });
  const resizeObserver = new ResizeObserver(() => {
    if (engine) engine.resize(dialog.open ? stage : preview);
  });
  resizeObserver.observe(preview);
  resizeObserver.observe(stage);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); ensureEngine(); }
    }, { rootMargin: '400px' });
    observer.observe(preview);
  } else ensureEngine();
  updateZoom();

  function createEngine(T, art) {
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.className = 'trophy-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
    const trophy = new T.Group();
    trophy.position.y = -0.03;
    scene.add(trophy);
    const frontQuaternion = new T.Quaternion().setFromEuler(new T.Euler(-0.08, -0.2, 0.02));
    const backQuaternion = new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI, 0));
    trophy.quaternion.copy(frontQuaternion);
    let animation = 0, renderFrame = 0, baseDistance = 9, modelZoom = 1;
    function render() { renderer.render(scene, camera); }
    function scheduleRender() {
      if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = 0; render(); });
    }
    function cancelAnimation() { cancelAnimationFrame(animation); animation = 0; }
    function setView(side, animate) {
      cancelAnimation();
      const target = side === 'back' ? backQuaternion : frontQuaternion;
      if (!animate) { trophy.quaternion.copy(target); scheduleRender(); return; }
      const start = trophy.quaternion.clone();
      const startedAt = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - startedAt) / 480);
        trophy.quaternion.slerpQuaternions(start, target, 1 - Math.pow(1 - progress, 3));
        render();
        if (progress < 1) animation = requestAnimationFrame(tick);
        else animation = 0;
      }
      animation = requestAnimationFrame(tick);
    }
    function setZoom(value) {
      modelZoom = value;
      camera.position.z = baseDistance / modelZoom;
      scheduleRender();
    }
    function resize(target) {
      const bounds = target.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
      const span = Math.max(art.shape.height, art.shape.width / camera.aspect);
      baseDistance = span * 1.18 / (2 * Math.tan(camera.fov * Math.PI / 360)) + 0.2;
      camera.position.set(0, 0.06, baseDistance / modelZoom);
      camera.lookAt(0, 0, 0);
      renderer.setSize(Math.round(bounds.width), Math.round(bounds.height));
      scheduleRender();
    }
    function texture(image, color = false) {
      const map = new T.CanvasTexture(image);
      if (color) map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      return map;
    }
    function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
      const object = new T.Mesh(geometry, material);
      object.position.set(x, y, z);
      parent.add(object);
      return object;
    }
    const bronze = new T.MeshStandardMaterial({ color: 0x51412c, metalness: 0.88, roughness: 0.42 });
    const bronzeEdge = new T.MeshStandardMaterial({ color: 0x8d744c, metalness: 0.92, roughness: 0.33 });
    const outline = new T.Shape();
    art.shape.outline.forEach(([x, y], index) => index ? outline.lineTo(x, y) : outline.moveTo(x, y));
    outline.closePath();
    const bodyGeometry = new T.ExtrudeGeometry(outline, {
      depth: 0.11, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009,
      bevelSegments: 2, steps: 1, curveSegments: 16
    });
    bodyGeometry.translate(0, 0, -0.055);
    mesh(bodyGeometry, bronze, trophy).name = 'Aegis bronze edge';
    const front = new T.Group(), back = new T.Group();
    back.rotation.y = Math.PI;
    trophy.add(front, back);
    const points = outline.getSpacedPoints(240).slice(0, -1);
    for (const z of [-0.053, 0.005, 0.053]) {
      const edge = new T.CatmullRomCurve3(points.map(point => new T.Vector3(point.x, point.y, z)), true);
      mesh(new T.TubeGeometry(edge, 240, z === 0.005 ? 0.003 : 0.006, 5, true), bronzeEdge, trophy);
    }

    // Fine, subdivided faces support shallow displacement; alpha follows the original art.
    function surfaceGeometry(info) {
      const width = art.shape.width, height = art.shape.height, steps = 144;
      const geometry = new T.RingGeometry(0, 1, 3, 1);
      const positions = [], uvs = [], indices = [];
      for (let row = 0; row <= steps; row++) {
        const y = (row / steps - 0.5) * height;
        for (let column = 0; column <= steps; column++) {
          const x = (column / steps - 0.5) * width;
          positions.push(x, y, 0);
          uvs.push(x * info.uvScale[0] + info.uvOffset[0], y * info.uvScale[1] + info.uvOffset[1]);
          if (row < steps && column < steps) {
            const a = row * (steps + 1) + column, b = a + 1, c = a + steps + 1, d = c + 1;
            indices.push(a, b, c, b, d, c);
          }
        }
      }
      const Attribute = geometry.getAttribute('position').constructor;
      geometry.setAttribute('position', new Attribute(positions, 3));
      geometry.setAttribute('uv', new Attribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.deleteAttribute('normal');
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      return geometry;
    }
    function faceMaterial(colorImage, bumpImage) {
      return new T.MeshStandardMaterial({
        color: 0xffffff, map: texture(colorImage, true), bumpMap: texture(bumpImage),
        bumpScale: 0.015, displacementMap: texture(bumpImage), displacementScale: 0.016,
        metalness: 0.55, roughness: 0.48, envMapIntensity: 0.65,
        alphaTest: 0.35, alphaToCoverage: true
      });
    }
    const frontMaterial = faceMaterial(art.front, art.front);
    const backMaterial = faceMaterial(art.backSurface, art.backBump);
    mesh(surfaceGeometry(art.shape.front), frontMaterial, front, 0, 0, 0.071).name = 'Aegis front relief';
    mesh(surfaceGeometry(art.shape.back), backMaterial, back, 0, 0, 0.071).name = 'Aegis engraved back';

    // The central boss and studs have real depth and sample the same aligned artwork.
    function dome(radius, height, x, y, parent, info, material) {
      const geometry = new T.RingGeometry(0, radius, 64, 12);
      const positions = geometry.getAttribute('position'), uvs = geometry.getAttribute('uv');
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i), py = positions.getY(i);
        const distance = Math.min(1, Math.hypot(px, py) / radius);
        positions.setXYZ(i, px, py, height * (1 - distance * distance) + 0.019);
        uvs.setXY(i, (px + x) * info.uvScale[0] + info.uvOffset[0], (py + y) * info.uvScale[1] + info.uvOffset[1]);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const shapedMaterial = material.clone();
      shapedMaterial.displacementMap = null;
      mesh(geometry, shapedMaterial, parent, x, y, 0.071);
    }
    dome(0.40, 0.13, 0, 0.14, front, art.shape.front, frontMaterial);
    dome(0.13, 0.035, 0, 2.25, front, art.shape.front, frontMaterial);
    for (const [x, y] of [[-2.16, -0.20], [2.16, -0.20], [-1.15, -1.80], [1.15, -1.80]]) {
      dome(0.17, 0.06, x, y, front, art.shape.front, frontMaterial);
    }
    dome(0.98, 0.016, 0.02, 0.10, back, art.shape.back, backMaterial);
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 6;
      dome(0.031, 0.018, Math.cos(angle) * 1.52 + 0.02, Math.sin(angle) * 1.52 + 0.10, back, art.shape.back, backMaterial);
    }
    const environmentCanvas = document.createElement('canvas');
    environmentCanvas.width = 1024; environmentCanvas.height = 512;
    const env = environmentCanvas.getContext('2d');
    env.fillStyle = '#252a32'; env.fillRect(0, 0, 1024, 512);
    for (const light of [[180, 120, 220, '#d8d6d0'], [710, 140, 180, '#bbc4d0'], [480, 400, 160, '#65605a']]) {
      const gradient = env.createRadialGradient(light[0], light[1], 0, light[0], light[1], light[2]);
      gradient.addColorStop(0, light[3]); gradient.addColorStop(1, '#252a32');
      env.fillStyle = gradient; env.fillRect(light[0] - light[2], light[1] - light[2], light[2] * 2, light[2] * 2);
    }
    const environmentTexture = new T.CanvasTexture(environmentCanvas);
    environmentTexture.colorSpace = T.SRGBColorSpace;
    environmentTexture.mapping = T.EquirectangularReflectionMapping;
    const pmrem = new T.PMREMGenerator(renderer);
    const environment = pmrem.fromEquirectangular(environmentTexture);
    scene.environment = environment.texture;
    environmentTexture.dispose(); pmrem.dispose();
    scene.add(new T.HemisphereLight(0xe6e5df, 0x161b20, 1.2));
    const key = new T.DirectionalLight(0xfff5e8, 2.1); key.position.set(-4, 6, 8); scene.add(key);
    const fill = new T.DirectionalLight(0xc4cddd, 1.3); fill.position.set(5, 1, 5); scene.add(fill);
    const rim = new T.DirectionalLight(0xc1b5ce, 1.4); rim.position.set(2, 4, -5); scene.add(rim);
    return {
      canvas: renderer.domElement, resize, setZoom, setView, cancelAnimation,
      rotate(dx, dy) {
        cancelAnimation();
        const rotation = new T.Quaternion().setFromEuler(new T.Euler(dy * 0.008, dx * 0.008, 0));
        trophy.quaternion.premultiply(rotation).normalize();
        scheduleRender();
      }
    };
  }
})();
