# PFA 27 (Pen Fight 27)

A high-octane competitive pen-fighting simulation combining classroom nostalgia with the broadcast presentation, tournament brackets, and pack-opening excitement of EA Sports FC.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and design choices were confirmed in the interactive clarification phase:

- **Multiplayer Mode**: Hybrid architecture featuring live WebSocket room matchmaking, ranked AI rivals with humanized tactical behavior and reaction delays, and local pass-and-play.
- **Visual Aesthetic**: EA Sports FC broadcast presentation (high-contrast dark obsidian, volt green `#D4F82A` accents, broadcast scoreboard HUD, dynamic instant replay flash, classroom desk arenas with wooden textures, notebook grids, and stadium lighting).
- **Finger-Flicking Mechanic**: Slingshot pull-and-release with dynamic flick power gauge, trajectory preview guide, and curve/spin modifier.

---

## 1. Overview & Core Concept

**PFA 27** reimagines the beloved schoolroom classic of "Pen Fight" into a modern esports simulation:
- **Core Gameplay**: 1v1 tactical turn-based flicking on authentic desk surfaces (Wooden Oak Desk, Graph Paper Lab Table, Cafeteria Bench). Players take turns aiming and flicking their pens to knock the opponent off the desk perimeter while keeping their own pen safely in bounds.
- **Realistic Rigid-Body Physics**: Custom 2D physics simulating linear velocity, angular spin, moment of inertia, center of mass (pen tip vs. cap weight distribution), friction dynamics, and elastic/inelastic collisions with Oriented Bounding Boxes (OBB).
- **Progression & Economy**: Players earn **Paperclips** from match victories, which are used to unlock **Geometry Boxes** (FIFA-style unboxing packs: Wooden, Tin, Golden Compass, and Architect Deluxe) containing custom pen models, rare skins, cap attachments, and collectible badges.
- **Skill Progression**: Level up to unlock 6 distinctive **Finger Flicking Styles** (Classic Thumb Flick, Index Snap, Knuckle Cannon, Side Spinner Curve, Helicopter Spin, and Scissors Rebound).
- **Competitive Arenas**:
  - **Ranked Seasons (PFA Ultimate Desk)**: Divisions 10 through Elite with promotions, relegations, and seasonal rank badges.
  - **Tournaments (Open & Closed)**: 8-player and 16-player interactive brackets with developer-hosted open cups and private password-protected invitationals.
  - **Pass-and-Play**: Instant local 2-player duel with device orientation toggle.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Home / Broadcast Hub**: EA FC inspired tiled navigation featuring Live Ranked Season, Tournament Arena, Geometry Box Store, Pen Locker, and Quick Match.
2. **Match Arena**:
   - Overhead 2D desk arena rendered on HTML5 Canvas with realistic shadows, wood grain texture, notebook boundaries, rulers, and school obstacles.
   - Interactive flick controls: Touch or drag backwards to draw the slingshot arrow; pull length controls power; flick angle and curve sliders control spin.
   - Broadcast Scoreboard: FC-style top HUD displaying match score, turn timer, current flick style, and knockout replay camera banner upon round victory.
3. **Geometry Box Unboxing (Pack Opening Experience)**:
   - Select box tier (Wooden, Classic Tin, Golden Compass, Architect Icon).
   - Animated reveal sequence: Brass latch opens, instruments slide open, burst lighting, walkout card animation revealing unlocked pen skins and flick style cards.
4. **Tournaments & Brackets**:
   - Visual tournament tree (Quarter-Finals $\to$ Semi-Finals $\to$ Grand Final).
   - Real-time match progression with simulated rival match outcomes and bracket advancement.
5. **Pen Locker & Customization**:
   - 3D/isometric pen preview with stat radar (Flick Power, Stability / Mass, Grip Friction, Spin Rate).
   - Equip custom skins, ink trails, and special caps.

