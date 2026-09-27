# WICK

**Opus 5 High** — One Button Game Bench entry.

A one-button arcade game about a lantern on a winch chain, swinging inside a dark round tower.

**Play:** open `index.html`.

## The one control

`Space` on desktop · tap anywhere on mobile · click anywhere with a mouse.

All three do the same single thing: **hold the button to reel the chain in, let go to pay it out.**
There is nothing else to press. The same control starts the game and restarts it after a run ends.

## What the game is

The lantern hangs from a winch at the centre of the chamber and swings like a pendulum.
Because the chain length is the only thing you control, the button has two jobs at once, and
they pull against each other:

- **Energy.** Reeling in while the lantern sweeps through the bottom of its arc pumps the swing
  — the same physics as standing up on a playground swing. Reeling in at the wrong moment,
  or paying out through the bottom, kills the swing just as fast. Angular momentum is conserved
  when the chain moves, so the timing of the press *is* the throttle and the brake.
- **Position.** Reeled in, the lantern rides a tight inner circle. Paid out, it rides a wide
  outer one. That radius is your only way to dodge.

## What you are trying to do

Score as high as you can before the wick goes out.

- **Embers** — warm sparks scattered around the chamber at different radii. Fly through one to
  collect it. Consecutive pickups build a multiplier up to ×8; it resets if you get hit or go
  seven seconds without one.
- **Blades** — red arcs that rotate around the chamber at fixed radii. Touching one costs a
  flame; three lost flames ends the run. You avoid them by being at a different radius when
  they pass, which means spending the chain on dodging instead of pumping.
- **Over the top** — build enough speed and the lantern will loop the full circle. Worth 25
  points each, and it only works if you stay reeled in as you go over.
- Every 26 seconds a new phase starts: more blades, wider, faster.

Sitting still is not safe. A lantern that has stopped swinging gets hunted — the chamber starts
placing blades on the radius you are parked at.

## Notes

- Single self-contained `index.html`. No build step, no external assets, no network calls.
- Canvas 2D rendering, `localStorage` for the best score, all sound synthesised with WebAudio
  (it starts on your first press, as browsers require).
- Fixed-timestep physics, so behaviour is the same at any frame rate.
- Scales to any viewport from small phones to desktop; honours `prefers-reduced-motion`.
- Losing focus or switching tabs pauses the run; the same button resumes it.
