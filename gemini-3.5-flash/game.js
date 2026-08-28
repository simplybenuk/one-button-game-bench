/**
 * PULSAR: Orbital Escape
 * Core Game Script for Gemini 3.5 Flash Submission
 * Written in Vanilla ES6+ JS, utilizing Canvas 2D and Web Audio API.
 */

// --- CONFIGURATION & CONSTANTS ---
const DESIGN_WIDTH = 1080;
const DESIGN_HEIGHT = 1920;
const BASE_LAUNCH_SPEED = 900; // Pixels per second
const MAX_LAUNCH_SPEED = 1400;
const VOID_BASE_SPEED = 150;    // Pixels per second rise rate
const VOID_SPEED_RAMP = 6;      // Speed increase per planet scaled
const GRAVITY_PULL = 350;       // Subtle vacuum pull towards closest planet in reach
const VIEWPORT_PADDING = 300;   // Trigger camera scroll when player goes above this line

// --- GAME STATE ---
const State = {
  START: 'start',
  PLAYING: 'playing',
  GAMEOVER: 'gameover'
};

const game = {
  state: State.START,
  canvas: null,
  ctx: null,
  scale: 1,
  width: 0,
  height: 0,
  
  // Timing
  lastTime: 0,
  dt: 0,
  
  // Scoring & Stats
  score: 0,
  multiplier: 1.0,
  crystals: 0,
  altitude: 0,
  highScore: 0,
  highAltitude: 0,
  
  // Camera
  cameraY: 0,
  targetCameraY: 0,
  cameraLerp: 0.1,
  
  // Game Entities
  player: null,
  planets: [],
  crystalsList: [],
  particles: [],
  voidY: 0,
  voidLevel: 0, // Actual physical void position
  
  // Generation state
  lastGeneratedY: 0,
  planetCounter: 0,
  
  // Audio state
  soundEnabled: true,
  audioCtx: null,
  masterGain: null,
  bgOsc1: null,
  bgOsc2: null,
  bgFilter: null,
  vibrato: null
};

// --- INITIALIZATION ---
window.addEventListener('load', () => {
  initGame();
});

function initGame() {
  game.canvas = document.getElementById('gameCanvas');
  game.ctx = game.canvas.getContext('2d');
  
  // Load high scores from local storage
  game.highScore = parseInt(localStorage.getItem('pulsar_highscore') || '0');
  game.highAltitude = parseInt(localStorage.getItem('pulsar_highaltitude') || '0');
  updateHighScoreUI();
  
  // Handle window resizing
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Setup User Inputs
  setupInputs();
  
  // Start the Main Game Loop
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  // Get window sizes
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  // Set canvas size
  game.canvas.width = w;
  game.canvas.height = h;
  game.width = w;
  game.height = h;
  
  // Calculate rendering scale (based on design height to keep gameplay consistent)
  game.scale = h / DESIGN_HEIGHT;
  
  // If portrait aspect ratio is too wide, fit to width instead
  const aspect = w / h;
  if (aspect > 0.65) {
    game.scale = (w / DESIGN_WIDTH) * 0.8;
  }
}

// --- SOUND SYNTHESIZER (WEB AUDIO API) ---
function initAudio() {
  if (game.audioCtx) return;
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    game.audioCtx = new AudioContextClass();
    
    // Master Gain Node
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.gain.setValueAtTime(game.soundEnabled ? 0.4 : 0, game.audioCtx.currentTime);
    game.masterGain.connect(game.audioCtx.destination);
    
    // Create Celestial Ambiance Pad
    createAmbiance();
  } catch (e) {
    console.warn("Web Audio API not supported or blocked: ", e);
  }
}

function createAmbiance() {
  if (!game.audioCtx) return;
  
  // Low-pass Filter for spacey warmth
  game.bgFilter = game.audioCtx.createBiquadFilter();
  game.bgFilter.type = 'lowpass';
  game.bgFilter.frequency.setValueAtTime(320, game.audioCtx.currentTime);
  game.bgFilter.Q.setValueAtTime(3, game.audioCtx.currentTime);
  game.bgFilter.connect(game.masterGain);
  
  // Create LFO for filter modulation
  const lfo = game.audioCtx.createOscillator();
  const lfoGain = game.audioCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.08, game.audioCtx.currentTime); // very slow sweep
  lfoGain.gain.setValueAtTime(140, game.audioCtx.currentTime); // sweep width
  lfo.connect(lfoGain);
  lfoGain.connect(game.bgFilter.frequency);
  lfo.start();
  
  // Bass Ambiance Drone
  game.bgOsc1 = game.audioCtx.createOscillator();
  const droneGain1 = game.audioCtx.createGain();
  game.bgOsc1.type = 'sawtooth';
  game.bgOsc1.frequency.setValueAtTime(55, game.audioCtx.currentTime); // A1 note
  droneGain1.gain.setValueAtTime(0.2, game.audioCtx.currentTime);
  game.bgOsc1.connect(droneGain1);
  droneGain1.connect(game.bgFilter);
  game.bgOsc1.start();
  
  // Harmonics Ambiance Drone
  game.bgOsc2 = game.audioCtx.createOscillator();
  const droneGain2 = game.audioCtx.createGain();
  game.bgOsc2.type = 'triangle';
  game.bgOsc2.frequency.setValueAtTime(110, game.audioCtx.currentTime); // A2 note
  droneGain2.gain.setValueAtTime(0.3, game.audioCtx.currentTime);
  game.bgOsc2.connect(droneGain2);
  droneGain2.connect(game.bgFilter);
  game.bgOsc2.start();
}

