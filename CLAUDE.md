# Trains Project - Technical Analysis

## ⚡ Meteor 3 Migration Status

**Migration Date**: January 2025
**Meteor Version**: Successfully upgraded from 2.14 → **3.3.2**

### ✅ Completed Migrations

#### 1. Core Framework Update
- ✅ Meteor updated to 3.3.2
- ✅ iron:router replaced with vlasky:galvanized-iron-router (Meteor 3 compatible fork)
- ✅ All core packages upgraded to Meteor 3 versions

#### 2. Async/Await Conversion
All server-side MongoDB operations and Meteor methods have been converted to async/await:

**Methods Converted**:
- ✅ `lib/methods/methodsGame.js` - All methods (gameCreate, gameUpdateClock, teamCreate, teamJoin)
- ✅ `lib/methods/methodsMap.js` - All methods (mapInsert, mapUpdate, mapRemove, mapReset)
- ✅ `lib/methods/methodsChat.js` - chatPost method
- ✅ `classes/dbobject.js` - saveToDB(), updateDB(), removeFromDB()
- ✅ `classes/gameServer.js` - loop() and Meteor.callAsync conversion
- ✅ `classes/map.js` - resetMap(), removeObjectFromDb()
- ✅ `server/startup.js` - observeChangesAsync implementation
- ✅ `classes/helpers.js` - observeChanges static method

**API Changes Applied**:
- `Meteor.user()` → `await Meteor.userAsync()`
- `Meteor.call()` → `await Meteor.callAsync()`
- `Collection.insert()` → `await Collection.insertAsync()`
- `Collection.update()` → `await Collection.updateAsync()`
- `Collection.remove()` → `await Collection.removeAsync()`
- `Collection.findOne()` → `await Collection.findOneAsync()`
- `Collection.find().observeChanges()` → `await Collection.find().observeChangesAsync()`

#### 3. Authentication System Restored
- ✅ Added `accounts-ui-unstyled` package (Meteor 3 compatible)
- ✅ Created custom Semantic UI styled login component in `client/ui/components/`
- ✅ Login/logout/signup functionality with async/await
- ✅ Integrated into lobby page

### ⚠️ Outstanding Issues

#### Semantic UI Compatibility
The `semantic:ui` Meteor package is **not compatible** with Meteor 3 (attempts to use Fibers).

**Current Status**: Package removed, but local Semantic UI files in `client/lib/semantic-ui/` have LESS compilation errors with Meteor 3's updated LESS compiler.

**Resolution Options**:
1. **Remove local Semantic UI** and use CDN version:
   ```html
   <!-- Add to main HTML -->
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.5.0/dist/semantic.min.css">
   <script src="https://cdn.jsdelivr.net/npm/semantic-ui@2.5.0/dist/semantic.min.js"></script>
   ```

2. **Use Fomantic-UI** (community fork, 99% compatible):
   ```bash
   meteor npm install fomantic-ui-css
   ```
   Then import in client code:
   ```js
   import 'fomantic-ui-css/semantic.min.css';
   import 'fomantic-ui-css/semantic.min.js';
   ```

3. **Migrate to modern UI framework** (Tailwind CSS, Bootstrap, etc.)

### 🔧 Next Steps to Complete Migration

1. **Fix Semantic UI** - Choose one of the resolution options above
2. **Test compilation** - Verify the build completes without errors
3. **Test functionality**:
   - Game creation and joining
   - Station placement
   - Train movement
   - Real-time synchronization
   - User authentication
4. **Performance testing** - Ensure async operations don't cause race conditions

### 📝 Migration Notes

- **Publications remain synchronous**: Publications that return cursors don't need async conversion
- **Meteor.userId() stays synchronous**: Only `Meteor.user()` needs to become async
- **Client code mostly unchanged**: Most async conversions are server-side only
- **observeChangesAsync returns Promise**: Handle returned LiveQueryHandle appropriately

### ⚠️ Development Guidelines

**IMPORTANT - For AI Assistants:**
- ❌ **DO NOT** kill Meteor processes (`pkill meteor`)
- ❌ **DO NOT** start the Meteor application automatically (`meteor run`)
- ❌ **DO NOT** control the application lifecycle
- ✅ **DO** let the user start/stop/restart the application themselves
- ✅ **DO** provide commands or suggestions, but let the user execute them

**STYLING:**
- ⚠️ **ALWAYS use LESS, NEVER CSS** - This project uses LESS preprocessor for all styles
- ⚠️ Files should have `.less` extension, not `.css`
- ✅ Use LESS nesting syntax (see `client/ui/game/game.less` for examples)
- ✅ Follow existing LESS patterns in the codebase

---

# Trains Project - Technical Analysis

## 🎮 Project Type

**Real-time Multiplayer Train Management Game** - A simulation/strategy game where players build railway networks and manage trains that transport passengers between stations.

## 🛠️ Technology Stack

