# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**몽글벨 (Monglebel)** — A hybrid 2.5D stage-based game combining Candy Match (match-3), Marble Shooting (tap-to-pop), Treasure Events, Spirit Summoning (gacha), and Last War-style Survival Combat.

## Architecture

### Tech Stack
- No build tools — pure HTML/CSS/JS
- ES6 `<script type="module">` for file separation
- Puzzle/menus: DOM + innerHTML rendering
- Combat: HTML5 Canvas (60fps requestAnimationFrame)
- Save system: localStorage (JSON serialization)
- Visuals: CSS transform-based isometric 2.5D

### Entry Points
- `index.html` — Main game entry point (loads `js/main.js` as ES6 module)
- `candy-game.html`, `marble-game.html`, `slot-game.html` — Legacy standalone mini-games (preserved)

### Core Game Loop
```
[Main Menu] → [Stage 1: Puzzle Phase]
                ├─ Candy Match (score target)
                ├─ Marble Shooting (loot drops)
                └─ Treasure Event (dice + chests → spirit items)
            → [Summoning Room] (summon spirits, auto-save checkpoint)
            → [Stage 2: Combat Phase] (survival waves)
                ├─ Victory → next stage
                └─ Death → restore checkpoint (summoning room)
```

### File Structure
```
monglebel/
  index.html                     ← Main entry point
  css/
    variables.css                (CSS custom properties)
    base.css                     (Reset, dark theme, animations, font)
    components.css               (Buttons, cards, progress bars, overlays)
    isometric.css                (2.5D transform classes)
    scenes/*.css                 (Per-scene styles)
  js/
    main.js                      ← JS entry point, scene registration
    core/
      game-state.js              (Central state singleton)
      scene-manager.js           (Scene stack, transitions, lifecycle)
      save-manager.js            (localStorage save/load/checkpoint)
      event-bus.js               (pub/sub event communication)
    data/
      spirits.js                 (Spirit definitions, rarities)
      items.js                   (Weapons, armor, accessories, consumables)
      stages.js                  (Stage configs: waves, difficulty, rewards)
      loot-tables.js             (Drop probability tables)
    scenes/
      main-menu.js               (New game / Continue)
      stage1-scene.js            (Orchestrates candy→marble→treasure)
      summoning-room-scene.js    (Spirit summoning + checkpoint)
      stage2-scene.js            (Canvas combat wrapper)
      game-over-scene.js         (Victory/death summary)
    games/
      candy-match.js             (Modularized match-3 engine)
      marble-shoot.js            (Modularized tap-to-pop engine)
      treasure-event.js          (Dice + treasure chest mini-game)
    combat/
      combat-engine.js           (RAF loop, entity management)
      player.js                  (Player entity)
      enemy.js                   (Enemy types and behaviors)
      spirit-ally.js             (Spirit companions in combat)
      projectile.js              (Projectile entity)
      collision.js               (Circle/rect collision detection)
    ui/
      hud.js                     (Top HUD bar)
      inventory-ui.js            (Inventory overlay panel)
      spirit-collection-ui.js    (Spirit codex/collection)
      dialog.js                  (Modal dialog utility)
      toast.js                   (Toast, combo, confetti effects)
    render/
      isometric.js               (Iso math: toIso/fromIso)
      sprite.js                  (Emoji sprite helpers)
      effects.js                 (Canvas glow, ring, damage number)
```

### Key Patterns
- **Scene lifecycle**: `onCreate(params)` → `render()` → `onEnter()` → ... → `onLeave()`
- **State management**: Singleton `GameState` object, events via `EventBus`
- **Save system**: `SaveManager.save()` for auto-save, `SaveManager.saveCheckpoint()` at summoning room
- **Combat**: Canvas-based with emoji sprites, auto-attack, spirit allies orbit player

### Running Locally
ES6 modules require a server. Use:
```bash
cd monglebel && python -m http.server 8000
```
Then open `http://localhost:8000`
