const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayCopy = document.getElementById("overlay-copy");
const overlayButton = document.getElementById("overlay-button");
const overlayKicker = document.getElementById("overlay-kicker");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const comboEl = document.getElementById("combo");

const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const rootY = height * 0.78;
const laneOffset = 142;
const playerY = height * 0.8;

const storageKey = "signal-bloom-best";
const baseScroll = 440;
const game = {
  mode: "intro",
  time: 0,
  score: 0,
  best: Number(localStorage.getItem(storageKey) || 0),
  combo: 1,
  comboTicks: 0,
  side: -1,
  playerX: centerX - laneOffset,
  targetX: centerX - laneOffset,
  pulse: 0,
  bloom: 0,
  scroll: baseScroll,
  distance: 0,
  particles: [],
  obstacles: [],
  seeds: [],
  stars: createStars(),
  lastTimestamp: 0,
  audio: null,
};

bestEl.textContent = String(game.best);

function createStars() {
  return Array.from({ length: 56 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1 + Math.random() * 4,
    speed: 14 + Math.random() * 24,
    hue: 160 + Math.random() * 60,
  }));
}

function resetGame() {
  game.time = 0;
  game.score = 0;
  game.combo = 1;
  game.comboTicks = 0;
  game.side = -1;
  game.playerX = centerX - laneOffset;
  game.targetX = centerX - laneOffset;
  game.pulse = 0;
  game.bloom = 0;
  game.scroll = baseScroll;
  game.distance = 0;
  game.particles = [];
  game.obstacles = [];
  game.seeds = [];
  game.lastTimestamp = 0;

  let spawnY = -180;
  for (let i = 0; i < 12; i += 1) {
    spawnObstacle(spawnY);
    if (Math.random() > 0.33) {
      spawnSeed(spawnY - 110 + Math.random() * 70);
    }
    spawnY -= 190 + Math.random() * 80;
  }

  updateHud();
}

function showOverlay(title, copy, button, kicker = "one button bench entry") {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlayButton.textContent = button;
  overlayKicker.textContent = kicker;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(game.score));
  bestEl.textContent = String(game.best);
  comboEl.textContent = `x${game.combo}`;
}

function ensureAudio() {
  if (game.audio) {
    return game.audio;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  game.audio = new AudioContextClass();
  return game.audio;
}

function blip(type = "tap") {
  const audio = ensureAudio();
  if (!audio) {
    return;
  }
  if (audio.state === "suspended") {
    audio.resume();
  }
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);

  if (type === "hit") {
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.24);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.type = "sawtooth";
    osc.start(now);
    osc.stop(now + 0.25);
    return;
  }

  if (type === "seed") {
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.type = "triangle";
    osc.start(now);
    osc.stop(now + 0.14);
    return;
  }

  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(460, now + 0.09);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.type = "sine";
  osc.start(now);
  osc.stop(now + 0.1);
}

function spawnParticles(x, y, count, color, force) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = force * (0.4 + Math.random() * 0.8);
    game.particles.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.5,
      age: 0,
      size: 3 + Math.random() * 8,
      color,
    });
  }
}

function spawnObstacle(y) {
  const side = Math.random() > 0.5 ? 1 : -1;
  const widthScale = 66 + Math.random() * 54;
  const length = 92 + Math.random() * 120;
  game.obstacles.push({
    y,
    side,
    widthScale,
    length,
    glow: Math.random(),
    nearMissDone: false,
  });
}

function spawnSeed(y) {
  game.seeds.push({
    x: centerX + (Math.random() > 0.5 ? 1 : -1) * (72 + Math.random() * 120),
    y,
    radius: 11 + Math.random() * 7,
    phase: Math.random() * Math.PI * 2,
    taken: false,
  });
}

function switchSides() {
  if (game.mode === "intro" || game.mode === "gameover") {
    startGame();
    return;
  }

  if (game.mode !== "playing") {
    return;
  }

  game.side *= -1;
  game.targetX = centerX + game.side * laneOffset;
  game.pulse = 1;
  game.comboTicks = Math.max(game.comboTicks, 0.7);
  spawnParticles(game.playerX, playerY, 16, "#9cffc7", 180);
  blip("tap");
}

function startGame() {
  resetGame();
  game.mode = "playing";
  hideOverlay();
  blip("seed");
}

function endGame() {
  game.mode = "gameover";
  if (game.score > game.best) {
    game.best = Math.floor(game.score);
    localStorage.setItem(storageKey, String(game.best));
  }
  updateHud();
  showOverlay(
    "Bloom Lost",
    `Score ${Math.floor(game.score)}. Press space or tap to grow another run.`,
    "restart",
    "the vine keeps climbing",
  );
  blip("hit");
}