### Core Framework: **Meteor.js v2.14**
- Full-stack JavaScript framework with real-time synchronization
- Integrated MongoDB
- DDP protocol for client-server communication

### Frontend
- **Blaze** - Templating engine
- **Iron Router** - Client-side routing
- **Canvas API** - 2D game rendering
- **jQuery** - DOM manipulation
- **Semantic UI** - CSS framework
- **Howler.js** - Spatial audio library

### Backend
- **Node.js** (via Meteor)
- **MongoDB** - NoSQL database
- **Bcrypt** - Authentication and password hashing

### Languages
- JavaScript (ES6+ with Babel transpilation)
- HTML/Handlebars (Blaze templates)
- LESS (CSS preprocessing)

## 📂 Project Structure

```
/classes       → Game logic (Train, Station, Person, Game)
/client        → Client-side code and UI templates
/server        → Server-only code
/lib           → Shared code (collections, methods, router)
/public        → Static assets (sounds, images)
├── /snd       → Audio files
└── /rails     → Graphics/sprites
```

## 🎯 Architecture and Design Patterns

### 1. Object-Oriented Design with Inheritance

```javascript
// Base class for all persisted game objects
class DBObject {
  constructor(properties, doc) { ... }
  objToSave() { throw new Error('must override') }
  saveToDB() { Meteor.call('mapInsert', this.objToSave()); }
  updateDB() { Meteor.call('mapUpdate', this._id, this.objToSave()); }
}

// Inheritance hierarchy:
Game → GameServer / GameGui
DBObject → Station, Train, Person
```

**Pattern**: Template Method with dependency injection; subclasses override `objToSave()` to define persistence format.

### 2. Reactive Programming with Meteor

```javascript
// Reactive variables
this._canStart = new ReactiveVar(false);
this.gameStatus = new ReactiveVar('');

// Automatic reactivity tracking
Tracker.autorun(() => {
  if(Meteor.userId()) {
    UserStatus.startMonitor({...});
  }
});

// Observable collections (real-time sync)
Games.find().observeChanges({
  added: (id, doc) => new GameServer(doc)
});
```

**Pattern**: Transparent reactive data binding; changes propagate automatically to all subscribers.

### 3. Server Game Loop with Timing Management

```javascript
class GameServer {
  loop() {
    const currentTime = new Date().getTime();
    const newClock = currentTime - this.gameStartTimestamp;
    let offset = this.clock - this.clockTick;
    let nextDelay = Helpers.serverInterval - offset;

    // Update all objects
    for(let obj of this.map.objects) {
      obj.update(this.clockTick);
    }

    // Recursive scheduling with adaptive timing
    Meteor.setTimeout(() => this.loop(), nextDelay);
  }
}
```

**Pattern**: Recursive setTimeout with offset compensation; maintains ~5000ms (configurable) intervals.

### 4. A* Pathfinding Algorithm

```javascript
class PathFinder {
  static search(start, goal) {
    const frontier = new TinyQueue([], (a, b) => a.priority - b.priority);
    const costs = {};

    while(frontier.length) {
      const current = frontier.pop().value;
      if(current._id === goal._id) break;

      _.each(current.children, (child) => {
        const new_cost = costs[current._id] + heuristic(current.pos, child.pos);
        if(!(child._id in costs) || new_cost < costs[child._id]) {
          costs[child._id] = new_cost;
          frontier.push({value: child, priority: new_cost + heuristic(child.pos, goal.pos)});
        }
      });
    }
  }
}
```

**Data Structure**: Custom `TinyQueue` priority queue (binary heap implementation)
**Heuristic**: Euclidean distance between points

### 5. Graph-Based Rail Network

```javascript
class Station {
  children: Station[]  // Unidirectional outgoing connections
  parents: Station[]   // Incoming connections

  addChild(station) { /* adds bidirectional link */ }
  addBiChild(childStation) {
    this.addChild(childStation);
    childStation.addChild(this);
  }
}
```

**Pattern**: Directed graph where trains traverse edges; support for route simplification.

### 6. Canvas-Based 2D Rendering

```javascript
class GameMapGui {
  draw() {
    // Render all objects on canvas
    for(let obj of this.objects) {
      if(obj.draw) obj.draw();  // Polymorphic drawing
    }
  }
}

class Drawing {
  static drawPoint(ctx, pos, size) { /* arc */ }
  static drawLine(ctx, p1, p2) { /* line */ }
  static drawArrow(ctx, p1, p2, progress) { /* arrow with progress indicator */ }
}
```

**Pattern**: Strategy pattern for rendering; each object type implements its own `draw()` method.

### 7. Spatial Audio with Howler.js

```javascript
this.sounds = {
  station: new Howl({src: ['/snd/station.wav'], volume: 0.5}),
  drag: new Howl({src: ['/snd/drag.wav'], volume: 0.3}),
};

sound(name, options = {}) {
  options.stereo = -1 + this.map.mousePos.x / this.map.canvas.width * 2;
  this.sounds[name].stereo(options.stereo).rate(1.0 + Math.random() / 4).play();
}
```

