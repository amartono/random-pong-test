# PONG

A fully interactive retro Pong game built with vanilla HTML5 Canvas, CSS, and JavaScript. Zero dependencies, zero build steps — open `index.html` in any browser and play.

## Quick Start

```bash
git clone https://github.com/amartono/random-pong-test.git
cd random-pong-test
open index.html
```

Or download the files and double-click `index.html`.

---

## Controls

| Key | Action |
|-----|--------|
| `W` / `S` | Player 1 move up / down |
| `↑` / `↓` | Player 2 move up / down |
| `Space` | Start game / restart match |
| `Escape` | Pause / back to menu |

First to 11 points, win by 2.

---

## Game Modes

| Mode | Style | Description |
|------|-------|-------------|
| **CLASSIC** | Traditional Pong | Score by sending the ball past your opponent's paddle. |
| **POWER UPS** | Arcade Pong | Same court with random power-up orbs to collect. |
| **FRENZY** | Multi-ball chaos | 14 balls with random skins bouncing everywhere. |
| **POOL** | Pong meets billiards | Six-pocket pool table with a full 15-ball rack. |
| **PINBALL** | Pong meets pinball | Symmetrical pinball arena with bumpers, slingshots, spinners, rails, and posts. |

---

## Pinball Mode

Normal Pong scoring inside a retro pinball-machine arena. The playfield is exactly horizontally mirrored so both players have equal conditions.

- **4 large pop bumpers** — strong outward rebounds with speed boosts
- **2 medium inner bumpers** — smaller, center-field redirects
- **4 triangular slingshots** — inward-facing rubber triangles
- **4 angled guide rails** — passive corner redirectors
- **2 rubber posts** — sharp deflection pegs
- **2 rotating spinners** — animated bars near the center
- **Substep physics** — no high-speed tunneling through obstacles
- **Pinball sounds** — distinct boings, snaps, clicks, and ticks per obstacle type

Scoring remains normal Pong: only goals behind the paddle award points.

## Pool Mode

A Pool / Pong hybrid played on a top-down pool table.

### Arena
Green felt with dark wooden rails, six pockets (four corner, two center-side), and a decorative center circle. All drawn procedurally with Canvas.

### Rack & Break
- 15 numbered billiard balls in an equilateral triangular rack
- Randomly placed on the left or right side of the table each round
- Ball 1 at the apex, Ball 8 in the center
- Main ball spawns opposite the rack and launches toward it with randomized speed and direction

### Object Ball Physics
- Fully interactive — collide with the main ball, each other, paddles, and rails
- Felt friction gradually slows balls to a stop
- Stopped balls wake and move again when struck
- Spin physics: paddle hits and glancing collisions transfer spin; rails interact with spin; balls visually rotate while rolling

### Scoring & Ownership
- Any ball entering any pocket awards 1 point
- Points go to the player who last meaningfully influenced the ball (paddle hit or main-ball chain)
- Unowned pocketed balls award no point
- When the main ball is pocketed, it respawns on a random 50/50 left/right side — numbered balls stay exactly where they are

### Sound
Procedural billiard-ball clacking sounds on meaningful impacts, with per-tick limiting and pitch/volume variation.

---

## Power Ups Mode

Glowing orbs spawn randomly. Whoever touches one claims it.

| Pickup | Label | Effect | Duration |
|--------|-------|--------|----------|
| Big Paddle | `BIG` | Paddle height 1.5× | 16 s |
| Shield | `S` | Blocks your next goal (stacks) | Permanent until used |
| Speed Up | `>>` | Ball speed 1.4× | 5 s |
| Slow Opponent | `<<` | Opponent paddle at 40% speed | 8 s |
| Double Points | `DP` | Your next goal counts as 2 | Permanent until used |
| Triple Ball | `x3` | Splits into 3 bouncing balls | Permanent |

---

## Customization

All settings apply instantly — no restart needed.

### Themes (9 presets)
Classic, Neon, Matrix, Sunset, Ocean, Midnight, Forest, Candy, Monochrome. Each has a unique paddle style, center-line pattern, and glow intensity. Override the background, accent color, and glow via sliders.

### Paddles
- 6 styles per player: Solid, Gradient, Scanline, Bevel, Neon, Rounded
- Independent left/right colors
- Adjustable width (6–30 px) and height (30–180 px)

### Ball (29 skins)
**Built-in presets:** Circle, Ring, Basketball, Soccer, Tennis, 8-Ball, Beachball, Earth, Mars, Jupiter, Saturn, Moon, Wood, Metal.

**Numbered billiard balls (1–15):** Full standard set with solid (1–7) and striped (9–15) rendering plus the classic black 8-Ball. The 8-Ball is selectable as a main-ball skin; balls 1–7 and 9–15 are used internally by Pool Mode.

- Custom color and adjustable size (6–32 px)
- Live preview on the Ball customization page
- Physics-based spin rotation from paddle hits

### Ball Texture Editor
- **Draw mode:** Vector paint editor with brush, line, rectangle, circle, pentagon, fill, blend/smudge, and eraser tools. Select, move, and resize any shape. Mirror X/Y. Undo up to 30 levels.
- **Upload mode:** Import a PNG/JPG image with optional 3D sphere shading.
- **Edit built-in balls:** Load any preset into the editor, modify it, and save as a custom override.
- All textures stored in localStorage.

---

## AI Opponent

| Difficulty | Behavior |
|------------|----------|
| **Easy** | Slow reactions, large random tracking offset |
| **Medium** | Moderate speed, tighter accuracy |
| **Hard** | Near-full speed, predicts ball trajectory with wall bounce simulation |

Pool-compatible — tracks the main ball within pool bounds and physically collides with object balls.

---

## Sound & Effects

- **Procedural audio:** All sounds generated via Web Audio API — no external files. Paddle hits, wall bounces, scoring, pocket capture, billiard clacks, and game-start/win fanfares.
- **Pool clacks:** Distinct short billiard-ball clicking sounds on real impacts only. Volume and pitch vary with collision strength. Per-tick sound limit prevents audio overload.
- **Particles:** Goal bursts, pocket effects, power-up collection sparks. Togglable on/off.
- **3D shading:** Optional sphere lighting overlay for custom ball textures.

---

## Architecture

```
pong/
├── index.html    # Entry point
├── styles.css    # All styling
└── game.js       # Game logic, AI, renderers, UI, pool mode, power-ups
```

Single-file game engine — the entire game lives in `game.js`. No frameworks, no build tools.

---

## Browser Support

Chrome, Firefox, Safari, Edge — any modern browser. The font `Press Start 2P` loads from Google Fonts CDN; offline, it falls back to monospace.

---

## License

MIT
