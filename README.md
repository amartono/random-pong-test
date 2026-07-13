# PONG

A fully interactive, retro-styled Pong game built with vanilla HTML5 Canvas, CSS, and JavaScript. No dependencies, no build step — just open `index.html` in any browser.

## How to Play

```
git clone https://github.com/amartono/random-pong-test.git
cd random-pong-test
open index.html
```

Or download the files and double-click `index.html`.

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move up | `W` | `↑` |
| Move down | `S` | `↓` |
| Pause / Back | `Escape` | |
| Start / Restart | `Space` | |

First to 11, win by 2.

## Game Modes

Cycle through with the **GAME MODE** button:

| Mode | Arena | Scoring |
|------|-------|---------|
| **CLASSIC** | Standard Pong court with center line | Ball crosses boundary behind paddle |
| **POWER UPS** | Same court with glowing orb spawns | Standard scoring + power-up effects |
| **FRENZY** | Standard court | Multi-ball chaos — 14 balls with random skins |
| **POOL** | Top-down 6-pocket pool table | Pocket any ball for 1 point. Last paddle hitter gets the point. |

### Pool Mode

A Pool / Pong hybrid played on a top-down pool table with green felt, wooden rails, and six pockets.

- **Rack:** 15 numbered billiard balls in a triangular rack (Ball 1 apex, Ball 8 center). Randomly placed on the left or right side.
- **Break:** The main ball launches from the opposite paddle toward the rack with randomized speed and direction.
- **Object balls:** Fully interactive — they collide with the main ball, each other, paddles, and rails. Affected by felt friction and gradually slow to a stop.
- **Spin physics:** Glancing collisions transfer spin. Paddle hits impart spin. Rails interact with spin. Balls visually rotate while rolling.
- **Ownership:** Points awarded to the last player who meaningfully influenced a ball (via paddle or main-ball chain).
- **Procedural clack sounds:** Ball-to-ball impacts produce crisp billiard clacks with volume and pitch variation.
- **Main-ball respawn:** When the main ball is pocketed, only it respawns — numbered balls stay exactly where they are. New serve side is randomly 50/50 left or right.

## Power Ups Mode

Glowing orbs spawn randomly in the arena. The player who touches the orb claims the power-up.

| Power-up | Label | Effect |
|---|---|---|
| Big Paddle | `BIG` | Paddle grows 1.5× taller for 16 seconds |
| Shield | `S` | Blocks the next goal against you. Stacks — barrier line brightens with multiple shields. Shatter particles on break |
| Speed Up | `>>` | Ball speed boosted 1.4× for 5 seconds |
| Slow Opponent | `<<` | Opponent paddle moves at 40% speed for 8 seconds |
| Double Points | `DP` | Next goal by you awards 2 points |
| Triple Ball | `x3` | Splits ball into 3 with offset angles. Balls bounce off each other with elastic collisions |

## Customization

### Theme (9 presets)
Classic, Neon, Matrix, Sunset, Ocean, Midnight, Forest, Candy, Monochrome — each with unique paddle style, center line, and glow intensity. Override background, accent color, and glow via sliders.

### Paddles
6 styles (Solid, Gradient, Scanline, Bevel, Neon, Rounded) per player. Independent colors, adjustable width (6–30px) and height (30–180px).

### Ball (29 skins)
**Built-in presets:** Circle, Ring, Basketball, Soccer, Tennis, 8-Ball, Beachball, Earth, Mars, Jupiter, Saturn, Moon, Wood, Metal.

**Numbered billiard balls (1–15):** Full standard billiard-ball set with solid and striped rendering. 8-Ball is selectable as a main-ball skin. Balls 1–7 and 9–15 are used internally by Pool Mode. Each uses correct standard billiard colors.

Custom color and size (6–32px). Live preview on the Ball page. Ball rotates with physics-based spin from paddle hits.

### Ball Texture Editor
- **Draw new textures:** Vector paint editor with brush, line, rect, circle, pentagon, fill, blend/smudge, eraser tools. Select/move/resize any shape. Mirror X/Y options. Undo support (30 levels). Saves to localStorage.
- **Upload images:** Upload custom PNG/JPG ball textures. Optional 3D sphere shading overlay.
- **Edit built-in balls:** Load any preset into the editor, modify it, and save as an override.

All customization applies instantly — no restart needed.

## AI Opponent

Three difficulty levels with distinct behavior:
- **Easy** — slow, large random tracking offset
- **Medium** — moderate speed, tighter accuracy
- **Hard** — near-full speed, predicts ball trajectory with wall bounce simulation

Pool-compatible AI tracks the main ball within pool bounds and collides with object balls.

## Sound & Effects

- **Procedural audio:** No external sound files. Paddle hits, wall bounces, scoring, and game-start/win fanfares generated via Web Audio API.
- **Pool clacks:** Distinct billiard-ball clacking sounds for meaningful ball-to-ball impacts with per-tick sound limiting.
- **Particle effects:** Goal bursts, pocket particles, power-up collection effects. Togglable on/off.
- **3D shading:** Optional sphere shading overlay for custom ball textures.

## Files

```
pong/
├── index.html    # Entry point (open this)
├── styles.css    # All styling
└── game.js       # Game logic, AI, renderers, menu, pool mode, power-ups
```

## Browser Support

Chrome, Firefox, Safari, Edge — any modern browser. The Google Font `Press Start 2P` loads from CDN; if offline, it falls back to monospace.

## License

MIT — do whatever you want with it.
