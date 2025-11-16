# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

This is a classic Meteor.js application (Meteor 2.x) with no custom npm scripts or standalone test/lint tooling configured. Use the standard Meteor CLI from the project root.

### Install dependencies

- Install Node/Meteor globally following the official Meteor docs.
- From the repo root:
  - `meteor npm install` – install npm dependencies declared in `package.json`.

### Run the app in development

From the repo root:

- `meteor`  
  Starts the Meteor dev server (client + server, MongoDB, asset bundling). The game will be served on the default Meteor port (typically `http://localhost:3000`).

Useful variations:

- `meteor --port 4000` – run the app on a specific port.
- `meteor mongo` – open a Mongo shell connected to the local Meteor database.
- `meteor shell` – open a Node REPL in the server context (helpful for inspecting `Games`, `MapObjects`, etc.).

### Build / lint / tests

There is **no project-specific linting or automated test setup** in this repo:

- No ESLint/Prettier config files are present.
- No test driver packages (e.g. `meteortesting:mocha`) or `tests/` directory exist.

If you need linting or tests, you will first need to introduce appropriate tooling; there are currently **no canonical `lint` or `test` commands** to run.

## High-level architecture

### Technology stack

- **Meteor.js full-stack framework** (Node.js + MongoDB, DDP protocol).
- **MongoDB** via Meteor’s `mongo` package.
- **Blaze** templating (`blaze-html-templates`).
- **Iron Router** for client-side routing.
- **Reactive primitives**: `tracker`, `reactive-var`, session.
- **UI and styling**: Semantic UI (`semantic:ui`), LESS.
- **Audio**: Howler.js (included under `client/lib`).
- Utility libraries: `underscore`, `momentjs:moment`, jQuery.

### Project structure (big picture)

Core top-level folders:

- `classes/` – **game domain and engine logic** (shared between client and server):
  - Base persistence layer (`DBObject`).
  - Game orchestration (`Game`, `GameServer`, `GameGui`).
  - World and rendering support (`Map`, `MapGui`, `StationGui`, `TrainGui`).
  - Domain entities (`Station`, `Train`, `Person`, `City`).
  - Simulation helpers (`Helpers`, `Pathfinder`, `Priority-Queue`, `Radio`).
- `client/` – **UI, templates, and browser-side glue**:
  - `client/ui/layout/` – layout templates and top-level layout controller.
  - `client/ui/lobby/` – lobby/join-game screens.
  - `client/ui/game/` – in-game UI, including the canvas-based game view and team management.
  - `client/lib/` – browser-side helper libraries (config, helpers, Howler core/spatial wrappers).
- `lib/` – **shared code loaded early on both client and server**:
  - `collections.js` – Mongo collections for games, map objects, chat, teams, etc.
  - `methods/` – Meteor methods for game creation, team management, map object CRUD.
  - `router.js` – Iron Router routes for lobby and game views.
- `server/` – **server-only code**:
  - `startup.js` – server initialization, creation of `GameServer` instances, and game loop bootstrap.
  - `publish.js` – Meteor publications (e.g. map objects per game, teams, global data).
- `public/` – static assets (sprites, rails graphics, sound files under `public/snd` and `public/rails`).
- `.meteor/` – Meteor configuration (packages, release, build info).

### Domain model and persistence

The simulation is built around a small set of core classes in `classes/`:

- **`DBObject`** – abstract base for persisted game objects:
  - Encapsulates mapping between in-memory instances and MongoDB documents.
  - Exposes a `objToSave()` method (to be overridden) plus `saveToDB()` / `updateDB()` helpers that call Meteor methods (`mapInsert`, `mapUpdate`).
- **Stations / Trains / Persons** – extend `DBObject` and represent **nodes and actors** in the world:
  - `Station` instances form a directed graph (`children` and `parents`) representing the rail network.
  - `Train` implements AI for moving between stations, path selection, and passenger handling.
  - `Person` models NPCs: movement toward stations, grouping/social behavior, and basic health/aging.
