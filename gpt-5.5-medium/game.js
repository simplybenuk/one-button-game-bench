const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const startButton = document.getElementById("startButton");
const scoreEl = document.getElementById("score");
const chainEl = document.getElementById("chain");
const bestEl = document.getElementById("best");

const TAU = Math.PI * 2;
const base = { width: 960, height: 540 };
const storageKey = "nullwake-best";

let state;
let lastTime = 0;
let audio;
let best = Number(localStorage.getItem(storageKey) || 0);

bestEl.textContent = String(best);

function reset() {
  state = {
    mode: "ready",
    time: 0,
    distance: 0,
    lane: 0,
    targetLane: 0,
    phase: 0,
    chain: 1,
    chainTimer: 0,
    invulnerable: 0,
    shake: 0,
    flash: 0,
    beat: 0,
    nextGate: 1.25,
    gates: [],
    particles: [],
    stars: Array.from({ length: 120 }, () => ({
      x: Math.random() * base.width,
      y: Math.random() * base.height,
      r: 0.4 + Math.random() * 1.9,
      s: 0.14 + Math.random() * 0.9
    }))
  };
  scoreEl.textContent = "0";
  chainEl.textContent = "x1";
}

function start() {
  initAudio();
  if (state.mode === "playing") {
    shift();
    return;
  }
  reset();
  state.mode = "playing";
  overlay.classList.add("hidden");
  pulseTone(330, 0.05, "triangle", 0.08);
}

function shift() {
  if (state.mode !== "playing" || state.invulnerable > 0) return;
  state.targetLane = state.targetLane === 0 ? 1 : 0;
  state.phase = 1;
  state.invulnerable = 0.16;
  state.flash = 0.16;
  spawnBurst(playerX(), laneY(state.targetLane), "#7cf7c9", 14, 2.8);
  pulseTone(440 + state.chain * 22, 0.04, "sine", 0.06);
}

function action(event) {
  event.preventDefault();
  if (state.mode === "playing") shift();
  else start();
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") action(event);
});
canvas.addEventListener("pointerdown", action);
overlay.addEventListener("pointerdown", action);

function laneY(lane) {
  return lane === 0 ? base.height * 0.36 : base.height * 0.64;
}

function playerX() {
  return base.width * 0.23;
}

function scheduleGate() {
  const speedFactor = Math.min(1.8, 1 + state.distance / 1700);
  const gap = Math.max(0.48, 0.92 - speedFactor * 0.13 + Math.random() * 0.24);
  state.nextGate += gap;

  const openLane = Math.random() < 0.5 ? 0 : 1;
  const doubleTap = state.distance > 520 && Math.random() < Math.min(0.38, state.distance / 3600);

  state.gates.push({
    x: base.width + 70,
    width: 30 + Math.random() * 18,
    openLane,
    passed: false,
    doubleTap,
    hue: doubleTap ? "#ffd166" : "#ff5f54"
  });
}

function update(dt) {
  if (state.mode !== "playing") {
    driftStars(dt, 35);
    return;
  }

  state.time += dt;
  state.distance += dt * 94 * (1 + state.distance / 3200);
  state.phase = Math.max(0, state.phase - dt * 5.8);
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.shake = Math.max(0, state.shake - dt * 18);
  state.flash = Math.max(0, state.flash - dt * 5);
  state.chainTimer = Math.max(0, state.chainTimer - dt);
  if (state.chainTimer === 0 && state.chain > 1) state.chain = 1;

  const speed = 235 + Math.min(260, state.distance * 0.085);
  driftStars(dt, speed * 0.22);

  while (state.time > state.nextGate) scheduleGate();

  for (const gate of state.gates) gate.x -= speed * dt;
  state.gates = state.gates.filter((gate) => gate.x > -90);

  const px = playerX();
  const py = laneY(state.targetLane);
  for (const gate of state.gates) {
    const inside = px > gate.x - gate.width * 0.5 && px < gate.x + gate.width * 0.5;
    if (inside && !gate.passed) {
      if (state.targetLane === gate.openLane) scoreGate(gate, py);
      else crash();
      gate.passed = true;
    }
  }

  updateParticles(dt);
  scoreEl.textContent = String(Math.floor(state.distance));
  chainEl.textContent = `x${state.chain}`;
}

function scoreGate(gate, y) {
  const bonus = gate.doubleTap ? 2 : 1;
  state.chain = Math.min(9, state.chain + bonus);
  state.chainTimer = 1.55;
  state.distance += 34 * state.chain * bonus;
  state.shake = 1.2;
  state.flash = 0.3;
  spawnBurst(playerX() + 10, y, gate.doubleTap ? "#ffd166" : "#7cf7c9", 28, 4.2);
  pulseTone(gate.doubleTap ? 780 : 620, 0.06, "square", 0.05);
}

