# PONG

A fully interactive, retro-styled Pong game built with vanilla HTML5 Canvas, CSS, and JavaScript. No dependencies, no build step — just open `index.html` in any browser.

## How to Play

```
git clone https://github.com/YOUR_USER/pong.git
cd pong
open index.html
```

Or just download the three files and double-click `index.html`.

## Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move up | `W` | `↑` |
| Move down | `S` | `↓` |
| Pause | `Escape` | |
| Start / Restart | `Space` | |

First to 11, win by 2.

## Menu

- **PLAY** — start the game
- **MODE** — choose PvP or vs AI (Easy / Medium / Hard)
- **SKINS** — customize Theme, Paddles, and Ball
- **SOUND** — toggle sound effects
- **EFFECTS** — toggle particle bursts

## Customization

### Theme (9 presets)
Classic, Neon, Matrix, Sunset, Ocean, Midnight, Forest, Candy, Monochrome — each with unique paddle style, center line, and glow intensity. Override background, accent color, and glow via sliders.

### Paddles
6 styles (Solid, Gradient, Scanline, Bevel, Neon, Rounded) per player. Independent colors, adjustable width (6–30px) and height (30–180px).

### Ball
12 skins: Square, Circle, Ring, Basketball, Soccer, Tennis, Planet, Moon, Star, Diamond, Glow, Pulse. Custom color and size (6–32px).

All customization applies instantly — no restart needed.

## Files

```
pong/
├── index.html    # Entry point (open this)
├── styles.css    # All styling
└── game.js       # Game logic, AI, renderers, menu
```

## Browser Support

Chrome, Firefox, Safari, Edge — any modern browser. The Google Font `Press Start 2P` loads from CDN; if offline, it falls back to monospace.

## License

MIT — do whatever you want with it.
