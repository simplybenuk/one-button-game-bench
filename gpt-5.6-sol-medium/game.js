(() => {
  'use strict';

  const canvas = document.querySelector('#screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.querySelector('#score');
  const bestEl = document.querySelector('#best');
  const messageEl = document.querySelector('#message');
  const eyebrowEl = document.querySelector('#eyebrow');
  const titleEl = document.querySelector('#title');
  const instructionsEl = document.querySelector('#instructions');
  const promptEl = document.querySelector('#prompt');
  const actionHint = document.querySelector('#actionHint');
  const qualityEl = document.querySelector('#quality');
  const statusEl = document.querySelector('#status');

  const TAU = Math.PI * 2;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let now = 0;
  let last = 0;
  let audio = null;
  let state = 'intro';
  let score = 0;
  let links = 0;
  let best = Number(localStorage.getItem('deadAirBest') || 0);
  let current;
  let target;
  let ship;
  let camera = { x: 0, y: 0 };
  let shake = 0;
  let flash = 0;
  let flightTime = 0;
  let spawnIndex = 0;
  let hazards = [];
  let particles = [];
  let trails = [];
  let oldNodes = [];
  let stars = [];
  let seed = 918273;

  bestEl.textContent = String(best).padStart(2, '0');

  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length) {
      for (let i = 0; i < 120; i++) {
        stars.push({ x: random(), y: random(), z: .25 + random() * .75, pulse: random() * TAU });
      }
    }
  }

  function makeNode(x, y, index) {
    return {
      x, y, index,
      r: Math.max(28, 39 - Math.floor(index / 6) * 2),
      pulse: random() * TAU,
      alive: true
    };
  }

  function spawnTarget() {
    spawnIndex++;
    const minSide = Math.min(width, height);
    const distance = Math.min(310, Math.max(205, minSide * (.33 + random() * .09)));
    let angle;
    if (spawnIndex === 1) angle = -.2;
    else {
      const previous = Math.atan2(current.y - (oldNodes.at(-1)?.y ?? current.y), current.x - (oldNodes.at(-1)?.x ?? current.x));
      angle = previous + (random() < .5 ? -1 : 1) * (.72 + random() * 1.35);
    }
    target = makeNode(current.x + Math.cos(angle) * distance, current.y + Math.sin(angle) * distance, spawnIndex);
    target.r = Math.max(27, 42 - Math.floor(links / 5) * 2);
    hazards = [];
    if (links >= 3) {
      const count = links >= 11 && random() > .4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const t = .34 + random() * .34;
        const px = current.x + (target.x - current.x) * t;
        const py = current.y + (target.y - current.y) * t;
        const a = angle + Math.PI / 2;
        const side = random() < .5 ? -1 : 1;
        const offset = side * (30 + random() * 62);
        hazards.push({ x: px + Math.cos(a) * offset, y: py + Math.sin(a) * offset, r: 17 + random() * 9, phase: random() * TAU });
      }
    }
  }

  function reset() {
    seed = (Date.now() ^ 0x51f15e) >>> 0;
    score = 0;
    links = 0;
    spawnIndex = 0;
    hazards = [];
    particles = [];
    trails = [];
    oldNodes = [];
    current = makeNode(0, 0, 0);
    spawnTarget();
    const targetAngle = Math.atan2(target.y - current.y, target.x - current.x);
    const targetDistance = Math.hypot(target.x - current.x, target.y - current.y);
    const orbitR = 67;
    const startAngle = targetAngle - Math.acos(orbitR / targetDistance);
    ship = {
      x: Math.cos(startAngle) * 67,
      y: Math.sin(startAngle) * 67,
      vx: 0, vy: 0,
      angle: startAngle,
      orbitR,
      omega: 1.55,
      ping: true,
      rotation: 0
    };
    camera.x = (current.x + target.x) / 2;
    camera.y = (current.y + target.y) / 2;
    scoreEl.textContent = '00';
    statusEl.textContent = 'ORBIT LOCKED';
    actionHint.textContent = 'RELEASE';
    actionHint.classList.add('show');
    actionHint.classList.remove('hot');
    state = 'orbit';
  }

  function initAudio() {
    if (audio) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audio = new AudioContext();
  }

  function tone(freq, duration, type = 'sine', volume = .06, slide = 1) {
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function burst(x, y, color, count, speed = 100) {
    for (let i = 0; i < count; i++) {
      const a = random() * TAU;
      const s = speed * (.2 + random());
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: .35 + random() * .55, color, size: 1 + random() * 2.5 });
    }
  }

  function act(event) {
    if (event) event.preventDefault();
    initAudio();
    if (audio?.state === 'suspended') audio.resume();

    if (state === 'intro' || state === 'dead') {
      messageEl.classList.add('hidden');
      reset();
      tone(190, .16, 'sine', .05, 1.8);
      return;
    }

    if (state === 'orbit') {
      const tangent = ship.angle + (ship.omega > 0 ? Math.PI / 2 : -Math.PI / 2);
      const speed = 245 + Math.min(55, links * 3);
      ship.vx = Math.cos(tangent) * speed;
      ship.vy = Math.sin(tangent) * speed;
      ship.ping = true;
      flightTime = 0;
      state = 'flight';
      statusEl.textContent = 'SIGNAL LOOSE';
      actionHint.textContent = 'PING';
      actionHint.classList.add('hot');
      burst(ship.x, ship.y, '#53f4ff', 12, 75);
      tone(290, .12, 'triangle', .045, 1.9);
      return;
    }

    if (state === 'flight' && ship.ping) {
      ship.ping = false;
      const dx = target.x - ship.x;
      const dy = target.y - ship.y;
      const distance = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(ship.vx, ship.vy);
      const pull = .62;
      ship.vx = ship.vx * (1 - pull) + dx / distance * speed * pull;
      ship.vy = ship.vy * (1 - pull) + dy / distance * speed * pull;
      const adjusted = Math.hypot(ship.vx, ship.vy);
      ship.vx *= speed / adjusted;
      ship.vy *= speed / adjusted;
      actionHint.textContent = 'PING SPENT';
      actionHint.classList.remove('hot');
      burst(ship.x, ship.y, '#ffc45c', 22, 125);
      shake = 5;
      tone(680, .18, 'sine', .06, .42);
    }
  }

  function connect() {
    const distance = Math.hypot(ship.x - target.x, ship.y - target.y);
    const precision = Math.max(0, 1 - distance / target.r);
    const points = 100 + Math.round(precision * 150) + (ship.ping ? 50 : 0);
    score += points;
    links++;
    scoreEl.textContent = String(links).padStart(2, '0');
    qualityEl.innerHTML = `${precision > .68 ? 'PERFECT LOCK' : precision > .32 ? 'CLEAN LINK' : 'EDGE CATCH'} <b>+${points}</b>`;
    qualityEl.classList.remove('pop');
    void qualityEl.offsetWidth;
    qualityEl.classList.add('pop');
    burst(target.x, target.y, '#53f4ff', 34, 155);
    shake = 8;
    flash = .16;
    tone(340 + Math.min(360, links * 22), .22, 'sine', .07, 1.55);
    tone(170 + Math.min(180, links * 11), .32, 'triangle', .035, 2);

    oldNodes.push(current);
    if (oldNodes.length > 5) oldNodes.shift();
    current = target;
    const incoming = Math.atan2(ship.y - current.y, ship.x - current.x);
    ship.orbitR = 58 + random() * 18;
    ship.angle = incoming;
    ship.omega = (random() < .5 ? -1 : 1) * (1.5 + Math.min(.75, links * .035) + random() * .2);
    ship.x = current.x + Math.cos(ship.angle) * ship.orbitR;
    ship.y = current.y + Math.sin(ship.angle) * ship.orbitR;
    ship.vx = ship.vy = 0;
    state = 'orbit';
    statusEl.textContent = `LINK ${String(links).padStart(2, '0')} STABLE`;
    actionHint.textContent = 'RELEASE';
    actionHint.classList.remove('hot');
    spawnTarget();
  }

  function die(reason) {
    state = 'dead';
    statusEl.textContent = reason;
    actionHint.classList.remove('show');
    burst(ship.x, ship.y, '#ff526f', 55, 220);
    shake = 15;
    flash = .3;
    tone(180, .6, 'sawtooth', .06, .18);
    if (links > best) {
      best = links;
      localStorage.setItem('deadAirBest', String(best));
      bestEl.textContent = String(best).padStart(2, '0');
    }
    eyebrowEl.textContent = reason;
    titleEl.innerHTML = `${String(links).padStart(2, '0')} LINKS<br><em>${score} PTS</em>`;
    instructionsEl.innerHTML = links > 0 ? 'The signal remembers your best run.<br>One more transmission?' : 'The tangent missed.<br>Wait for the ship to point across the beacon.';
    promptEl.innerHTML = '<span></span> TAP / SPACE TO RETRY';
    setTimeout(() => messageEl.classList.remove('hidden'), 420);
  }

  function update(dt) {
    if (state === 'orbit') {
      ship.angle += ship.omega * dt;
      ship.x = current.x + Math.cos(ship.angle) * ship.orbitR;
      ship.y = current.y + Math.sin(ship.angle) * ship.orbitR;
      ship.rotation = ship.angle + (ship.omega > 0 ? Math.PI / 2 : -Math.PI / 2);
    } else if (state === 'flight') {
      flightTime += dt;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      ship.rotation = Math.atan2(ship.vy, ship.vx);
      if (trails.length === 0 || Math.hypot(ship.x - trails.at(-1).x, ship.y - trails.at(-1).y) > 6) {
        trails.push({ x: ship.x, y: ship.y, age: 0 });
      }
      const targetDistance = Math.hypot(ship.x - target.x, ship.y - target.y);
      if (targetDistance < target.r) {
        connect();
        return;
      }
      for (const hazard of hazards) {
        if (Math.hypot(ship.x - hazard.x, ship.y - hazard.y) < hazard.r + 5) {
          die('CARRIER BURNED');
          return;
        }
      }
      const fromCurrent = Math.hypot(ship.x - current.x, ship.y - current.y);
      if (flightTime > 4.5 || fromCurrent > 920) {
        die('SIGNAL LOST');
        return;
      }
    }

    const focusX = state === 'flight' ? ship.x * .55 + target.x * .45 : (current.x + target.x) / 2;
    const focusY = state === 'flight' ? ship.y * .55 + target.y * .45 : (current.y + target.y) / 2;
    camera.x += (focusX - camera.x) * Math.min(1, dt * 2.8);
    camera.y += (focusY - camera.y) * Math.min(1, dt * 2.8);
    shake *= Math.pow(.02, dt);
    flash = Math.max(0, flash - dt);

    for (const p of particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(.08, dt);
      p.vy *= Math.pow(.08, dt);
    }
    particles = particles.filter(p => p.age < p.life);
    for (const t of trails) t.age += dt;
    trails = trails.filter(t => t.age < .7);
  }

  function line(x1, y1, x2, y2, color, alpha = 1, dash = []) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function worldToScreen(x, y) {
    return { x: x - camera.x + width / 2, y: y - camera.y + height / 2 };
  }

  function drawBackground(time) {
    ctx.fillStyle = '#040711';
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * .5, height * .47, 0, width * .5, height * .47, Math.max(width, height) * .65);
    glow.addColorStop(0, '#111a31');
    glow.addColorStop(.45, '#080d1c');
    glow.addColorStop(1, '#03050b');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (const s of stars) {
      let x = (s.x * width - camera.x * s.z * .035) % width;
      let y = (s.y * height - camera.y * s.z * .035) % height;
      if (x < 0) x += width;
      if (y < 0) y += height;
      const alpha = .12 + s.z * .35 + Math.sin(time * .0015 + s.pulse) * .08;
      ctx.fillStyle = `rgba(177,222,255,${alpha})`;
      ctx.fillRect(x, y, s.z > .7 ? 1.4 : .8, s.z > .7 ? 1.4 : .8);
    }

    ctx.strokeStyle = '#19243b55';
    ctx.lineWidth = 1;
    const grid = 80;
    const ox = ((-camera.x + width / 2) % grid + grid) % grid;
    const oy = ((-camera.y + height / 2) % grid + grid) % grid;
    ctx.beginPath();
    for (let x = ox; x < width; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = oy; y < height; y += grid) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();
  }

  function drawNode(node, active, time) {
    const p = worldToScreen(node.x, node.y);
    const pulse = Math.sin(time * .003 + node.pulse) * 3;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = active ? '#53f4ff99' : '#4e627c55';
    ctx.beginPath(); ctx.arc(0, 0, node.r + 10 + pulse, 0, TAU); ctx.stroke();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = active ? '#53f4ff55' : '#4e627c30';
    ctx.beginPath(); ctx.arc(0, 0, node.r + 18 - pulse, -time * .0005, TAU - time * .0005); ctx.stroke();
    ctx.setLineDash([]);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    core.addColorStop(0, active ? '#e8ffff' : '#8296aa');
    core.addColorStop(.2, active ? '#53f4ff' : '#52657b');
    core.addColorStop(1, '#53f4ff00');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = active ? '#bafcff' : '#60768c';
    ctx.font = '8px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(String(node.index).padStart(2, '0'), 0, node.r + 32);
    ctx.restore();
  }

  function drawHazard(h, time) {
    const p = worldToScreen(h.x, h.y);
    const pulse = 1 + Math.sin(time * .006 + h.phase) * .16;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(time * .0007 + h.phase);
    ctx.strokeStyle = '#ff526f88';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.arc(0, 0, h.r * 1.65 * pulse, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff526f18';
    ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.rotate(TAU / 6);
      line(h.r * .45, 0, h.r * 1.1, 0, '#ff526f', .65);
    }
    ctx.restore();
  }

  function drawShip() {
    const p = worldToScreen(ship.x, ship.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ship.rotation);
    ctx.shadowColor = state === 'flight' && ship.ping ? '#ffc45c' : '#53f4ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#eaffff';
    ctx.beginPath();
    ctx.moveTo(11, 0); ctx.lineTo(-7, -6); ctx.lineTo(-3, 0); ctx.lineTo(-7, 6); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = state === 'flight' ? '#ffc45c' : '#53f4ff';
    ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-14 - random() * 6, 0); ctx.lineTo(-4, 3); ctx.fill();
    ctx.restore();
  }

  function draw(time) {
    drawBackground(time);
    const sx = (random() - .5) * shake;
    const sy = (random() - .5) * shake;
    ctx.save();
    ctx.translate(sx, sy);

    for (const node of oldNodes) drawNode(node, false, time);
    if (current) {
      const a = worldToScreen(current.x, current.y);
      const b = worldToScreen(target.x, target.y);
      line(a.x, a.y, b.x, b.y, '#53f4ff', .16, [4, 10]);
      drawNode(current, false, time);
      drawNode(target, true, time);
      if (state === 'orbit') {
        ctx.strokeStyle = '#53f4ff32';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(a.x, a.y, ship.orbitR, 0, TAU); ctx.stroke();
        const tangent = ship.angle + (ship.omega > 0 ? Math.PI / 2 : -Math.PI / 2);
        const sp = worldToScreen(ship.x, ship.y);
        line(sp.x, sp.y, sp.x + Math.cos(tangent) * 68, sp.y + Math.sin(tangent) * 68, '#ffc45c', .5, [2, 5]);
      }
    }

    for (const h of hazards) drawHazard(h, time);
    for (const t of trails) {
      const p = worldToScreen(t.x, t.y);
      ctx.fillStyle = `rgba(83,244,255,${(1 - t.age / .7) * .38})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill();
    }
    for (const p of particles) {
      const q = worldToScreen(p.x, p.y);
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(q.x - p.size / 2, q.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (ship && state !== 'dead') drawShip();
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(190,252,255,${flash * .45})`;
      ctx.fillRect(0, 0, width, height);
    }

    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .2, width / 2, height / 2, Math.max(width, height) * .72);
    vignette.addColorStop(0, '#00000000');
    vignette.addColorStop(1, '#000815aa');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function loop(timestamp) {
    now = timestamp;
    const dt = Math.min(.033, (timestamp - last) / 1000 || 0);
    last = timestamp;
    if (state !== 'intro') update(dt);
    draw(timestamp);
    requestAnimationFrame(loop);
  }

  addEventListener('resize', resize);
  addEventListener('pointerdown', act, { passive: false });
  addEventListener('keydown', event => {
    if (event.code === 'Space' && !event.repeat) act(event);
  });
  addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  resize();
  current = makeNode(0, 0, 0);
  target = makeNode(240, -30, 1);
  ship = { x: 0, y: -67, angle: -Math.PI / 2, orbitR: 67, omega: 1.4, rotation: 0, ping: true };
  camera = { x: 120, y: -15 };
  requestAnimationFrame(loop);
})();