function playLaunchSound() {
  if (!game.audioCtx || !game.soundEnabled) return;
  resumeAudio();
  
  const osc = game.audioCtx.createOscillator();
  const gain = game.audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, game.audioCtx.currentTime);
  // Downward frequency sweep simulating engine thrust release
  osc.frequency.exponentialRampToValueAtTime(80, game.audioCtx.currentTime + 0.35);
  
  // Low-pass filter swipe
  const filter = game.audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, game.audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, game.audioCtx.currentTime + 0.35);
  
  gain.gain.setValueAtTime(0.5, game.audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, game.audioCtx.currentTime + 0.35);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(game.masterGain);
  
  osc.start();
  osc.stop(game.audioCtx.currentTime + 0.4);
}

function playCaptureSound() {
  if (!game.audioCtx || !game.soundEnabled) return;
  resumeAudio();
  
  const now = game.audioCtx.currentTime;
  
  // Clean harmonic chime
  const frequencies = [220, 277.18, 329.63, 440]; // A major arpeggio
  const dur = 0.08;
  
  frequencies.forEach((f, i) => {
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + (i * 0.04));
    
    gain.gain.setValueAtTime(0.18, now + (i * 0.04));
    gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.04) + 0.25);
    
    osc.connect(gain);
    gain.connect(game.masterGain);
    
    osc.start(now + (i * 0.04));
    osc.stop(now + (i * 0.04) + 0.3);
  });
}

function playCollectSound() {
  if (!game.audioCtx || !game.soundEnabled) return;
  resumeAudio();
  
  const osc = game.audioCtx.createOscillator();
  const gain = game.audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, game.audioCtx.currentTime); // C5
  osc.frequency.exponentialRampToValueAtTime(1046.50, game.audioCtx.currentTime + 0.18); // C6 sweep up
  
  gain.gain.setValueAtTime(0.25, game.audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.18);
  
  osc.connect(gain);
  gain.connect(game.masterGain);
  
  osc.start();
  osc.stop(game.audioCtx.currentTime + 0.2);
}

function playExplodeSound() {
  if (!game.audioCtx || !game.soundEnabled) return;
  resumeAudio();
  
  const now = game.audioCtx.currentTime;
  
  // Heavy sub bass sweep + noise-like rumble
  const osc = game.audioCtx.createOscillator();
  const noiseGain = game.audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.linearRampToValueAtTime(20, now + 0.8);
  
  const filter = game.audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);
  filter.frequency.exponentialRampToValueAtTime(20, now + 0.8);
  
  noiseGain.gain.setValueAtTime(0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  
  osc.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(game.masterGain);
  
  osc.start();
  osc.stop(now + 1.0);
}

function resumeAudio() {
  if (game.audioCtx && game.audioCtx.state === 'suspended') {
    game.audioCtx.resume();
  }
}

function toggleMute() {
  game.soundEnabled = !game.soundEnabled;
  
  // UI Icon updates
  const soundOn = document.getElementById('soundOnIcon');
  const soundOff = document.getElementById('soundOffIcon');
  
  if (game.soundEnabled) {
    soundOn.classList.remove('hidden');
    soundOff.classList.add('hidden');
    if (game.masterGain) {
      game.masterGain.gain.setValueAtTime(0.4, game.audioCtx.currentTime);
    } else {
      initAudio();
    }
    resumeAudio();
  } else {
    soundOn.classList.add('hidden');
    soundOff.classList.remove('hidden');
    if (game.masterGain) {
      game.masterGain.gain.setValueAtTime(0, game.audioCtx.currentTime);
    }
  }
}