- **Game / GameServer / GameGui** – orchestrate the simulation:
  - `Game` provides shared game logic.
  - `GameServer` runs the **authoritative game loop** on the server.
  - `GameGui` holds client-side state and UI-related logic for a single game session.

When you add or modify game entities, you typically:

1. Adjust the relevant `classes/*.js` class (e.g. `Train`, `Station`).
2. Update its `objToSave()` implementation so persistence correctly reflects new fields.
3. Ensure any related Meteor methods (`lib/methods/*.js`) and publications (`server/publish.js`) handle the new data shape.

### Game loop and timing (server side)

- The server maintains a **recursive `setTimeout` loop** in `GameServer` that:
  - Computes an internal clock based on the game’s start timestamp.
  - Uses a configurable `Helpers.serverInterval` as the target tick duration.
  - Adjusts the delay of the next tick to compensate for drift (offset-corrected scheduling).
  - Iterates over all objects in the current map and calls their `update(tickDelta)` method.
- All authoritative simulation (movement, pathfinding, spawning, etc.) is done here, and persisted changes propagate to clients via Meteor’s reactivity.

If you change how often the game updates or how movement works, this loop and the associated `Helpers` utilities are the primary entry points.

### World representation, rendering, and input

- The **world geometry and objects** live in `classes/map.js` and related classes:
  - Tracks map objects (stations, trains, persons) and provides spatial queries.
  - Serves as the authoritative container for game entities.
- Client-side drawing is handled by `MapGui`, `GameMapGui`, and `Drawing`-style helper classes:
  - Use the Canvas 2D API to render stations, tracks, trains, and persons.
  - Each game object may implement its own `draw()` method for polymorphic rendering.
- The main game UI controller (`client/ui/game/game.js`) wires together:
  - Blaze templates (`game.html`) and DOM events.
  - Canvas initialization and resize handling.
  - Mouse events and drag interactions (placing stations, drawing rails, etc.).

When implementing new visual features (e.g., new object types or overlays), expect to touch both the underlying domain class in `classes/` and its drawing logic in the appropriate `*Gui`/rendering helpers plus the Blaze templates and events.

### Pathfinding and rail network graph

- Rail connections form a **graph of `Station` nodes**:
  - Each station maintains `children` (outgoing links) and `parents` (incoming links).
  - Utility helpers support bidirectional link creation and route simplification.
- `Pathfinder` implements an A* algorithm using a custom priority queue (`Priority-Queue`):
  - Uses Euclidean distance heuristics on positions.
  - Computes optimal routes between stations for trains.

If you modify the connectivity rules (one-way lines, costs, restrictions), you will work primarily in `Station` and `Pathfinder`, plus any helpers that build or traverse the station graph.

### Data flow, reactivity, and multiplayer

- **Collections** defined in `lib/collections.js` hold persistent game state, map objects, chats, teams, etc.
- **Methods** in `lib/methods/*.js` implement trusted server-side operations:
  - Game creation and joining.
  - Team creation and membership.
  - Map object creation, update, and deletion, with authorization checks (team ownership).
- **Publications** in `server/publish.js` expose subsets of data to clients (e.g., map objects for a given `game_id`).
- Clients subscribe in UI code (mainly under `client/ui/game/` and `client/ui/lobby/`), and Meteor propagates **diffs** in real time.

Multiplayer behavior lives at the intersection of these layers: collections + methods + publications + client subscriptions. When adjusting how multiple players share or see state (e.g., team visibility rules), expect to touch all three.

### Audio and UX polish

- Howler.js is used to provide **spatial audio** for in-game events (e.g., station placement, dragging):
  - Sounds are loaded from `public/snd` and wrapped in helper objects.
  - Stereo panning is computed based on the mouse position relative to the canvas width.
  - Playback rate is slightly randomized per sound for variation.

If you add new sound effects, place assets under `public/snd`, extend the sound map in the relevant `GameGui`/audio helper, and wire triggers from UI or object events.

## Additional references

- `README.md` – brief project description and external game URL.
- `CLAUDE.md` – detailed technical analysis of the game’s architecture, including key files and design patterns. When making significant structural changes, update both this WARP.md summary and CLAUDE.md to keep them in sync.