function update(dt) {
  if (game.mode !== "playing") {
    animateIdle(dt);
    return;
  }

  game.time += dt;
  game.distance += dt * game.scroll;
  game.score += dt * 10 * game.combo;
  game.scroll = Math.min(820, baseScroll + game.time * 18 + game.bloom * 140);
  game.pulse = Math.max(0, game.pulse - dt * 2.6);
  game.playerX += (game.targetX - game.playerX) * Math.min(1, dt * 12);

  if (game.comboTicks > 0) {
    game.comboTicks -= dt;
  } else if (game.combo > 1) {
    game.combo = Math.max(1, game.combo - 1);
    game.comboTicks = 0.4;
  }

  for (const star of game.stars) {
    star.y += star.speed * dt * (1 + game.bloom * 1.4);
    if (star.y > height + 20) {
      star.y = -20;
      star.x = Math.random() * width;
    }
  }

  for (const obstacle of game.obstacles) {
    obstacle.y += game.scroll * dt;
    if (!obstacle.nearMissDone && obstacle.y > playerY - 45 && obstacle.y < playerY + 45 && obstacle.side !== game.side) {
      obstacle.nearMissDone = true;
      game.combo = Math.min(8, game.combo + 1);
      game.comboTicks = 1.4;
      spawnParticles(
        centerX + obstacle.side * (laneOffset + 36),
        obstacle.y,
        10,
        "#5ce1e6",
        120,
      );
    }
  }

  for (const seed of game.seeds) {
    seed.y += game.scroll * dt;
    seed.phase += dt * 3;
    seed.x += Math.sin(seed.phase) * 24 * dt;

    if (!seed.taken && Math.hypot(seed.x - game.playerX, seed.y - playerY) < seed.radius + 28) {
      seed.taken = true;
      game.score += 35 * game.combo;
      game.bloom = Math.min(1, game.bloom + 0.13);
      game.combo = Math.min(8, game.combo + 1);
      game.comboTicks = 1.7;
      spawnParticles(seed.x, seed.y, 18, "#ffdf88", 150);
      blip("seed");
    }
  }

  for (const particle of game.particles) {
    particle.age += dt;
    particle.x += particle.dx * dt;
    particle.y += particle.dy * dt;
    particle.dy += 60 * dt;
  }

  game.obstacles = game.obstacles.filter((obstacle) => obstacle.y < height + 180);
  game.seeds = game.seeds.filter((seed) => seed.y < height + 80 && !seed.taken);
  game.particles = game.particles.filter((particle) => particle.age < particle.life);

  while (game.obstacles.length < 13) {
    const topY = Math.min(...game.obstacles.map((item) => item.y), 0);
    const nextY = topY - (170 + Math.random() * 110);
    spawnObstacle(nextY);
    if (Math.random() > 0.28) {
      spawnSeed(nextY - 100 + Math.random() * 50);
    }
  }

  const hit = game.obstacles.some((obstacle) => {
    if (Math.abs(obstacle.y - playerY) > obstacle.length * 0.5 + 26) {
      return false;
    }
    const obstacleX = centerX + obstacle.side * (laneOffset + 38);
    return Math.abs(obstacleX - game.playerX) < obstacle.widthScale * 0.5 + 20;
  });

  if (hit) {
    spawnParticles(game.playerX, playerY, 28, "#ff7a7a", 220);
    endGame();
  }

  game.bloom = Math.max(0, game.bloom - dt * 0.02);
  updateHud();
}

function animateIdle(dt) {
  game.time += dt;
  game.playerX = centerX + Math.sin(game.time * 1.7) * laneOffset;
  game.pulse = Math.max(0, Math.sin(game.time * 3.6) * 0.5 + 0.5);

  for (const star of game.stars) {
    star.y += star.speed * dt * 0.45;
    if (star.y > height + 20) {
      star.y = -20;
      star.x = Math.random() * width;
    }
  }
}