// --- INPUT HANDLERS ---
function setupInputs() {
  // DOM element events
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const muteBtn = document.getElementById('muteBtn');
  
  // Toggle sound
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent triggering game action
    toggleMute();
  });
  
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
  });
  
  restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
  });
  
  // Global canvas / container input mapping (Single unified interface)
  const handleAction = (e) => {
    // Ignore key presses or clicks that occur on UI buttons or overlays to prevent multi-firing
    if (e.target && (e.target.closest('button') || e.target.closest('.hud-left') || e.target.closest('.hud-right'))) {
      return;
    }
    
    if (game.state === State.START) {
      startGame();
    } else if (game.state === State.PLAYING) {
      launchPlayer();
    } else if (game.state === State.GAMEOVER) {
      startGame();
    }
    
    // Prevent default scroll/zoom behaviors on tap
    if (e.cancelable) e.preventDefault();
  };
  
  // Touch
  window.addEventListener('touchstart', handleAction, { passive: false });
  // Mouse
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click only
      handleAction(e);
    }
  });
  // Keyboard (Spacebar)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      handleAction(e);
      e.preventDefault();
    }
  });
}

// --- GAME LIFECYCLE ---
function startGame() {
  // Safe init of Audio Context on user action
  initAudio();
  resumeAudio();
  
  // Transition States
  game.state = State.PLAYING;
  
  // Reset Core Stats
  game.score = 0;
  game.multiplier = 1.0;
  game.crystals = 0;
  game.altitude = 0;
  
  // Update HUD values immediately
  updateHUD();
  
  // Hide all screens
  document.getElementById('startScreen').classList.remove('active');
  document.getElementById('gameOverScreen').classList.remove('active');
  
  // Reset Entities
  game.planets = [];
  game.crystalsList = [];
  game.particles = [];
  
  // Initialize camera and generation anchors
  game.cameraY = 0;
  game.targetCameraY = 0;
  game.lastGeneratedY = DESIGN_HEIGHT / 2;
  game.planetCounter = 0;
  
  // Initialize Home Planet at bottom center
  const homePlanet = {
    x: DESIGN_WIDTH / 2,
    y: DESIGN_HEIGHT - 350,
    radius: 95,
    orbitRadius: 150,
    color: '#00f3ff', // neon cyan
    type: 'home',
    orbitalSpeed: 1.4, // rad/sec
    direction: 1, // clockwise
    glowing: true,
    shimmer: 0,
    pulse: 0
  };
  game.planets.push(homePlanet);
  
  // Initialize Player orbiting the home planet
  game.player = {
    x: homePlanet.x,
    y: homePlanet.y - homePlanet.orbitRadius,
    vx: 0,
    vy: 0,
    currentPlanet: homePlanet,
    orbitalAngle: -Math.PI / 2,
    orbitRadius: homePlanet.orbitRadius,
    state: 'orbiting', // 'orbiting' or 'flying'
    radius: 12,
    glow: '#fff',
    trail: [] // line history
  };
  
  // Initialize the Cosmic Void
  game.voidY = DESIGN_HEIGHT + 300; // start way off-screen
  
  // Generate first set of planetary systems above
  generatePlanetaryPath();
}

function gameOver(reason) {
  game.state = State.GAMEOVER;
  
  playExplodeSound();
  
  // Save High Scores
  if (game.altitude > game.highAltitude) {
    game.highAltitude = game.altitude;
    localStorage.setItem('pulsar_highaltitude', game.highAltitude);
  }
  if (game.score > game.highScore) {
    game.highScore = game.score;
    localStorage.setItem('pulsar_highscore', game.highScore);
  }
  
  updateHighScoreUI();
  
  // Display Results
  document.getElementById('deathReason').innerText = reason;
  document.getElementById('finalAltitude').innerText = `${game.altitude}m`;
  document.getElementById('finalCrystals').innerText = game.crystals;
  document.getElementById('finalScore').innerText = formatScore(game.score);
  
  document.getElementById('gameOverScreen').classList.add('active');
}

function formatScore(num) {
  return String(num).padStart(5, '0');
}

function updateHUD() {
  document.getElementById('scoreVal').innerText = formatScore(game.score);
  document.getElementById('multiplierVal').innerText = `x${game.multiplier.toFixed(1)}`;
  document.getElementById('altitudeVal').innerText = `${game.altitude}m`;
}

function updateHighScoreUI() {
  document.getElementById('highScore').innerText = game.highScore;
  document.getElementById('highAltitude').innerText = `${game.highAltitude}m`;
}

