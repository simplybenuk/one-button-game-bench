/**
 * Q-SWING: Quantum Node Surfer
 * An original, ultra-polished, procedurally generated one-button browser game.
 * Uses Web Audio API for custom sound synthesis and Canvas API for rich physical simulation and visual feedback.
 */

// --- CONFIGURATION ---
const CONFIG = {
  GRAVITY: 0.18,          // Downward pull in pixels/frame^2
  MAX_SPEED: 18,          // Terminal velocity limit
  MIN_SPEED: 4,           // Minimum speed to prevent getting stuck
  HOOK_RANGE: 170,        // Max distance to lock onto a node
  CAMERA_DAMPING: 0.1,    // Camera lag smoothing
  SPAWN_INTERVAL: 140,    // Spawn new nodes every X vertical pixels
  SHIELD_MAX: 3,          // Start shield charges
  COLORS: {
    background: '#03030c',
    player: '#00f2fe',
    playerTrail: '#ff007f',
    nodeStable: '#00f2fe',
    nodeDecay: '#ff3333',
    nodeBoost: '#00ff87',
    packet: '#ffd700',
    hazard: '#ff0055',
    grid: 'rgba(79, 172, 254, 0.08)'
  }
};

// --- AUDIO CONTROLLER (Web Audio API Synthesizer) ---
class AudioController {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmOsc = null;
    this.bgmGain = null;
    this.masterGain = null;
    this.tempo = 140; // BPM
    this.seqStep = 0;
    this.seqInterval = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      
      // Start a low rhythmic synth background music sequence
      this.startBGM();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Synthesis sound generators
  playHook() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // Quick laser ZIP sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    
    // Add bandpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.12);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playRelease() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // Wind whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCollect() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // High neon pentatonic chime
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    // Beautiful fifth chord
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.linearRampToValueAtTime(1318.51, now + 0.15); // E6
    
    osc2.frequency.setValueAtTime(1479.98, now); // F#6
    osc2.frequency.linearRampToValueAtTime(1975.53, now + 0.15); // B6
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  playHit() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // Low distorted noise boom for shield loss
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createOscillator(); // retro synth fake noise
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.3);
    
    noise.type = 'square';
    noise.frequency.setValueAtTime(40, now);
    noise.frequency.setValueAtTime(220, now + 0.05);
    noise.frequency.setValueAtTime(70, now + 0.1);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc.connect(gain);
    noise.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.4);
    noise.stop(now + 0.4);
  }

  playExplosion() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // Low sub-bass rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(20, now + 0.5);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playGameOver() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // Desolate sweeping sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 1.5);
  }

  startBGM() {
    const stepDuration = 60 / this.tempo / 2; // Eighth notes
    
    const bassline = [55.00, 55.00, 65.41, 65.41, 58.27, 58.27, 48.99, 48.99]; // A1, C2, D2, G1
    
    this.seqInterval = setInterval(() => {
      if (!this.ctx || this.muted) return;
      
      const now = this.ctx.currentTime;
      const noteFreq = bassline[this.seqStep % bassline.length];
      
      // Every step, spawn a quick sub-synth beat
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, now);
      
      // Kick transient
      if (this.seqStep % 4 === 0) {
        osc.frequency.setValueAtTime(noteFreq * 2, now);
        osc.frequency.exponentialRampToValueAtTime(noteFreq, now + 0.05);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      } else {
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      }
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + 0.25);
      
      // Add periodic synth beep on key highlights (step 6, 14)
      if (this.seqStep % 8 === 6) {
        const blip = this.ctx.createOscillator();
        const blipGain = this.ctx.createGain();
        blip.type = 'sine';
        blip.frequency.setValueAtTime(noteFreq * 8, now);
        blipGain.gain.setValueAtTime(0.04, now);
        blipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        blip.connect(blipGain);
        blipGain.connect(this.masterGain);
        blip.start(now);
        blip.stop(now + 0.2);
      }
      
      this.seqStep++;
    }, stepDuration * 1000);
  }

  stopBGM() {
    if (this.seqInterval) {
      clearInterval(this.seqInterval);
      this.seqInterval = null;
    }
  }
}

const audio = new AudioController();

// --- VECTOR MATH HELPER ---
const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