function drawBackground() {
  const bloomGlow = game.bloom * 0.55;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgba(${10 + bloomGlow * 50}, ${20 + bloomGlow * 65}, ${34 + bloomGlow * 50}, 1)`);
  gradient.addColorStop(0.5, `rgba(${18 + bloomGlow * 70}, ${39 + bloomGlow * 60}, ${53 + bloomGlow * 30}, 1)`);
  gradient.addColorStop(1, `rgba(${47 + bloomGlow * 80}, ${16 + bloomGlow * 45}, ${34 + bloomGlow * 40}, 1)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.45 + game.bloom * 0.25;
  for (const star of game.stars) {
    ctx.fillStyle = `hsla(${star.hue}, 90%, 78%, 0.85)`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVine() {
  ctx.save();
  ctx.strokeStyle = "rgba(163, 255, 208, 0.18)";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX, height + 100);

  for (let y = height + 100; y > -120; y -= 44) {
    const wave = Math.sin((y + game.distance * 0.8) * 0.008) * 24;
    ctx.lineTo(centerX + wave, y);
  }

  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 18; i += 1) {
    const y = (height + 80) - ((game.distance * 0.9 + i * 120) % (height + 260));
    const sway = Math.sin((game.time * 1.8) + i) * 18;
    const length = 34 + (i % 3) * 10;
    ctx.strokeStyle = `rgba(92, 225, 180, ${0.14 + (i % 3) * 0.06})`;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centerX + sway, y);
    ctx.lineTo(centerX + sway + (i % 2 === 0 ? -length : length), y - 20);
    ctx.stroke();
  }
}

function drawObstacles() {
  for (const obstacle of game.obstacles) {
    const x = centerX + obstacle.side * (laneOffset + 38);
    ctx.save();
    ctx.translate(x, obstacle.y);
    ctx.fillStyle = "rgba(61, 14, 21, 0.92)";
    ctx.strokeStyle = "rgba(255, 136, 136, 0.75)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(obstacle.side * -4, -obstacle.length * 0.5);
    ctx.lineTo(obstacle.side * obstacle.widthScale, -obstacle.length * 0.16);
    ctx.lineTo(obstacle.side * obstacle.widthScale, obstacle.length * 0.16);
    ctx.lineTo(obstacle.side * -4, obstacle.length * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 204, 160, 0.65)";
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(obstacle.side * 0, i * 22);
      ctx.lineTo(obstacle.side * (obstacle.widthScale + 14), i * 22 + 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSeeds() {
  for (const seed of game.seeds) {
    ctx.save();
    ctx.translate(seed.x, seed.y);
    const pulse = 0.6 + Math.sin(game.time * 5 + seed.phase) * 0.22;
    const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, seed.radius * 2.6);
    gradient.addColorStop(0, "rgba(255, 250, 205, 0.95)");
    gradient.addColorStop(0.45, "rgba(255, 205, 119, 0.78)");
    gradient.addColorStop(1, "rgba(255, 205, 119, 0)");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, seed.radius * 2.6 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff3bc";
    ctx.beginPath();
    ctx.arc(0, 0, seed.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(game.playerX, playerY);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 60 + game.pulse * 28);
  glow.addColorStop(0, "rgba(255, 253, 220, 1)");
  glow.addColorStop(0.34, "rgba(156, 255, 199, 0.85)");
  glow.addColorStop(1, "rgba(92, 225, 230, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 56 + game.pulse * 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(Math.sin(game.time * 7) * 0.1);
  ctx.fillStyle = "#fff7d4";
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.quadraticCurveTo(22, -8, 0, 30);
  ctx.quadraticCurveTo(-22, -8, 0, -28);
  ctx.fill();

  ctx.strokeStyle = "rgba(156, 255, 199, 0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 28 + game.pulse * 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const particle of game.particles) {
    const alpha = 1 - (particle.age / particle.life);
    ctx.fillStyle = hexToRgba(particle.color, alpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPulseRails() {
  ctx.save();
  ctx.strokeStyle = "rgba(196, 241, 255, 0.08)";
  ctx.lineWidth = 4;
  [centerX - laneOffset, centerX + laneOffset].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -50);
    ctx.lineTo(x, height + 50);
    ctx.stroke();
  });
  ctx.restore();
}

function draw() {
  drawBackground();
  drawPulseRails();
  drawVine();
  drawObstacles();
  drawSeeds();
  drawParticles();
  drawPlayer();
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const full = value.length === 3
    ? value.split("").map((part) => part + part).join("")
    : value;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function frame(timestamp) {
  if (!game.lastTimestamp) {
    game.lastTimestamp = timestamp;
  }
  const dt = Math.min(0.033, (timestamp - game.lastTimestamp) / 1000);
  game.lastTimestamp = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function handleInput(event) {
  if (event.type === "keydown" && event.code !== "Space") {
    return;
  }
  event.preventDefault();
  switchSides();
}

overlayButton.addEventListener("click", switchSides);
window.addEventListener("keydown", handleInput, { passive: false });
canvas.addEventListener("pointerdown", handleInput, { passive: false });
overlay.addEventListener("pointerdown", (event) => {
  if (event.target === overlay) {
    handleInput(event);
  }
}, { passive: false });

showOverlay(
  "Signal Bloom",
  "Tap, click, or press space to switch sides. Thread the bloom through thorns and collect sparks to build score.",
  "start",
);
draw();
requestAnimationFrame(frame);