// --- PLANETARY PATH GENERATION (PROCEDURAL) ---
function generatePlanetaryPath() {
  // Generate planets up to 2.5 screen heights above current camera view
  const targetY = -game.cameraY - (DESIGN_HEIGHT * 1.5);
  
  // Generate incrementally from the last position
  while (game.lastGeneratedY > targetY) {
    game.planetCounter++;
    
    // Calculate new height step - gets progressively tighter and offset as player goes higher
    const spacing = 450 + Math.random() * 220; // safe jumping range
    const newY = game.lastGeneratedY - spacing;
    
    // Choose horizontal position, avoiding being too close to vertical screen boundaries
    const padding = 150;
    const newX = padding + Math.random() * (DESIGN_WIDTH - padding * 2);
    
    // Diverse Planet Types for unique orbital dynamics
    const rand = Math.random();
    let type = 'normal';
    let color = '#bd00ff'; // default violet
    let radius = 55 + Math.random() * 35;
    let orbitalSpeed = 1.6 + Math.random() * 1.2;
    
    if (rand < 0.22) {
      type = 'pulsar'; // Fast rotation, smaller radius, high risk-reward
      color = '#ff0055'; // neon hot pink
      radius = 35 + Math.random() * 15;
      orbitalSpeed = 3.2 + Math.random() * 1.5;
    } else if (rand > 0.22 && rand < 0.42) {
      type = 'gasgiant'; // Huge capture radius, slow, forgiving
      color = '#ffaa00'; // warm orange
      radius = 110 + Math.random() * 30;
      orbitalSpeed = 0.8 + Math.random() * 0.4;
    } else if (rand > 0.42 && rand < 0.60) {
      type = 'magnet'; // Magneto-planet, pulls crystals in
      color = '#00f3ff'; // neon cyan
      radius = 65 + Math.random() * 20;
      orbitalSpeed = 1.3 + Math.random() * 0.6;
    } else if (rand > 0.82) {
      type = 'decaying'; // Crumbles, orbit size decreases over time
      color = '#9d4edd'; // muted purple
      radius = 60 + Math.random() * 20;
      orbitalSpeed = 1.8 + Math.random() * 0.8;
    }
    
    const direction = Math.random() < 0.5 ? 1 : -1;
    const orbitRadius = radius * (1.5 + Math.random() * 0.5);
    
    const planet = {
      id: game.planetCounter,
      x: newX,
      y: newY,
      radius: radius,
      orbitRadius: orbitRadius,
      originalOrbitRadius: orbitRadius, // used for decaying calculations
      color: color,
      type: type,
      orbitalSpeed: orbitalSpeed,
      direction: direction,
      pulse: 0,
      decayState: 1.0, // 100% stable
      visited: false
    };
    
    game.planets.push(planet);
    
    // Spawn Crystals in orbit or between planets
    spawnCrystalsForPlanet(planet);
    
    // Update gen anchor
    game.lastGeneratedY = newY;
  }
  
  // Clean up old elements below the void to free resources
  cleanupEntities();
}

function spawnCrystalsForPlanet(planet) {
  // Put a few crystals in orbit path
  const numCrystals = 2 + Math.floor(Math.random() * 4);
  const startAngle = Math.random() * Math.PI * 2;
  
  for (let i = 0; i < numCrystals; i++) {
    const angle = startAngle + (i * (Math.PI * 2 / numCrystals));
    const cx = planet.x + Math.cos(angle) * (planet.orbitRadius);
    const cy = planet.y + Math.sin(angle) * (planet.orbitRadius);
    
    game.crystalsList.push({
      x: cx,
      y: cy,
      planetId: planet.id,
      angleOffset: angle,
      radius: 8,
      pulse: Math.random() * Math.PI,
      collected: false,
      isOrbiting: true
    });
  }
  
  // Occasionally spawn a vertical trail of raw stars between planets
  if (Math.random() < 0.4) {
    const numBridge = 3 + Math.floor(Math.random() * 3);
    const prevY = planet.y + 150;
    
    for (let i = 1; i < numBridge; i++) {
      const step = i / numBridge;
      const bx = planet.x + (Math.random() - 0.5) * 80;
      const by = planet.y + step * 250;
      
      game.crystalsList.push({
        x: bx,
        y: by,
        radius: 9,
        pulse: Math.random() * Math.PI,
        collected: false,
        isOrbiting: false
      });
    }
  }
}

function cleanupEntities() {
  const cutoffY = game.voidY + 500;
  
  game.planets = game.planets.filter(p => p.y < cutoffY);
  game.crystalsList = game.crystalsList.filter(c => c.y < cutoffY);
  game.particles = game.particles.filter(p => p.y < cutoffY);
}

// --- LAUNCH ACTION ---
function launchPlayer() {
  if (game.player.state !== 'orbiting') return;
  
  const p = game.player;
  const planet = p.currentPlanet;
  
  // Calculate launch tangent
  // The tangent direction is perpendicular to the vector from planet to player
  const tangentAngle = p.orbitalAngle + (planet.direction * Math.PI / 2);
  
  // Speed escalates slightly as player ascends to keep pacing challenging
  const multiplierClamp = Math.min(game.multiplier, 2.5);
  const launchSpeed = BASE_LAUNCH_SPEED + (multiplierClamp * 80);
  
  p.vx = Math.cos(tangentAngle) * launchSpeed;
  p.vy = Math.sin(tangentAngle) * launchSpeed;
  
  // Launch state transition
  p.state = 'flying';
  p.currentPlanet = null;
  p.orbitRadius = 0;
  
  // Create blast ring particles
  createLaunchParticles(p.x, p.y, tangentAngle);
  
  playLaunchSound();
}

