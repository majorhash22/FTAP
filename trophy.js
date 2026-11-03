/* A procedural, reference-inspired trophy. No model downloads or external textures are needed. */
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
  function escapeXML(value) {
    return String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
  }
  function backImageURL() {
    const title = escapeXML(identity.year + ' · ' + identity.team.toUpperCase());
    const names = escapeXML(identity.players.join(' · ').toUpperCase());
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 620"><defs>' +
      '<linearGradient id="b" x2="1" y2="1"><stop stop-color="#d0b37d"/><stop offset=".4" stop-color="#765b36"/><stop offset="1" stop-color="#b68c50"/></linearGradient>' +
      '<linearGradient id="s" x2="1" y2="1"><stop stop-color="#e5e0d1"/><stop offset=".4" stop-color="#aaa69a"/><stop offset="1" stop-color="#706a60"/></linearGradient>' +
      '<path id="a" d="M124 290a176 176 0 0 1 352 0"/><path id="n" d="M151 290a149 149 0 0 1 298 0"/>' +
      '<pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0l14 14M7 0l7 7M0 7l7 7" stroke="#3e4444" stroke-width="3"/></pattern></defs>' +
      '<path d="M300 28C432 28 550 125 554 256c2 40-44 15-64 57-19 39-18 126-35 162-65 43-245 43-310 0-17-36-16-123-35-162-20-42-66-17-64-57C50 125 168 28 300 28Z" fill="url(#b)" stroke="#c8a977" stroke-width="4"/>' +
      '<path d="M300 55C417 55 518 143 522 257c-43 1-56 18-64 47-18 42-16 113-32 150-58 33-194 33-252 0-16-37-14-108-32-150-8-29-21-46-64-47C82 143 183 55 300 55Z" fill="#1a2020"/>' +
      '<circle cx="300" cy="282" r="207" fill="url(#p)"/><circle cx="300" cy="282" r="179" fill="url(#s)" stroke="#57442b" stroke-width="9"/>' +
      '<circle cx="300" cy="282" r="114" fill="#777166" stroke="#51432f" stroke-width="8"/><circle cx="300" cy="282" r="105" fill="url(#s)"/>' +
      '<text fill="#4a3b26" font-family="Georgia,serif" font-size="17" font-weight="bold"><textPath href="#a" startOffset="50%" text-anchor="middle">' + title + '</textPath></text>' +
      '<text fill="#51432f" font-family="Georgia,serif" font-size="11"><textPath href="#n" startOffset="50%" text-anchor="middle">' + names + '</textPath></text>' +
      '<text x="300" y="295" fill="#55442c" text-anchor="middle" font-size="35" font-family="Georgia,serif">FTAP</text>' +
      '<text x="300" y="430" fill="#4a3b26" text-anchor="middle" font-size="12" font-family="Georgia,serif">YEAR-END CIVIL WAR</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function showSide(side, animate = true) {
    announceSide(side);
    if (engine) engine.setView(side, animate && !reducedMotion.matches);
    else {
      flatImage.src = side === 'back' ? backImageURL() : new URL('assets/trophy-front.svg', baseURL).href;
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
    initialization = loadThree().then(THREE => {
      engine = createEngine(THREE, identity);
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

  function createEngine(T, engraving) {
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
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
      baseDistance = Math.max(8.9, 8.9 / camera.aspect);
      camera.position.set(0, 0.06, baseDistance / modelZoom);
      camera.lookAt(0, 0, 0);
      renderer.setSize(Math.round(bounds.width), Math.round(bounds.height));
      scheduleRender();
    }
    let seed = 2025;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
    function canvas(size, paint) {
      const surface = document.createElement('canvas');
      surface.width = surface.height = size;
      const context = surface.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      paint(context, size);
      return surface;
    }
    function grain(context, size, base, amplitude) {
      const pixels = context.createImageData(size, size);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const noise = (random() - 0.5) * amplitude;
        pixels.data[i] = base[0] + noise;
        pixels.data[i + 1] = base[1] + noise;
        pixels.data[i + 2] = base[2] + noise;
        pixels.data[i + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
      for (let y = 0; y < size; y += 2) {
        context.strokeStyle = 'rgba(255,255,255,' + random() * 0.09 + ')';
        context.beginPath(); context.moveTo(0, y); context.lineTo(size, y + random() * 2); context.stroke();
      }
    }
    function texture(surface, color = false) {
      const map = new T.CanvasTexture(surface);
      if (color) map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      return map;
    }
    const scratches = texture(canvas(512, (ctx, size) => grain(ctx, size, [130, 130, 130], 55)));
    scratches.wrapS = scratches.wrapT = T.RepeatWrapping;
    scratches.repeat.set(0.7, 0.7);
    const bronze = new T.MeshStandardMaterial({ color: 0x9f7943, metalness: 0.9, roughness: 0.36, bumpMap: scratches, bumpScale: 0.018 });
    const bronzeEdge = new T.MeshStandardMaterial({ color: 0xc4a16a, metalness: 0.92, roughness: 0.26, bumpMap: scratches, bumpScale: 0.009 });
    const bronzeDark = new T.MeshStandardMaterial({ color: 0x5b4227, metalness: 0.82, roughness: 0.45 });
    const dark = new T.MeshStandardMaterial({ color: 0x242a28, metalness: 0.35, roughness: 0.76, bumpMap: scratches, bumpScale: 0.035 });
    const silverEtch = texture(canvas(512, (ctx, size) => {
      grain(ctx, size, [160, 160, 160], 50);
      ctx.lineWidth = 2;
      for (let i = 0; i < 85; i++) {
        const x = random() * size, y = random() * size, radius = 8 + random() * 30;
        ctx.strokeStyle = random() > 0.5 ? '#707070' : '#c4c4c4';
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * (0.8 + random())); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - radius, y); ctx.bezierCurveTo(x, y - radius, x + radius, y + radius, x, y + radius * 1.5); ctx.stroke();
      }
    }));
    silverEtch.wrapS = silverEtch.wrapT = T.RepeatWrapping;
    silverEtch.repeat.set(0.7, 0.7);
    const silver = new T.MeshStandardMaterial({ color: 0xbab7ab, metalness: 0.93, roughness: 0.4, bumpMap: silverEtch, bumpScale: 0.04 });
    const steel = new T.MeshStandardMaterial({ color: 0x8d918b, metalness: 0.95, roughness: 0.27, bumpMap: scratches, bumpScale: 0.008 });
    function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
      const object = new T.Mesh(geometry, material);
      object.position.set(x, y, z);
      parent.add(object);
      return object;
    }
    function shieldShape() {
      const shape = new T.Shape();
      shape.moveTo(0, 2.5);
      shape.bezierCurveTo(1.38, 2.5, 2.45, 1.62, 2.52, 0.48);
      shape.bezierCurveTo(2.56, -0.12, 2.13, -0.02, 1.92, -0.37);
      shape.bezierCurveTo(1.7, -0.98, 1.66, -1.8, 1.55, -2.07);
      shape.bezierCurveTo(0.7, -2.48, -0.7, -2.48, -1.55, -2.07);
      shape.bezierCurveTo(-1.66, -1.8, -1.7, -0.98, -1.92, -0.37);
      shape.bezierCurveTo(-2.13, -0.02, -2.56, -0.12, -2.52, 0.48);
      shape.bezierCurveTo(-2.45, 1.62, -1.38, 2.5, 0, 2.5);
      return shape;
    }
    function extrude(shape, depth, bevel) {
      return new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 32 });
    }
    const outline = shieldShape();
    const body = extrude(outline, 0.26, 0.065);
    body.translate(0, 0, -0.13);
    mesh(body, bronze, trophy);
    const front = new T.Group(), back = new T.Group();
    back.rotation.y = Math.PI;
    trophy.add(front, back);
    const innerGeometry = extrude(outline, 0.02, 0.022);
    const pathPoints = outline.getSpacedPoints(144).slice(0, -1);
    for (const face of [front, back]) {
      const inset = mesh(innerGeometry, dark, face, 0, 0, 0.215);
      inset.scale.set(0.885, 0.885, 1);
      for (const scale of [0.965, 0.895]) {
        const path = new T.CatmullRomCurve3(pathPoints.map(point => new T.Vector3(point.x * scale, point.y * scale, 0.24)), true);
        mesh(new T.TubeGeometry(path, 144, scale > 0.9 ? 0.025 : 0.016, 6, true), bronzeEdge, face);
      }
    }
    const leaf = new T.Shape();
    leaf.moveTo(-0.3, 0);
    leaf.bezierCurveTo(-0.08, 0.15, 0.1, 0.13, 0.3, 0);
    leaf.bezierCurveTo(0.1, 0.035, -0.05, -0.045, -0.3, 0);
    const leafGeometry = extrude(leaf, 0.012, 0.012);
    for (let i = 0; i < 24; i++) {
      const index = i * 6, point = pathPoints[index], next = pathPoints[(index + 2) % 144];
      for (const face of [front, back]) {
        const detail = mesh(leafGeometry, bronzeEdge, face, point.x * 0.93, point.y * 0.93, 0.242);
        detail.rotation.z = Math.atan2(next.y - point.y, next.x - point.x);
      }
    }
    function swirlShape() {
      const shape = new T.Shape();
      shape.moveTo(0.12, 1.65);
      shape.bezierCurveTo(1.17, 1.88, 2.02, 0.83, 1.47, -0.26);
      shape.bezierCurveTo(1.22, -0.72, 0.82, -0.69, 0.69, -1.1);
      shape.bezierCurveTo(0.41, -0.76, 0.63, -0.27, 0.95, 0.08);
      shape.bezierCurveTo(1.4, 0.7, 0.8, 1.32, 0.12, 1.65);
      return shape;
    }
    const swirlGeometry = extrude(swirlShape(), 0.034, 0.035);
    for (let i = 0; i < 3; i++) {
      const swirl = mesh(swirlGeometry, silver, front, 0, 0, 0.285);
      swirl.rotation.z = i * Math.PI * 2 / 3;
    }
    function disk(radius, depth, material, parent, z) {
      const object = mesh(new T.CylinderGeometry(radius, radius, depth, 80), material, parent, 0, 0, z);
      object.rotation.x = Math.PI / 2;
      return object;
    }
    disk(0.58, 0.13, bronzeDark, front, 0.375);
    for (let i = 0; i < 8; i++) {
      const detail = mesh(leafGeometry, bronzeEdge, front, Math.cos(i * Math.PI / 4) * 0.51, Math.sin(i * Math.PI / 4) * 0.51, 0.46);
      detail.rotation.z = i * Math.PI / 4 + Math.PI / 2;
      detail.scale.set(0.8, 0.9, 1);
    }
    mesh(new T.TorusGeometry(0.44, 0.045, 10, 72), bronzeEdge, front, 0, 0, 0.49);
    const centralSwirl = mesh(swirlGeometry, bronzeEdge, front, 0, 0, 0.49);
    centralSwirl.scale.setScalar(0.225);
    const core = mesh(new T.SphereGeometry(0.18, 24, 16), bronze, front, 0, 0, 0.47);
    core.scale.z = 0.45;
    for (const point of [[-2.17, 0.2], [2.17, 0.2], [-1.22, -1.76], [1.22, -1.76]]) {
      mesh(new T.TorusGeometry(0.16, 0.035, 8, 40), bronzeDark, front, point[0], point[1], 0.26);
      const stud = mesh(new T.SphereGeometry(0.12, 20, 12), bronzeEdge, front, point[0], point[1], 0.29);
      stud.scale.z = 0.65;
    }
    const topBoss = mesh(new T.TorusGeometry(0.19, 0.045, 10, 48), bronzeEdge, front, 0, 2.18, 0.25);
    topBoss.scale.y = 0.85;
    mesh(new T.SphereGeometry(0.095, 20, 12), bronze, front, 0, 2.18, 0.28).scale.z = 0.55;

    const weave = texture(canvas(512, (ctx, size) => {
      ctx.fillStyle = '#333a39'; ctx.fillRect(0, 0, size, size);
      ctx.lineWidth = 5;
      for (let x = -size; x < size * 2; x += 20) {
        ctx.strokeStyle = '#5b6160'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + size, size); ctx.stroke();
        ctx.strokeStyle = '#242b2a'; ctx.beginPath(); ctx.moveTo(x + 6, 0); ctx.lineTo(x + 6 + size, size); ctx.stroke();
      }
      for (let y = 0; y < size; y += 20) {
        ctx.strokeStyle = '#424a48'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
    }));
    const leather = new T.MeshStandardMaterial({ color: 0x202926, metalness: 0.1, roughness: 0.92, bumpMap: weave, bumpScale: 0.035 });
    mesh(new T.CircleGeometry(2.02, 112), leather, back, 0, 0, 0.25);
    function arcText(ctx, text, radius, fontSize, bottom, bump) {
      ctx.font = fontSize + 'px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const letters = [...text];
      const widths = letters.map(letter => ctx.measureText(letter).width + 1);
      const span = widths.reduce((a, b) => a + b, 0) / radius;
      let angle = bottom ? Math.PI / 2 + span / 2 : -Math.PI / 2 - span / 2;
      const direction = bottom ? -1 : 1;
      letters.forEach((letter, index) => {
        angle += direction * widths[index] / radius / 2;
        ctx.save();
        ctx.translate(1024 + Math.cos(angle) * radius, 1024 + Math.sin(angle) * radius);
        ctx.rotate(angle + (bottom ? -Math.PI / 2 : Math.PI / 2));
        if (!bump) { ctx.fillStyle = '#e1dac6'; ctx.fillText(letter, 1, 1.4); }
        ctx.fillStyle = bump ? '#242424' : '#4d4232';
        ctx.fillText(letter, 0, 0);
        ctx.restore();
        angle += direction * widths[index] / radius / 2;
      });
    }
    function engravingSurface(bump) {
      const brushedMetal = canvas(512, (ctx, size) => {
        grain(ctx, size, bump ? [150, 150, 150] : [177, 173, 159], bump ? 14 : 20);
      });
      return canvas(2048, (ctx, size) => {
        ctx.fillStyle = ctx.createPattern(brushedMetal, 'repeat');
        ctx.fillRect(0, 0, size, size);
        arcText(ctx, engraving.year + '  /  ' + engraving.team.toUpperCase(), 855, 88, false, bump);
        arcText(ctx, engraving.players.join('  ·  ').toUpperCase(), 707, 58, false, bump);
        arcText(ctx, 'YEAR-END CIVIL WAR', 845, 62, true, bump);
        ctx.strokeStyle = bump ? '#555555' : '#6c604e';
        ctx.lineWidth = 3;
        for (const sign of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(1024 + sign * 655, 1024); ctx.lineTo(1024 + sign * 970, 1024); ctx.stroke();
          ctx.beginPath(); ctx.arc(1024 + sign * 980, 1024, 12, 0, Math.PI * 2); ctx.stroke();
        }
      });
    }
    const engravedSilver = new T.MeshStandardMaterial({
      color: 0xe0d9c7, metalness: 0.91, roughness: 0.4,
      map: texture(engravingSurface(false), true),
      bumpMap: texture(engravingSurface(true)), bumpScale: 0.025
    });
    disk(1.76, 0.07, bronzeDark, back, 0.285);
    mesh(new T.RingGeometry(1.035, 1.72, 128), engravedSilver, back, 0, 0, 0.33);
    mesh(new T.TorusGeometry(1.75, 0.035, 10, 112), steel, back, 0, 0, 0.335);
    mesh(new T.TorusGeometry(1.035, 0.025, 10, 96), bronzeDark, back, 0, 0, 0.335);
    disk(1.005, 0.045, silver, back, 0.315);
    mesh(new T.TorusGeometry(0.92, 0.02, 8, 96), steel, back, 0, 0, 0.345);
    for (let i = 0; i < 3; i++) {
      const detail = mesh(swirlGeometry, bronzeDark, back, 0, 0, 0.35);
      detail.scale.setScalar(0.42);
      detail.rotation.z = i * Math.PI * 2 / 3;
    }
    for (let i = 0; i < 14; i++) {
      const angle = i * Math.PI * 2 / 14;
      const rivet = mesh(new T.SphereGeometry(0.044, 12, 8), steel, back, Math.cos(angle) * 1.78, Math.sin(angle) * 1.78, 0.34);
      rivet.scale.z = 0.6;
    }
    const environmentCanvas = document.createElement('canvas');
    environmentCanvas.width = 1024; environmentCanvas.height = 512;
    const env = environmentCanvas.getContext('2d');
    env.fillStyle = '#252a32'; env.fillRect(0, 0, 1024, 512);
    for (const light of [[180, 120, 220, '#e5d5b5'], [710, 140, 180, '#b2c5dd'], [480, 400, 160, '#76614a']]) {
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
    scene.add(new T.HemisphereLight(0xe6ddc9, 0x161b20, 1.4));
    const key = new T.DirectionalLight(0xffe2b5, 3.2); key.position.set(-4, 6, 8); scene.add(key);
    const fill = new T.DirectionalLight(0xbacdec, 2); fill.position.set(5, 1, 5); scene.add(fill);
    const rim = new T.DirectionalLight(0xb7a3ce, 2.4); rim.position.set(2, 4, -5); scene.add(rim);
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