function crash() {
  state.mode = "ended";
  const finalScore = Math.floor(state.distance);
  if (finalScore > best) {
    best = finalScore;
    localStorage.setItem(storageKey, String(best));
    bestEl.textContent = String(best);
  }
  state.shake = 8;
  spawnBurst(playerX(), laneY(state.targetLane), "#ff5f54", 70, 6.8);
  pulseTone(120, 0.18, "sawtooth", 0.09);
  message.textContent = `Depth ${finalScore}. Tap once to dive again.`;
  startButton.textContent = "Restart";
  overlay.classList.remove("hidden");
}

function driftStars(dt, speed) {
  for (const star of state.stars) {
    star.x -= speed * star.s * dt;
    if (star.x < -8) {
      star.x = base.width + 8;
      star.y = Math.random() * base.height;
    }
  }
}

function spawnBurst(x, y, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const velocity = force * (0.35 + Math.random());
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.45 + Math.random() * 0.45,
      age: 0,
      color
    });
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt * 60;
    particle.y += particle.vy * dt * 60;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
  }
  state.particles = state.particles.filter((particle) => particle.age < particle.life);
}

function draw() {
  const scale = Math.min(canvas.width / base.width, canvas.height / base.height);
  const ox = (canvas.width - base.width * scale) * 0.5;
  const oy = (canvas.height - base.height * scale) * 0.5;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  drawBackground();
  drawLanes();
  drawGates();
  drawPlayer();
  drawParticles();
  drawVignette();
  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, base.width, base.height);
  gradient.addColorStop(0, "#06100e");
  gradient.addColorStop(0.55, "#0c1712");
  gradient.addColorStop(1, "#16120b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, base.width, base.height);

  ctx.globalAlpha = 0.78;
  for (const star of state.stars) {
    ctx.fillStyle = star.s > 0.75 ? "#dffcf2" : "#6db49b";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const scan = 26;
  ctx.strokeStyle = "rgba(239, 248, 242, 0.035)";
  ctx.lineWidth = 1;
  for (let y = (state.time * 38) % scan; y < base.height; y += scan) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(base.width, y);
    ctx.stroke();
  }
}

function drawLanes() {
  for (let lane = 0; lane < 2; lane += 1) {
    const y = laneY(lane);
    ctx.strokeStyle = lane === state.targetLane ? "rgba(124, 247, 201, 0.72)" : "rgba(239, 248, 242, 0.16)";
    ctx.lineWidth = lane === state.targetLane ? 3 : 1;
    ctx.setLineDash([14, 18]);
    ctx.lineDashOffset = -state.time * 72;
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.lineTo(base.width - 64, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawGates() {
  for (const gate of state.gates) {
    for (let lane = 0; lane < 2; lane += 1) {
      if (lane === gate.openLane) {
        drawOpening(gate, lane);
      } else {
        drawHazard(gate, lane);
      }
    }
  }
}

function drawOpening(gate, lane) {
  const y = laneY(lane);
  ctx.strokeStyle = gate.doubleTap ? "rgba(255, 209, 102, 0.78)" : "rgba(124, 247, 201, 0.54)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(gate.x, y, 27, -0.9, 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gate.x, y, 27, Math.PI - 0.9, Math.PI + 0.9);
  ctx.stroke();
}

function drawHazard(gate, lane) {
  const y = laneY(lane);
  const h = 102;
  const pulse = Math.sin(state.time * 8 + gate.x * 0.02) * 8;
  ctx.fillStyle = "rgba(255, 95, 84, 0.12)";
  ctx.fillRect(gate.x - gate.width * 0.5, y - h * 0.5, gate.width, h);
  ctx.strokeStyle = gate.hue;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gate.x - gate.width * 0.5, y - h * 0.5 - pulse);
  ctx.lineTo(gate.x + gate.width * 0.5, y + h * 0.5 + pulse);
  ctx.moveTo(gate.x + gate.width * 0.5, y - h * 0.5 + pulse);
  ctx.lineTo(gate.x - gate.width * 0.5, y + h * 0.5 - pulse);
  ctx.stroke();
}

function drawPlayer() {
  const x = playerX();
  const fromY = laneY(state.lane);
  const toY = laneY(state.targetLane);
  const ease = 1 - state.phase * state.phase * state.phase;
  const y = fromY + (toY - fromY) * ease;
  if (state.phase <= 0.01) state.lane = state.targetLane;

  const glow = state.invulnerable > 0 ? 28 : 16;
  ctx.shadowColor = "#7cf7c9";
  ctx.shadowBlur = glow;
  ctx.fillStyle = "#eff8f2";
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 12, Math.sin(state.time * 5) * 0.16, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = state.flash > 0 ? "#ffd166" : "#7cf7c9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 31 + state.flash * 28, 0, TAU);
  ctx.stroke();
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = 1 - particle.age / particle.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2 + alpha * 3, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(base.width * 0.45, base.height * 0.5, 120, base.width * 0.5, base.height * 0.5, 560);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, base.width, base.height);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

function initAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
}

function pulseTone(freq, duration, type, gainValue) {
  if (!audio) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function frame(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

reset();
resize();
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