function createLaunchParticles(x, y, angle) {
  // Shockwave ring
  for (let i = 0; i < 20; i++) {
    const a = angle + Math.PI + (Math.random() - 0.5) * 1.5;
    const speed = 100 + Math.random() * 300;
    game.particles.push({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      color: '#00f3ff',
      alpha: 1.0,
      decay: 2.2 + Math.random() * 1.5,
      size: 4 + Math.random() * 4,
      type: 'dust'
    });
  }
}

// --- MAIN LOOP ---
function gameLoop(timestamp) {
  if (!game.lastTime) game.lastTime = timestamp;
  
  // Limit dt to avoid massive physics jumps during stutter
  game.dt = Math.min((timestamp - game.lastTime) / 1000, 0.1);
  game.lastTime = timestamp;
  
  update();
  render();
  
  requestAnimationFrame(gameLoop);
}

// --- UPDATE PHYSICS & STATE ---
function update() {
  if (game.state !== State.PLAYING) return;
  
  const dt = game.dt;
  const p = game.player;
  
  // Update Cosmic Void Position (rising danger)
  // Scaling speed based on current high planet counter (planet score)
  const currentVoidSpeed = VOID_BASE_SPEED + (game.multiplier * VOID_SPEED_RAMP);
  game.voidY -= currentVoidSpeed * dt;
  
  // Player Physics
  if (p.state === 'orbiting') {
    const planet = p.currentPlanet;
    
    // Orbital rotation updates
    p.orbitalAngle += planet.orbitalSpeed * dt * planet.direction;
    
    // Handle Decaying Planet logic
    if (planet.type === 'decaying') {
      planet.decayState -= 0.18 * dt; // decays slowly over ~5.5 seconds
      planet.orbitRadius = planet.originalOrbitRadius * Math.max(0.3, planet.decayState);
      
      // Decay visual particles
      if (Math.random() < 0.15) {
        const da = Math.random() * Math.PI * 2;
        game.particles.push({
          x: planet.x + Math.cos(da) * planet.radius,
          y: planet.y + Math.sin(da) * planet.radius,
          vx: (Math.random() - 0.5) * 80,
          vy: Math.random() * 60 + 20,
          color: planet.color,
          alpha: 1.0,
          decay: 1.2,
          size: 2 + Math.random() * 3,
          type: 'spark'
        });
      }
      
      // Shrink safety clamp - core collapse trigger
      if (planet.decayState <= 0.35) {
        // Core collapses, launcher ejects player unsafely
        launchPlayer();
        planet.type = 'normal'; // stop decay loop
        createShatterParticles(planet.x, planet.y, planet.color, 35);
      }
    }
    
    p.orbitRadius = lerp(p.orbitRadius, planet.orbitRadius, 0.12);
    p.x = planet.x + Math.cos(p.orbitalAngle) * p.orbitRadius;
    p.y = planet.y + Math.sin(p.orbitalAngle) * p.orbitRadius;
    
    p.vx = 0;
    p.vy = 0;
    
    // Save Trail Point
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 25) p.trail.shift();
    
    // Slowly pull camera to center planet being orbited
    game.targetCameraY = -planet.y + (DESIGN_HEIGHT * 0.65);
    
    // Void alert sound/pulse if too close to void boundary
    if (planet.y > game.voidY - 450) {
      if (Math.floor(timestamp() / 250) % 2 === 0) {
        triggerVoidPulseFlash();
      }
    }
  } else if (p.state === 'flying') {
    // Flying Physics
    
    // Attract towards nearest magnet planet if applicable
    applyPlanetaryGravity(dt);
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    // Save Trail Point
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 40) p.trail.shift();
    
    // Camera centers smoothly on flying player
    if (p.y < -game.cameraY + VIEWPORT_PADDING) {
      game.targetCameraY = -p.y + VIEWPORT_PADDING;
    }
    
    // Check gravity field collisions for all planets
    checkForPlanetCapture();
    
    // Check deep space bounds
    if (p.x < -100 || p.x > DESIGN_WIDTH + 100) {
      // Bounce with trail particles
      p.vx = -p.vx * 0.85;
      p.x = p.x < 0 ? 0 : DESIGN_WIDTH;
      playLaunchSound();
    }
  }
  
  // Camera smooth dampening
  game.cameraY = lerp(game.cameraY, game.targetCameraY, game.cameraLerp);
  
  // Calculate raw altitude climbed in meters (design units scaled)
  const homeY = DESIGN_HEIGHT - 350;
  const currentAltitude = Math.max(0, Math.floor((homeY - p.y) / 10));
  if (currentAltitude > game.altitude) {
    game.altitude = currentAltitude;
    updateHUD();
  }
  
  // Update procedural elements
  updatePlanets(dt);
  updateCrystals(dt);
  updateParticles(dt);
  
  // Check Death Conditions
  checkDeathTriggers();
  
  // Continuously populate path ahead
  generatePlanetaryPath();
}

