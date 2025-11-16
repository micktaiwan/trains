# Trains Project - Technical Documentation

## 🎮 Project Overview

**Real-time Multiplayer Train Management Game** - A simulation/strategy game where players build railway networks and manage trains that transport passengers between stations.

## 🛠️ Technology Stack

### Core Framework: **Meteor.js 3.3.2**
- Full-stack JavaScript framework with real-time synchronization
- Integrated MongoDB with async/await
- DDP protocol for client-server communication

### Frontend
- **Blaze** - Templating engine
- **vlasky:galvanized-iron-router** - Client-side routing (Meteor 3 fork)
- **Canvas API** - 2D game rendering
- **jQuery** - DOM manipulation
- **Semantic UI** - CSS framework (via CDN)
- **Howler.js** - Spatial audio library

### Backend
- **Node.js** (via Meteor)
- **MongoDB** - NoSQL database with async operations
- **Bcrypt** - Password hashing

### Languages
- JavaScript (ES6+ with Babel transpilation)
- HTML/Handlebars (Blaze templates)
- LESS (CSS preprocessing)

## 📂 Project Structure

```
/classes         → Game logic (Train, Station, Person, Game)
/client          → Client-side code and UI templates
  /ui/admin      → Admin panel interface
  /ui/components → Reusable components (login, etc.)
  /ui/game       → Game canvas and controls
  /ui/lobby      → Main lobby with game list
/server          → Server-only code
/lib             → Shared code (collections, methods, router)
/public          → Static assets (sounds, images)
```

## 🎯 Key Architecture Patterns

### 1. Object-Oriented Design with Inheritance
- Base class `DBObject` for all persisted game objects
- Template Method pattern with `objToSave()` override
- Hierarchy: `Game → GameServer/GameGui`, `DBObject → Station/Train/Person`

### 2. Reactive Programming with Meteor
- `ReactiveVar` for UI state
- `Tracker.autorun()` for automatic reactivity
- Observable collections with real-time sync

### 3. Server Game Loop
- Adaptive timing with offset compensation
- ~5000ms intervals (configurable via `Helpers.serverInterval`)
- Deterministic simulation across all clients

### 4. A* Pathfinding
- Priority queue (binary heap) for optimal routing
- Euclidean distance heuristic
- Graph-based rail network (directed graph with parent/child stations)

### 5. Canvas Rendering
- Strategy pattern for polymorphic drawing
- Each game object implements its own `draw()` method
- Vector math for smooth interpolation

### 6. Pub/Sub Real-Time Updates
- Meteor's differential sync (sends only deltas)
- Separate subscriptions for map objects, teams, global data

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `classes/gameServer.js` | Server-side game loop orchestrator |
| `classes/gameGui.js` | Client-side interface, sound, permissions |
| `classes/train.js` | Train AI with pathfinding and passenger management |
| `classes/person.js` | NPC AI with movement and social behavior |
| `classes/station.js` | Rail network nodes (graph structure) |
| `classes/pathfinder.js` | A* pathfinding algorithm |
| `lib/collections.js` | MongoDB collections (Games, MapObjects, Teams, AdminLogs) |
| `lib/methods/methodsGame.js` | Game/team creation and management |
| `lib/methods/methodsAdmin.js` | Admin panel protected methods |
| `server/startup.js` | Server initialization, game observers |
| `lib/router.js` | Routes: `/` (lobby), `/game/:id`, `/admin` |

## 🎮 Game Mechanics

### Core Gameplay
- Players place stations and build rail connections
- Trains autonomously navigate using A* pathfinding
- NPCs spawn and move toward stations with AI behavior
- Real-time multiplayer with team support

### Multiplayer System
- **Teams**: Players can create/join teams to collaborate
- **Ownership**: Teams own map objects (stations, trains)
- **Permissions**: Server verifies ownership before DB operations
- **Solo play**: Game creator automatically becomes a player (can build immediately)

### Admin System
- **First user** automatically becomes admin
- Dashboard with real-time statistics
- User management (roles, passwords, deletion)
- Game management (view, edit, delete)
- Chat moderation
- Activity logging

## ⚠️ Development Guidelines

**IMPORTANT - For AI Assistants:**
- ❌ **DO NOT** kill Meteor processes (`pkill meteor`)
- ❌ **DO NOT** start the Meteor application automatically (`meteor run`)
- ✅ **DO** let the user control the application lifecycle
- ✅ **DO** provide commands as suggestions

**STYLING:**
- ⚠️ **ALWAYS use LESS, NEVER CSS**
- Files must have `.less` extension
- Use LESS nesting syntax (see `client/ui/game/game.less`)

**ASYNC/AWAIT:**
- Server methods use async/await for MongoDB operations
- Client calls use `await Meteor.callAsync()`
- User data: `await Meteor.userAsync()` on server, `Meteor.user()` on client
- Collections: `insertAsync`, `updateAsync`, `removeAsync`, `findOneAsync`

## 📊 Known Technical Debt (FIXME comments)

- **P1**: Route picking for new trains (currently picks first station)
- **P1**: Passenger embarking/disembarking incomplete
- **P2**: Person movement logic has redundant conditionals
- Incomplete map modification UI features

## 📝 Development Notes

- Publications remain synchronous (returning cursors)
- `Meteor.userId()` stays synchronous
- Most async conversions are server-side only
- `observeChangesAsync` returns Promise that resolves to LiveQueryHandle
