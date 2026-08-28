# One Button Game Bench

A simple benchmark for testing the game-building capabilities of AI models.

Each model receives the **same prompt**, the **same technical constraints**, and its own directory in this repository.

The challenge is deliberately open-ended: build the best original browser game possible using only **one player control**.

## The Benchmark

The player has one control:

- `Space` on desktop
- Tap on mobile
- Click with a mouse

Everything else is up to the model.

The benchmark is designed to test:

- Creativity
- Game design
- Visual design
- Technical implementation
- Game feel
- Ability to create depth from a severe constraint
- Ability to autonomously deliver a finished, playable result

## Benchmark Prompt

The exact prompt given to every model is available in:

[`benchmark-prompt.md`](./benchmark-prompt.md)

## Games

Each model has its own directory containing its complete submission.

The repository root contains a simple `index.html` linking to each game.

No model is permitted to modify another model's submission.

## Running

Everything is static and designed to run directly on GitHub Pages.

No backend or build process is required.

Open the GameBench GitHub Pages site and choose a model to play its submission.

## Principle

Same prompt. Same constraints. Different models.

One button.

Let's see what they build.