function applyPlanetaryGravity(dt) {
  const p = game.player;
  
  // Find closest planet
  let closest = null;
  let minDist = Infinity;
  
  game.planets.forEach(planet => {
    const dx = planet.x - p.x;
    const dy = planet.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = planet;
    }
  });
  
  // Gravity pull if in gravity well
  if (closest) {
    const grabZone = closest.orbitRadius * 1.9;
    if (minDist < grabZone && minDist > closest.radius) {
      const pullForce = GRAVITY_PULL * (1.0 - (minDist / grabZone));
      const dx = (closest.x - p.x) / minDist;
      const dy = (closest.y - p.y) / minDist;
      
      // Pull velocity slightly
      p.vx += dx * pullForce * dt;
      p.vy += dy * pullForce * dt;
    }
  }
}

function checkForPlanetCapture() {
  const p = game.player;
  
  for (let planet of game.planets) {
    const dx = p.x - planet.x;
    const dy = p.y - planet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Gravitational boundary captures orbit
    // Orbit capture point triggers at the orbit path
    const outerCaptureRadius = planet.orbitRadius * 1.15;
    const innerCaptureRadius = planet.radius + 10;
    
    if (dist <= outerCaptureRadius && dist >= innerCaptureRadius) {
      // Vector projection to see if we're relative or going further away
      const dotProduct = (p.vx * dx + p.vy * dy) / dist;
      
      // If moving towards the planet core, capture is achieved!
      if (dotProduct < 120) { 
        capturePlanet(planet, dist, dx, dy);
        break;
      }
    }
  }
}

function capturePlanet(planet, dist, dx, dy) {
  const p = game.player;
  
  p.state = 'orbiting';
  p.currentPlanet = planet;
  
  // Determine physical angle relative to center
  p.orbitalAngle = Math.atan2(dy, dx);
  p.orbitRadius = dist;
  
  // Determine orbital flow direction dynamically!
  // Cross product of velocity and relative position determines clockwise/counter-clockwise capture
  const crossProduct = dx * p.vy - dy * p.vx;
  planet.direction = crossProduct >= 0 ? 1 : -1;
  
  // Scoring / Chain Combinations
  if (!planet.visited) {
    planet.visited = true;
    
    // Combo multiplier boost on new captures
    game.multiplier += 0.2;
    const addedScore = Math.floor(150 * game.multiplier);
    game.score += addedScore;
    
    // Trigger floating popup indicator
    createScorePopup(planet.x, planet.y - planet.radius - 20, `+${addedScore}`);
  } else {
    // Punish returning/orbit loops slightly by docking multiplier chain
    game.multiplier = Math.max(1.0, game.multiplier - 0.4);
  }
  
  updateHUD();
  playCaptureSound();
  
  // Capture shockwave visual
  createCaptureParticles(p.x, p.y, planet.color);
}

function createCaptureParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 150;
    game.particles.push({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      color: color,
      alpha: 1.0,
      decay: 1.8 + Math.random() * 1.2,
      size: 3 + Math.random() * 3,
      type: 'shimmer'
    });
  }
}

function createScorePopup(x, y, text) {
  game.particles.push({
    x: x,
    y: y,
    vx: 0,
    vy: -60, // ascend upward
    color: '#00f3ff',
    alpha: 1.0,
    decay: 0.8,
    text: text,
    size: 20,
    type: 'popup'
  });
}

function updatePlanets(dt) {
  game.planets.forEach(p => {
    p.shimmer += dt * 3.5;
    p.pulse = Math.sin(p.shimmer) * 4;
  });
}