**Features**: Spatial audio (stereo panning), randomized playback rates for variation.

### 8. Pub/Sub Real-Time Updates

```javascript
Meteor.publish('map_objects', function(game_id) {
  return MapObjects.find({game_id: game_id});
});

// Client-side subscription
Meteor.subscribe('map_objects', game_id);
```

**Pattern**: Pub/Sub with automatic differential sync; Meteor sends only deltas to connected clients.

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `classes/gameServer.js` | Server-side game loop orchestrator; ticks at regular intervals to update all game objects |
| `classes/gameGui.js` | Client-side game interface; manages sound, permissions, UI status |
| `classes/game.js` | Base class for GameServer/GameGui; shared game logic |
| `classes/train.js` | Train AI: pathfinding, station-to-station movement, passenger management |
| `classes/person.js` | NPC AI: movement toward stations, social grouping, health system |
| `classes/station.js` | Rail network node: parent/child relationships define rail connectivity |
| `classes/map.js` / `mapGui.js` | Game world container; object management, spatial queries |
| `classes/pathfinder.js` | A* pathfinding algorithm for trains; uses priority queue for optimal routing |
| `lib/collections.js` | MongoDB collection definitions (Games, MapObjects, Chats, Teams) |
| `lib/methods/*.js` | Meteor method definitions (gameCreate, teamCreate, mapInsert, etc.) |
| `server/startup.js` | Server initialization; observes new games and creates GameServer instances |
| `server/publish.js` | Subscription channels for map objects, teams, and global data |
| `lib/router.js` | Route definitions (Lobby page, Game page with game_id) |
| `client/ui/game/game.js` | Main game template controller; Canvas rendering and event handling |

## 📦 Major Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@babel/runtime` | ^7.23.7 | ES6+ polyfills and helpers |
| `bcrypt` | ^5.1.1 | Password hashing for accounts |
| `jquery` | ^3.7.1 | DOM manipulation |
| `postcss` | ^8.4.32 | CSS transformation pipeline |

### Meteor Packages
- `ecmascript` - ES6 support
- `iron:router` - Client-side routing
- `accounts-password` - User authentication
- `mongo` - MongoDB integration
- `blaze-html-templates` - Templating engine
- `tracker` - Reactive dependency tracking
- `reactive-var` - Reactive variables
- `semantic:ui` - UI framework
- `momentjs:moment` - Date/time handling
- `less` - LESS compilation

## 🎮 Game Mechanics

### Core Gameplay
- **Players build rail networks** by placing stations and creating railway connections
- **Trains autonomously move** along established networks, transporting passengers
- **NPCs (Persons)** spawn in the game world and navigate toward stations with AI behavior:
  - Movement toward nearest stations
  - Social behavior (grouping with other persons)
  - Health mechanics
  - Aging system (birthDate tracking)

### Multiplayer Architecture
- Games stored in MongoDB with teams and players arrays
- Teams own map objects (can create/modify)
- Server verifies ownership before DB operations
- Reactivity ensures all players see updates instantly

### Movement Interpolation
- Trains move smoothly between stations using progress percentage
- Position calculated via vector interpolation: `P(t) = P1 + t*(P2-P1)`
- Progress updated each game tick based on distance and speed

### Game Loop Timing
- Server loop runs every ~5000ms (configurable via `Helpers.serverInterval`)
- Adaptive scheduling: measures clock drift and adjusts next timeout
- Clients get real-time updates via Meteor subscriptions

## 📊 Code Quality

### Strengths
- Clear separation of concerns (Game/GameServer/GameGui)
- Comprehensive geometric utilities for smooth movement
- Efficient pathfinding with A* and priority queues
- Real-time synchronization abstracted by Meteor
- Sophisticated vector math and geometry utilities

### Technical Debt (marked with FIXME comments)
- **P1**: Route picking for new trains (currently picks first station)
- **P1**: Passenger embarking/disembarking incomplete
- **P2**: Person movement logic has redundant conditionals
- Incomplete map modification UI (multiple references to unimplemented features)

### Code Style
- ES6 module syntax with Babel transpilation
- Underscore.js for functional utilities
- Console.log throughout (suitable for development)
- Mixed use of promises and callbacks (Meteor-style)

## 🚀 Deployment

The game is playable at: `http://trains.meteor.com`

## 📝 Summary

This is a **sophisticated web-based multiplayer game** leveraging Meteor's real-time capabilities to create an engaging train network simulation. The architecture elegantly separates game logic (shared classes) from rendering concerns (Gui variants), while the server maintains game state and deterministic simulation. The pathfinding and vector math implementations demonstrate solid CS fundamentals, and the integration of Howler.js for spatial audio adds polish. The project represents a well-structured example of full-stack JavaScript game development.