// --- MAIN GAME CLASS ---
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Viewport and camera setup
    this.width = 480;
    this.height = 800;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.score = 0;
    this.maxHeight = 0;
    this.shakeIntensity = 0;
    this.state = 'START'; // START, PLAYING, GAMEOVER
    
    // Physics entities
    this.player = null;
    this.nodes = [];
    this.dataPackets = [];
    this.hazards = [];
    this.particles = [];
    
    // Dynamic generation tracker
    this.lastSpawnY = 0;
    this.gridOffset = 0;
    
    // UI Connections
    this.scoreEl = document.getElementById('score-val');
    this.heightEl = document.getElementById('height-val');
    this.shieldBarEl = document.getElementById('shield-bar');
    this.goScoreEl = document.getElementById('go-score');
    this.goHeightEl = document.getElementById('go-height');
    this.newHighScoreEl = document.getElementById('new-high-score-badge');
    this.highScoreEl = document.getElementById('high-score-val');
    
    this.initCanvas();
    this.initEventListeners();
    this.loadHighScore();
    
    // Start animation loop
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  initCanvas() {
    // Sharp high DPI rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Setup virtual dimensions keeping 480x800 aspect ratio nicely
    const ratio = 480 / 800;
    let w = window.innerWidth;
    let h = window.innerHeight;
    
    if (w / h > ratio) {
      w = h * ratio;
    } else {
      h = w / ratio;
    }
    
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.width = w;
    this.height = h;
    
    // Adjust configurations to scale relatively
    this.scaleFactor = this.width / 480;
    this.hookRangeScaled = CONFIG.HOOK_RANGE * this.scaleFactor;
  }

  initEventListeners() {
    // Action Event triggers: Click/Touch/Space
    const triggerAction = (e) => {
      if (e) {
        if (e.key && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
      }
      this.handleAction();
    };

    window.addEventListener('keydown', triggerAction);
    this.canvas.addEventListener('mousedown', triggerAction);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      triggerAction();
    }, { passive: false });

    // Audio toggle
    const audioBtn = document.getElementById('audio-toggle');
    const onSvg = document.getElementById('sound-on-svg');
    const offSvg = document.getElementById('sound-off-svg');

    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.init();
      const muted = audio.toggleMute();
      if (muted) {
        onSvg.classList.add('hidden');
        offSvg.classList.remove('hidden');
      } else {
        onSvg.classList.remove('hidden');
        offSvg.classList.add('hidden');
      }
    });

    // Handle screen resizing
    window.addEventListener('resize', () => {
      this.initCanvas();
    });
  }

  loadHighScore() {
    const hs = localStorage.getItem('qswing_highscore') || '0';
    this.highScoreEl.textContent = String(hs).padStart(5, '0');
  }

  saveHighScore() {
    const hs = parseInt(localStorage.getItem('qswing_highscore') || '0', 10);
    if (this.score > hs) {
      localStorage.setItem('qswing_highscore', this.score);
      this.loadHighScore();
      return true;
    }
    return false;
  }

  resetGame() {
    this.score = 0;
    this.maxHeight = 0;
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.shakeIntensity = 0;
    
    // Initialize Player
    this.player = {
      x: this.width / 2,
      y: this.height - 150,
      vx: 4 * this.scaleFactor,
      vy: -10 * this.scaleFactor,
      radius: 9 * this.scaleFactor,
      shield: CONFIG.SHIELD_MAX,
      trail: [],
      hookedTo: null,
      hookAngle: 0,
      hookRadius: 0,
      hookSpeed: 0,
      hookDir: 1, // 1 for CW, -1 for CCW
      boostActive: false,
      invulnFrames: 0
    };
    
    this.nodes = [];
    this.dataPackets = [];
    this.hazards = [];
    this.particles = [];
    
    // Initial nodes setup
    this.lastSpawnY = this.height - 150;
    
    // First node directly in front of the player's launch
    this.nodes.push({
      id: 0,
      x: this.width / 2,
      y: this.height - 350,
      radius: 16 * this.scaleFactor,
      type: 'stable',
      pulse: 0
    });
    
    // Generate a few upfront nodes
    this.generateWorld(this.height - 1200);
    
    this.scoreEl.textContent = '00000';
    this.heightEl.textContent = '0m';
    this.updateShieldUI();
  }

  updateShieldUI() {
    const percentage = (this.player.shield / CONFIG.SHIELD_MAX) * 100;
    this.shieldBarEl.style.width = `${percentage}%`;
  }

  // Handle single action mechanism
  handleAction() {
    audio.init(); // Initialize audio context on first action
    
    if (this.state === 'START') {
      this.resetGame();
      this.state = 'PLAYING';
      document.getElementById('screen-start').classList.remove('active');
    } else if (this.state === 'GAMEOVER') {
      this.resetGame();
      this.state = 'PLAYING';
      document.getElementById('screen-gameover').classList.remove('active');
    } else if (this.state === 'PLAYING') {
      const p = this.player;
      
      if (p.hookedTo) {
        // --- RELEASE MECHANIC ---
        const n = p.hookedTo;
        
        // Calculate tangent vector
        const tangentX = -Math.sin(p.hookAngle) * p.hookDir;
        const tangentY = Math.cos(p.hookAngle) * p.hookDir;
        
        // Linear velocity based on orbit speed
        let speed = p.hookSpeed * p.hookRadius;
        
        // Safety: Keep speed within boundaries
        speed = Math.max(CONFIG.MIN_SPEED * this.scaleFactor, Math.min(speed, CONFIG.MAX_SPEED * this.scaleFactor));
        
        // Apply launch velocity
        p.vx = tangentX * speed;
        p.vy = tangentY * speed;
        
        // Apply slight boost for perfect physical release momentum feel
        p.vx *= 1.1;
        p.vy *= 1.1;
        
        if (n.type === 'boost') {
          p.vx *= 1.35;
          p.vy *= 1.35;
          p.boostActive = true;
          this.triggerScreenShake(8);
          // Spawn boost trail particles
          this.spawnBurst(p.x, p.y, CONFIG.COLORS.nodeBoost, 15, 5);
        } else {
          p.boostActive = false;
          this.spawnBurst(p.x, p.y, CONFIG.COLORS.player, 8, 3);
        }
        
        p.hookedTo = null;
        audio.playRelease();
      } else {
        // --- HOOK MECHANIC ---
        // Find nearest node in range
        let bestNode = null;
        let minD = this.hookRangeScaled;
        
        for (const n of this.nodes) {
          const d = distance(p.x, p.y, n.x, n.y);
          if (d < minD) {
            minD = d;
            bestNode = n;
          }
        }
        
        if (bestNode) {
          p.hookedTo = bestNode;
          p.hookRadius = minD;
          
          // Calculate angle from node to player
          p.hookAngle = Math.atan2(p.y - bestNode.y, p.x - bestNode.x);
          
          // Determine swing direction (CW or CCW) based on 2D cross product of velocity and relative position
          const dx = p.x - bestNode.x;
          const dy = p.y - bestNode.y;
          const crossProduct = dx * p.vy - dy * p.vx;
          p.hookDir = crossProduct >= 0 ? 1 : -1;
          
          // Calculate angular speed based on current linear speed
          const currentLinearSpeed = Math.hypot(p.vx, p.vy);
          p.hookSpeed = Math.max(0.04, currentLinearSpeed / p.hookRadius);
          
          // Cap angular speed to prevent crazy high orbits on tiny hooks
          p.hookSpeed = Math.min(p.hookSpeed, 0.15);
          
          // Decaying node activation
          if (bestNode.type === 'decay' && !bestNode.activeTime) {
            bestNode.activeTime = Date.now();
          }
          
          audio.playHook();
          this.spawnBurst(p.x, p.y, CONFIG.COLORS.player, 5, 2);
        }
      }
    }
  }

  triggerScreenShake(intensity) {
    this.shakeIntensity = intensity;
  }

  spawnBurst(x, y, color, count = 10, maxSpeed = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.8) * maxSpeed * this.scaleFactor;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (1 + Math.random() * 3) * this.scaleFactor,
        color: color,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  generateWorld(targetY) {
    while (this.lastSpawnY > targetY) {
      this.lastSpawnY -= CONFIG.SPAWN_INTERVAL * this.scaleFactor;
      
      // Horizontal jitter with safety margin near edge of viewport
      const margin = 50 * this.scaleFactor;
      const spawnX = margin + Math.random() * (this.width - margin * 2);
      
      // Determine node type procedurally based on current height
      // Height increases -> harder types appear more frequently
      const heightIndex = Math.abs(this.lastSpawnY) / 1000;
      const r = Math.random();
      
      let type = 'stable';
      if (heightIndex > 0.8) {
        if (r < 0.3) type = 'decay';
        else if (r < 0.45) type = 'boost';
      } else if (heightIndex > 0.3) {
        if (r < 0.2) type = 'decay';
        else if (r < 0.3) type = 'boost';
      }
      
      const node = {
        id: this.nodes.length + 1,
        x: spawnX,
        y: this.lastSpawnY,
        radius: (13 + Math.random() * 6) * this.scaleFactor,
        type: type,
        pulse: Math.random() * Math.PI
      };
      
      this.nodes.push(node);
      
      // Procedurally spawn Data Packets near this node or on path
      if (Math.random() < 0.7) {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = (50 + Math.random() * 40) * this.scaleFactor;
        this.dataPackets.push({
          x: node.x + Math.cos(offsetAngle) * offsetDist,
          y: node.y + Math.sin(offsetAngle) * offsetDist,
          collected: false,
          size: 6 * this.scaleFactor,
          pulse: Math.random() * Math.PI
        });
      }
      
      // Spawn Hazards in higher layers
      if (heightIndex > 0.5 && Math.random() < 0.4) {
        const hazardX = margin + Math.random() * (this.width - margin * 2);
        // Ensure hazard isn't too close to the node
        if (distance(hazardX, this.lastSpawnY + 50, node.x, node.y) > 90 * this.scaleFactor) {
          this.hazards.push({
            x: hazardX,
            y: this.lastSpawnY + (Math.random() * 40 - 20) * this.scaleFactor,
            radius: (8 + Math.random() * 6) * this.scaleFactor,
            pulse: Math.random() * Math.PI,
            vx: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.5) * this.scaleFactor
          });
        }
      }
    }
    
    // Prune distant objects to keep performance high
    const lowestVisibleY = this.cameraY + this.height + 200;
    this.nodes = this.nodes.filter(n => n.y < lowestVisibleY);
    this.dataPackets = this.dataPackets.filter(p => p.y < lowestVisibleY && !p.collected);
    this.hazards = this.hazards.filter(h => h.y < lowestVisibleY);
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;
    
    const p = this.player;
    
    // Decrease invulnerability frames
    if (p.invulnFrames > 0) p.invulnFrames--;
    
    // --- PHYSICS UPDATE ---
    if (p.hookedTo) {
      // Swing movement
      const n = p.hookedTo;
      
      // Increase angular position based on angular velocity
      p.hookAngle += p.hookSpeed * p.hookDir;
      
      // Anchor player coordinates around node
      p.x = n.x + Math.cos(p.hookAngle) * p.hookRadius;
      p.y = n.y + Math.sin(p.hookAngle) * p.hookRadius;
      
      // Empty velocity (it will be calculated at launch)
      p.vx = 0;
      p.vy = 0;
      
      // Decay node timing logic
      if (n.type === 'decay' && n.activeTime) {
        const elapsed = Date.now() - n.activeTime;
        if (elapsed >= 1500) {
          // Explode the node!
          this.triggerScreenShake(12);
          this.spawnBurst(n.x, n.y, CONFIG.COLORS.nodeDecay, 25, 6);
          audio.playExplosion();
          
          // Unhook
          p.hookedTo = null;
          p.boostActive = false;
          
          // Damage player if they are still within blast zone
          const distToBlast = distance(p.x, p.y, n.x, n.y);
          if (distToBlast < 150 * this.scaleFactor) {
            this.damagePlayer();
            // Launch player away from explosion
            const blastAngle = Math.atan2(p.y - n.y, p.x - n.x);
            p.vx = Math.cos(blastAngle) * 12 * this.scaleFactor;
            p.vy = Math.sin(blastAngle) * 12 * this.scaleFactor;
          }
          
          // Remove this node from active list
          this.nodes = this.nodes.filter(item => item.id !== n.id);
        }
      }
    } else {
      // Free falling / flying physics
      p.vy += CONFIG.GRAVITY * this.scaleFactor;
      
      // Speed cap safety
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > CONFIG.MAX_SPEED * this.scaleFactor) {
        p.vx = (p.vx / speed) * CONFIG.MAX_SPEED * this.scaleFactor;
        p.vy = (p.vy / speed) * CONFIG.MAX_SPEED * this.scaleFactor;
      }
      
      p.x += p.vx;
      p.y += p.vy;
      
      // Horizontal bounds bounce with visual effect
      const margin = p.radius;
      if (p.x < margin) {
        p.x = margin;
        p.vx = -p.vx * 0.7;
        this.spawnBurst(p.x, p.y, CONFIG.COLORS.player, 4, 2);
        this.triggerScreenShake(2);
      } else if (p.x > this.width - margin) {
        p.x = this.width - margin;
        p.vx = -p.vx * 0.7;
        this.spawnBurst(p.x, p.y, CONFIG.COLORS.player, 4, 2);
        this.triggerScreenShake(2);
      }
    }
    
    // --- PLAYER TRAIL RECORDING ---
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 18) p.trail.shift();
    
    // --- COLLISION CHECKS ---
    // 1. Data Packets
    for (const dp of this.dataPackets) {
      if (!dp.collected && distance(p.x, p.y, dp.x, dp.y) < p.radius + dp.size + 6 * this.scaleFactor) {
        dp.collected = true;
        this.score += 150;
        audio.playCollect();
        this.spawnBurst(dp.x, dp.y, CONFIG.COLORS.packet, 12, 3.5);
      }
    }
    
    // 2. Hazards
    for (const h of this.hazards) {
      // Horizontal sweep moving hazards
      h.x += h.vx;
      if (h.x < h.radius || h.x > this.width - h.radius) {
        h.vx = -h.vx;
      }
      
      if (p.invulnFrames === 0 && distance(p.x, p.y, h.x, h.y) < p.radius + h.radius) {
        this.damagePlayer();
        this.triggerScreenShake(14);
        
        // Bounce player back
        const hitAngle = Math.atan2(p.y - h.y, p.x - h.x);
        p.vx = Math.cos(hitAngle) * 9 * this.scaleFactor;
        p.vy = Math.sin(hitAngle) * 9 * this.scaleFactor;
        
        if (p.hookedTo) {
          p.hookedTo = null;
        }
      }
    }
    
    // --- CAMERA SCROLL LOGIC ---
    // Viewport moves smoothly when player goes high
    const targetY = p.y - this.height * 0.58;
    if (targetY < this.targetCameraY) {
      this.targetCameraY = targetY;
    }
    
    this.cameraY += (this.targetCameraY - this.cameraY) * CONFIG.CAMERA_DAMPING;
    
    // --- PROCEDURAL GENERATION TRIGGER ---
    this.generateWorld(this.cameraY - 400);
    
    // --- SCORING & TRACKING HEIGHT ---
    const rawHeight = Math.floor(Math.abs(p.y - (this.height - 150)) / 10);
    if (rawHeight > this.maxHeight) {
      const addedHeight = rawHeight - this.maxHeight;
      this.maxHeight = rawHeight;
      this.score += addedHeight * 2; // heights adds to score
    }
    
    // Update Score and Height HUD
    this.scoreEl.textContent = String(this.score).padStart(5, '0');
    this.heightEl.textContent = `${this.maxHeight}m`;
    
    // --- PARTICLES UPDATE ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
    
    // --- FAILURE CONDITION: FALL OFF BOTTOM ---
    const failThreshold = this.cameraY + this.height + 60;
    if (p.y > failThreshold) {
      this.triggerGameOver();
    }
  }

  damagePlayer() {
    const p = this.player;
    p.shield--;
    p.invulnFrames = 45; // 0.75 seconds invulnerability
    this.spawnBurst(p.x, p.y, CONFIG.COLORS.hazard, 20, 5);
    audio.playHit();
    this.updateShieldUI();
    
    if (p.shield <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    audio.playGameOver();
    this.triggerScreenShake(18);
    this.spawnBurst(this.player.x, this.player.y, CONFIG.COLORS.playerTrail, 35, 7);
    
    // Update GameOver screen elements
    this.goScoreEl.textContent = this.score;
    this.goHeightEl.textContent = `${this.maxHeight}m`;
    
    const isNewRecord = this.saveHighScore();
    if (isNewRecord) {
      this.newHighScoreEl.style.display = 'block';
    } else {
      this.newHighScoreEl.style.display = 'none';
    }
    
    document.getElementById('screen-gameover').classList.add('active');
  }

  // --- RENDERING PIPELINE ---
  draw() {
    const ctx = this.ctx;
    
    ctx.clearRect(0, 0, this.width, this.height);
    
    // CAMERA SCREEN SHAKE TRANSLATION
    ctx.save();
    if (this.shakeIntensity > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity * this.scaleFactor;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * this.scaleFactor;
      ctx.translate(dx, dy);
      this.shakeIntensity *= 0.88; // decay
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }
    
    // Offset background camera scroll coordinate
    const camYOffset = -this.cameraY;
    
    // 1. DYNAMIC NEON GRID BACKDROP (Parallax)
    ctx.strokeStyle = CONFIG.COLORS.grid;
    ctx.lineWidth = 1;
    const gridSize = 40 * this.scaleFactor;
    const startGridX = 0;
    const gridYScroll = (camYOffset * 0.4) % gridSize; // 0.4 parallax multiplier
    
    ctx.beginPath();
    // Vertical lines
    for (let x = startGridX; x < this.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    // Horizontal lines
    for (let y = gridYScroll; y < this.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
    
    // 2. DRAW TARGET/CONNECTION LINE
    if (this.state === 'PLAYING') {
      const p = this.player;
      if (p.hookedTo) {
        // Active Hook Line
        ctx.strokeStyle = CONFIG.COLORS.player;
        ctx.lineWidth = 2.5 * this.scaleFactor;
        ctx.shadowColor = CONFIG.COLORS.player;
        ctx.shadowBlur = 12 * this.scaleFactor;
        
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + camYOffset);
        ctx.lineTo(p.hookedTo.x, p.hookedTo.y + camYOffset);
        ctx.stroke();
        
        ctx.shadowBlur = 0; // reset glow
      } else {
        // Potential Lock-on Dotted Line
        let bestNode = null;
        let minD = this.hookRangeScaled;
        
        for (const n of this.nodes) {
          const d = distance(p.x, p.y, n.x, n.y);
          if (d < minD) {
            minD = d;
            bestNode = n;
          }
        }
        
        if (bestNode) {
          ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
          ctx.lineWidth = 1.5 * this.scaleFactor;
          ctx.setLineDash([4 * this.scaleFactor, 4 * this.scaleFactor]);
          
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + camYOffset);
          ctx.lineTo(bestNode.x, bestNode.y + camYOffset);
          ctx.stroke();
          
          ctx.setLineDash([]); // reset dashes
        }
      }
    }
    
    // 3. DRAW DATA PACKETS (Stars)
    for (const dp of this.dataPackets) {
      if (dp.collected) continue;
      
      dp.pulse += 0.05;
      const sizeOffset = Math.sin(dp.pulse) * 1.5 * this.scaleFactor;
      const finalSize = dp.size + sizeOffset;
      
      ctx.fillStyle = CONFIG.COLORS.packet;
      ctx.shadowColor = CONFIG.COLORS.packet;
      ctx.shadowBlur = 10 * this.scaleFactor;
      
      // Star drawing path
      ctx.beginPath();
      const spikes = 5;
      const outerRad = finalSize;
      const innerRad = finalSize * 0.4;
      let cx = dp.x;
      let cy = dp.y + camYOffset;
      
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRad);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRad;
        y = cy + Math.sin(rot) * outerRad;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRad;
        y = cy + Math.sin(rot) * innerRad;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRad);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
    }
    
    // 4. DRAW HAZARDS (Volatile Reefs / Mines)
    for (const h of this.hazards) {
      h.pulse += 0.08;
      const pulseRadius = h.radius + Math.sin(h.pulse) * 2 * this.scaleFactor;
      const yOffset = h.y + camYOffset;
      
      ctx.fillStyle = CONFIG.COLORS.hazard;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 * this.scaleFactor;
      ctx.shadowColor = CONFIG.COLORS.hazard;
      ctx.shadowBlur = 15 * this.scaleFactor;
      
      // Spiky ball representing unstable quantum debris
      ctx.beginPath();
      const points = 12;
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points;
        const rad = i % 2 === 0 ? pulseRadius : pulseRadius * 0.65;
        const sx = h.x + Math.cos(angle) * rad;
        const sy = yOffset + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Hazard pulsing core
      ctx.fillStyle = '#03030c';
      ctx.beginPath();
      ctx.arc(h.x, yOffset, h.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    }
    
    // 5. DRAW NODES
    for (const n of this.nodes) {
      n.pulse += 0.02;
      const cy = n.y + camYOffset;
      
      // Node core and outer orbital ring decoration
      let primaryColor = CONFIG.COLORS.nodeStable;
      if (n.type === 'decay') primaryColor = CONFIG.COLORS.nodeDecay;
      if (n.type === 'boost') primaryColor = CONFIG.COLORS.nodeBoost;
      
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 10 * this.scaleFactor;
      ctx.lineWidth = 2 * this.scaleFactor;
      
      // Outer ring
      ctx.strokeStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(n.x, cy, n.radius + (5 + Math.sin(n.pulse) * 3) * this.scaleFactor, 0, Math.PI * 2);
      ctx.stroke();
      
      // Node core solid fill
      ctx.fillStyle = CONFIG.COLORS.background;
      ctx.beginPath();
      ctx.arc(n.x, cy, n.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(n.x, cy, n.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      
      // Unique characteristics
      if (n.type === 'decay') {
        // Red visual sector representation for decay countdown
        if (n.activeTime) {
          const elapsed = Date.now() - n.activeTime;
          const ratio = Math.max(0, 1 - elapsed / 1500);
          
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3 * this.scaleFactor;
          ctx.beginPath();
          ctx.arc(n.x, cy, n.radius * 1.3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
          ctx.stroke();
        }
      } else if (n.type === 'boost') {
        // Green rotating booster arrows
        ctx.strokeStyle = CONFIG.COLORS.nodeBoost;
        ctx.lineWidth = 1.5 * this.scaleFactor;
        ctx.save();
        ctx.translate(n.x, cy);
        ctx.rotate(n.pulse * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, n.radius * 1.5, -0.4, 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, n.radius * 1.5, Math.PI - 0.4, Math.PI + 0.4);
        ctx.stroke();
        ctx.restore();
      }
      
      ctx.shadowBlur = 0;
    }
    
    // 6. DRAW PARTICLES
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.shadowBlur = 0;
      
      ctx.beginPath();
      ctx.arc(pt.x, pt.y + camYOffset, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0; // Reset alpha
    
    // 7. DRAW PLAYER
    if (this.state === 'PLAYING' || this.state === 'GAMEOVER' && this.player.shield > 0) {
      const p = this.player;
      const py = p.y + camYOffset;
      
      // Trail
      if (p.trail.length > 1) {
        ctx.lineWidth = 4 * this.scaleFactor;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < p.trail.length - 1; i++) {
          const start = p.trail[i];
          const end = p.trail[i + 1];
          const ratio = i / p.trail.length;
          
          // Smooth fade trail color from pink to cyan
          ctx.strokeStyle = CONFIG.COLORS.playerTrail;
          ctx.globalAlpha = ratio * 0.7;
          
          ctx.beginPath();
          ctx.moveTo(start.x, start.y + camYOffset);
          ctx.lineTo(end.x, end.y + camYOffset);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0; // Reset
      }
      
      // Invulnerability flicker
      let drawPlayer = true;
      if (p.invulnFrames > 0 && Math.floor(p.invulnFrames / 3) % 2 === 0) {
        drawPlayer = false;
      }
      
      if (drawPlayer) {
        // Glow effect
        ctx.fillStyle = CONFIG.COLORS.player;
        ctx.shadowColor = p.boostActive ? CONFIG.COLORS.nodeBoost : CONFIG.COLORS.player;
        ctx.shadowBlur = (p.boostActive ? 22 : 14) * this.scaleFactor;
        
        // Inner white core, outer colored glow
        ctx.beginPath();
        ctx.arc(p.x, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, py, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.restore(); // Restore camera shake offset
  }

  // GAME LOOP
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    
    this.update(dt);
    this.draw();
    
    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate game after fonts/DOM load completely
window.addEventListener('load', () => {
  new Game();
});