function updateCrystals(dt) {
  const p = game.player;
  
  game.crystalsList.forEach(c => {
    if (c.collected) return;
    
    c.pulse += dt * 4.0;
    
    // Orbiting Crystals update coordinate step along with planet rotations
    if (c.isOrbiting) {
      const planet = game.planets.find(pl => pl.id === c.planetId);
      if (planet) {
        c.angleOffset += planet.orbitalSpeed * dt * planet.direction;
        c.x = planet.x + Math.cos(c.angleOffset) * planet.orbitRadius;
        c.y = planet.y + Math.sin(c.angleOffset) * planet.orbitRadius;
      }
    }
    
    // Core Magnet Planet gravity attraction
    if (p.currentPlanet && p.currentPlanet.type === 'magnet') {
      const dx = p.currentPlanet.x - c.x;
      const dy = p.currentPlanet.y - c.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < p.currentPlanet.orbitRadius * 1.5) {
        // pull crystals to player
        const cx = p.x - c.x;
        const cy = p.y - c.y;
        const cd = Math.sqrt(cx * cx + cy * cy);
        if (cd > 5) {
          c.x += (cx / cd) * 350 * dt;
          c.y += (cy / cd) * 350 * dt;
        }
      }
    }
    
    // Collision detection with player probe
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= p.radius + c.radius + 4) {
      c.collected = true;
      game.crystals++;
      
      const multiplierReward = 0.1;
      game.multiplier += multiplierReward;
      
      const addedScore = Math.floor(50 * game.multiplier);
      game.score += addedScore;
      
      createScorePopup(c.x, c.y, `+${addedScore}`);
      createShatterParticles(c.x, c.y, '#ffaa00', 10);
      playCollectSound();
      updateHUD();
    }
  });
  
  // Prune collected crystals
  game.crystalsList = game.crystalsList.filter(c => !c.collected);
}

function createShatterParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 250;
    game.particles.push({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      color: color,
      alpha: 1.0,
      decay: 2.5 + Math.random() * 1.8,
      size: 2 + Math.random() * 4,
      type: 'spark'
    });
  }
}

function updateParticles(dt) {
  game.particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha -= p.dt ? p.dt * dt : p.decay * dt;
    
    if (p.type === 'popup') {
      p.size -= dt * 4;
    }
  });
  
  // Prune dead particles
  game.particles = game.particles.filter(p => p.alpha > 0);
}

function triggerVoidPulseFlash() {
  // Safe hook for red pulsing aesthetic
}

function checkDeathTriggers() {
  const p = game.player;
  
  // 1. Consumed by the Rising Void
  if (p.y > game.voidY) {
    gameOver("Consumed by the cosmic void.");
    return;
  }
  
  // 2. Lost in outer space (thrown way below camera bottom bound)
  const cameraBottomBound = -game.cameraY + DESIGN_HEIGHT + 300;
  if (p.y > cameraBottomBound) {
    gameOver("Lost communication probe in deep space.");
    return;
  }
}

