# PULSAR: Orbital Escape

An elegant, timing-based orbital mechanics climber built for the One-Button Game Benchmark.

## What is the game?

**PULSAR: Orbital Escape** is an arcade-style vertical climber where the player pilots a deep-space exploration probe ascending through procedurally generated planetary systems. A surging wave of energetic red particle energy—the **Cosmic Void**—is rising from the bottom of the star system, forcing you to constantly climb. 

To climb, you must slingshot from the orbit of one planet to another, collecting energy crystals, building multipliers, and avoiding drifting into the freezing cold of deep space or getting consumed by the Void.

## The One-Button Control

The entire game is played using **exactly one button** (the unified interface supports `Space` on desktop, a tap on mobile, or left click with a mouse):

- **In Menus:** Starts or restarts the game.
- **In Game:** Launches the probe tangentially out of its current orbit.

When the probe is flying through space, it will automatically get captured by the gravitational field of any planet it crosses.

## Objectives & Scoring

1. **Ascend to High Altitudes:** Your distance climbed is tracked in meters.
2. **Collect Energy Crystals:** Crystals float in orbits or between planets. Gathering them increases your score and boosts your multiplier.
3. **Build Multiplier Combos:**
   - Slingshotting to new planets increases your multiplier.
   - Collecting crystals increases your multiplier.
   - Returning to a planet you already visited, or getting stuck looping, decays your multiplier.
4. **Survive the Hazards:**
   - **The Cosmic Void:** Constantly rises from the bottom of the viewport. It moves faster as you go higher. Staying in orbit too long will get you consumed.
   - **Decaying Planets:** Some purple-hued planets are unstable. Staying on them causes their orbits to decay and shrink until the core collapses, forcefully ejecting you.

## Features & Implementation

- **Procedural Synthesizer:** Built completely on the Web Audio API. Generates atmospheric bass/harmonic space pads and dynamic, multi-frequency sound effects (launch swoops, major-chord capture chime, crystalline pick-ups, sub-bass explosion) procedurally without external assets.
- **Dynamic Physics Capture:** Orbit direction is computed dynamically on capture. Slingshotting is physically accurate based on the tangent angle at the moment of launch, and planets apply gravitational attraction to the probe in flight.
- **Diverse Planet Archetypes:**
  - *Standard Planets:* Reliable, standard orbits.
  - *Pulsars:* Small, rapid-spinning pink bodies with high tangential speeds.
  - *Gas Giants:* Massive orange gravity wells with larger capture zones but slower rotation speeds.
  - *Magnet Planets:* Neon cyan magnetic fields that pull crystals directly towards the probe.
  - *Decaying Planets:* Collapsing violet structures that crumble and shrink under the probe's weight.
- **Juicy Graphics:** Custom parallax starfields, vector glow canvas rendering, fluid rocket trails, shatter/capture particle blasts, and fluid CSS-glassmorphic HUD and card structures.
- **Adaptive Screen Scaling:** Maintains consistent game layout and aspect ratios on any resolution (mobile or desktop).