### Visual Identity & Theme
- **Aesthetic Direction**: Sleek EA FC broadcast packaging married to schoolyard desk culture. Premium dark UI with crisp geometric sports typography.
- **Palette**:
  - Dominant Neutral (60%): Deep pitch charcoal (`#0C0F14`) and desk slate (`#161B22`).
  - Structural Surfaces (30%): Obsidian card panels (`#1F242D`), frosted glass overlays, subtle hairline borders (`border-white/10`).
  - High-Intent Accents (10%): Electric Volt Green (`#D4F82A`), Trophy Gold (`#F59E0B`), and Broadcast Crimson (`#EF4444`).
- **Typography**:
  - Display / Headlines: `Outfit` & `Barlow Condensed` for high-energy athletic broadcast numbers and titles.
  - Body Prose: `Plus Jakarta Sans` for clean, uncrowded readability.
  - Telemetry: Monospace tabular numerals (`font-mono tabular-nums`) for timers, power percentages, and division points.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Physics Engine Implementation**
  - *Chosen Approach*: Lightweight deterministic 2D rigid-body simulation written in TypeScript using continuous collision detection (CCD) for fast-moving pens, OBB intersection tests, and impulse-based collision response.
  - *Why*: Ensures pixel-perfect fidelity without loading heavy 300KB physics libraries that introduce jitter or desync in multiplayer.
- **Decision 2: Multiplayer Architecture**
  - *Chosen Approach*: Full-stack Express server with native WebSockets on port 3000 supporting room matchmaking codes, synced turns, and game state broadcasts; bundled with client-side offline AI rivals when playing solo or unnetworked.
  - *Why*: Delivers authentic live multi-user matchmaking while guaranteeing zero downtime and complete single-player offline playability.
- **Decision 3: Audio Feedback**
  - *Chosen Approach*: Web Audio API procedural synthesizer for desk impact clicks, rubber band flick snaps, applause chimes, and whistle alerts without external audio asset dependencies.

---

## 4. Technical Architecture & Data Strategy

### System Layout & Component Hierarchy

```
┌────────────────────────────────────────────────────────┐
│                   App.tsx (Root Hub)                   │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
    ┌───────▼────────┐               ┌───────▼────────┐
    │  State Stores  │               │ Navigation Bar │
    │  - PlayerProg  │               │ (Broadcast FC) │
    │  - Inventory   │               └────────────────┘
    │  - MatchState  │
    └───────┬────────┘
            │
  ┌─────────┼───────────────┬────────────────┬──────────────┐
  │         │               │                │              │
┌─▼──────┐ ┌▼────────────┐ ┌▼─────────────┐ ┌▼───────────┐ ┌▼───────────┐
│ Match  │ │ Tournament  │ │ Geometry Box │ │ Pen Locker │ │ Leaderboard │
│ Arena  │ │ Brackets    │ │ Unboxing     │ │ & Upgrades │ │ & Divisions │
│ Canvas │ │ & Cups      │ │ Store        │ │            │ │             │
└─┬──────┘ └─────────────┘ └──────────────┘ └────────────┘ └───────────┘
  │
┌─▼────────────────────────────────────────┐
│ Physics Engine (OBB, Angular Impulses,   │
│ Friction, Boundary Knockout Detection)   │
└──────────────────────────────────────────┘
```

### Data Model & Persistence
- **Player Profile**: Level, XP, Division (10 to 1), Paperclips balance, unlocked flick styles, equipped pen, and match history stored in persistent local storage.
- **Pen Schema**: ID, name, brand archetype (Ballpoint, Gel, Fountain, Multi-color, Architect), stats (`mass`, `length`, `radius`, `friction`, `powerMultiplier`, `spinMultiplier`), unlocked skins, and rarity.
- **Tournament Bracket**: Tree node structure with round IDs, seeds, live/simulated match statuses, and trophy rewards.
- **WebSocket Protocol**: Structured events (`join_room`, `room_state`, `flick_turn`, `round_ended`, `match_sync`).