function timestamp() {
  return window.performance.now();
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

// --- RENDERING ROUTINES ---
function render() {
  const ctx = game.ctx;
  
  // Clear screen
  ctx.fillStyle = '#03050d';
  ctx.fillRect(0, 0, game.width, game.height);
  
  // Save matrix state for scaled camera space
  ctx.save();
  
  // Apply translation offset & dynamic resizing scale
  ctx.scale(game.scale, game.scale);
  ctx.translate(0, game.cameraY);
  
  // Draw parallax starfield
  drawStarfield();
  
  // Draw glowing Orbit gravity loops
  drawGravityWells();
  
  // Draw Planets
  drawPlanets();
  
  // Draw Crystals
  drawCrystals();
  
  // Draw Player Probe & Thruster Trails
  drawPlayer();
  
  // Draw Particles
  drawParticles();
  
  // Draw Cosmic Void Wave
  drawCosmicVoid();
  
  // Restore transforms
  ctx.restore();
}

function drawStarfield() {
  const ctx = game.ctx;
  
  // Three distinct star layers for maximum depth illusion
  const layers = [
    { density: 40, size: 1.2, speed: 0.1, color: '#444d6d' },
    { density: 30, size: 2.0, speed: 0.25, color: '#747f9d' },
    { density: 15, size: 3.0, speed: 0.5, color: '#a2add0' }
  ];
  
  layers.forEach(l => {
    ctx.fillStyle = l.color;
    
    // Star coords locked mathematically to camera intervals to loop seamlessly
    const spacingY = 960;
    const startY = Math.floor(-game.cameraY * l.speed / spacingY) * spacingY - spacingY;
    const endY = startY + (DESIGN_HEIGHT * 2.5);
    
    for (let cy = startY; cy < endY; cy += spacingY) {
      for (let i = 0; i < l.density; i++) {
        // pseudo random seed generators
        const x = (Math.sin(cy * 13.5 + i * 27.8) * 0.5 + 0.5) * DESIGN_WIDTH;
        const offset = (Math.cos(cy * 9.2 + i * 54.1) * 0.5 + 0.5) * spacingY;
        const y = cy + offset;
        
        ctx.beginPath();
        ctx.arc(x, y, l.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function drawGravityWells() {
  const ctx = game.ctx;
  
  game.planets.forEach(p => {
    // Dotted neon line representing stable orbit trajectory
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 12]);
    ctx.globalAlpha = p.visited ? 0.18 : 0.45;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Clear dash offset
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
  });
}

function drawPlanets() {
  const ctx = game.ctx;
  
  game.planets.forEach(p => {
    // Dynamic glows based on planet color
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15 + p.pulse;
    
    // Draw outer secondary atmospheric halo
    ctx.fillStyle = 'rgba(6, 10, 26, 0.85)';
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4.0;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Clear glow shadows for performance of inner details
    ctx.shadowBlur = 0;
    
    // Inner aesthetics representing planetary cores
    if (p.type === 'home') {
      // Clean target rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius - 20, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'pulsar') {
      // Rotating energetic spiral crossbars
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
      ctx.lineWidth = 5.0;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.shimmer * p.direction * 1.5);
      
      ctx.beginPath();
      ctx.moveTo(-p.radius + 8, 0);
      ctx.lineTo(p.radius - 8, 0);
      ctx.stroke();
      
      ctx.restore();
    } else if (p.type === 'gasgiant') {
      // Soft horizontal planetary bands
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.clip();
      
      ctx.fillStyle = 'rgba(255, 170, 0, 0.15)';
      ctx.fillRect(p.x - p.radius, p.y - 30, p.radius * 2, 12);
      ctx.fillRect(p.x - p.radius, p.y + 10, p.radius * 2, 20);
      
      ctx.restore();
    } else if (p.type === 'decaying') {
      // Crackling crumbling segments
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius - 10, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawCrystals() {
  const ctx = game.ctx;
  
  game.crystalsList.forEach(c => {
    // High-energy diamond crystals
    const rot = c.pulse * 0.5;
    const pulseRadius = c.radius + Math.sin(c.pulse) * 1.5;
    
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(rot);
    
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffaa00';
    
    ctx.beginPath();
    ctx.moveTo(0, -pulseRadius);
    ctx.lineTo(pulseRadius * 0.7, 0);
    ctx.lineTo(0, pulseRadius);
    ctx.lineTo(-pulseRadius * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    
    // Core white sparkles
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    ctx.shadowBlur = 0;
  });
}

function drawPlayer() {
  const p = game.player;
  const ctx = game.ctx;
  
  if (p.trail.length < 2) return;
  
  // Render Dynamic Rocket trail
  ctx.strokeStyle = '#00f3ff';
  ctx.lineCap = 'round';
  
  for (let i = 1; i < p.trail.length; i++) {
    const p1 = p.trail[i - 1];
    const p2 = p.trail[i];
    const progress = i / p.trail.length;
    
    ctx.lineWidth = p.radius * progress * 1.1;
    ctx.globalAlpha = progress * 0.85;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1.0;
  
  // Probe Core Body
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Directional navigation marker/arrow
  let heading = 0;
  if (p.state === 'orbiting') {
    // pointing tangentially
    heading = p.orbitalAngle + (p.currentPlanet.direction * Math.PI / 2);
  } else {
    // pointing along fly speed vector
    heading = Math.atan2(p.vy, p.vx);
  }
  
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#03050d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(heading) * p.radius, p.y + Math.sin(heading) * p.radius);
  ctx.stroke();
}

function drawParticles() {
  const ctx = game.ctx;
  
  game.particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    
    if (p.type === 'popup') {
      ctx.font = `bold ${p.size}px ${varGet('--font-stack')}`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  ctx.globalAlpha = 1.0;
}

function varGet(key) {
  // Safe helper to grab CSS design values without hitting performance
  return "-apple-system, sans-serif";
}

function drawCosmicVoid() {
  const ctx = game.ctx;
  
  // Multilayered lava-like red wave at screen bottom
  const waveHeight = 85;
  const t = timestamp() * 0.003;
  
  ctx.shadowColor = '#ff0055';
  ctx.shadowBlur = 35;
  ctx.fillStyle = 'rgba(255, 0, 85, 0.45)';
  
  // Layer 1
  ctx.beginPath();
  ctx.moveTo(0, game.voidY + waveHeight);
  
  for (let x = 0; x <= DESIGN_WIDTH; x += 30) {
    const y = game.voidY + Math.sin(x * 0.008 + t) * 22;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(DESIGN_WIDTH, game.voidY + 2000);
  ctx.lineTo(0, game.voidY + 2000);
  ctx.closePath();
  ctx.fill();
  
  // Layer 2
  ctx.fillStyle = 'rgba(6, 10, 26, 0.95)';
  ctx.beginPath();
  ctx.moveTo(0, game.voidY + waveHeight + 20);
  
  for (let x = 0; x <= DESIGN_WIDTH; x += 40) {
    const y = game.voidY + 25 + Math.sin(x * 0.012 - t * 1.5) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(DESIGN_WIDTH, game.voidY + 2000);
  ctx.lineTo(0, game.voidY + 2000);
  ctx.closePath();
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  // Alert neon line
  ctx.strokeStyle = '#ff0055';
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.moveTo(0, game.voidY + 25);
  for (let x = 0; x <= DESIGN_WIDTH; x += 40) {
    const y = game.voidY + 25 + Math.sin(x * 0.012 - t * 1.5) * 15;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}
