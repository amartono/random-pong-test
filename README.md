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

## Menu

- **PLAY** — start the game
- **GAME MODE** — toggle between Classic and Power Ups mode
- **PLAYER vs PLAYER / AI** — toggle cycles: PvP → AI Easy → AI Medium → AI Hard → PvP
- **CUSTOMIZE** — Theme, Paddles, and Ball customization pages
- **SOUND** — toggle sound effects (procedural Web Audio, no files needed)
- **EFFECTS** — toggle particle bursts on goals

## Power Ups Mode

Toggle GAME MODE to **POWER UPS**. Glowing orbs spawn randomly in the arena. The player who last touched the ball claims the power-up.

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

### Ball (14 skins)
Circle, Ring, Basketball, Soccer, Tennis, 8-Ball, Beachball, Earth, Mars, Jupiter, Saturn, Moon, Wood, Metal. Custom color and size (6–32px). Live preview on the Ball page. Ball rotates with physics-based spin from paddle hits.

All customization applies instantly — no restart needed.

## AI Opponent

Three difficulty levels with distinct behavior:
- **Easy** — slow, large random tracking offset
- **Medium** — moderate speed, tighter accuracy
- **Hard** — near-full speed, predicts ball trajectory with wall bounce simulation

## Files

```
pong/
├── index.html    # Entry point (open this)
├── styles.css    # All styling
└── game.js       # Game logic, AI, renderers, menu, power-ups
```

## Browser Support

Chrome, Firefox, Safari, Edge — any modern browser. The Google Font `Press Start 2P` loads from CDN; if offline, it falls back to monospace.

## License

MIT — do whatever you want with it.
