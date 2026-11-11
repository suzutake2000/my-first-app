# Repository instructions

## Project overview

- This is a dependency-free, static browser game. `index.html` provides the Japanese-language page structure and HUD; `style.css` styles the page and responsive touch controls; `script.js` owns game state, input, physics, collisions, HUD updates, and Canvas rendering.
- The game loop uses `requestAnimationFrame`. The world is wider than the viewport, and `cameraX` scrolls the Canvas as the player advances. Canvas dimensions come from the CSS-sized canvas and are scaled for device pixel ratio.
- Keep the DOM HUD and end-of-game message in HTML; draw the world and sprites on Canvas. The on-screen mobile buttons use `data-control` values consumed by `script.js`.

## Commands

- Run the game by opening `index.html` in a browser. No build step or package install is required.
- Check JavaScript syntax with `node --check script.js`.
- There is no configured automated test runner, single-test command, or linter in this repository.

## Codebase conventions

- Keep the app dependency-free and split markup, presentation, and game logic across the existing HTML, CSS, and JavaScript files.
- HTML IDs and `data-control` attributes are integration points used by `script.js`; update the corresponding JavaScript selectors when changing them.
- Game tuning values and level layout are defined near the top of `script.js` (`WORLD_WIDTH`, player settings, and `platforms`); coins and enemies are initialized in `resetGame()`.
- Preserve the Japanese UI copy. CSS theme colors are centralized as custom properties in `:root`, with responsive layout rules in the existing media query.
- Display explanations in Japanese.
