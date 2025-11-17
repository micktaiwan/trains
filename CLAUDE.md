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

### 7. Semantic UI + Blaze Integration

**Critical Pattern**: When using Semantic UI modals with Blaze templates, always use `detachable: false`.

#### Why it's necessary

By default, Semantic UI moves modal elements outside of the Blaze template's DOM (into `body > .dimmer`) during initialization. This breaks Blaze's event system because modal buttons are no longer within the template's scope, causing event handlers to stop working.

#### Solution

Always initialize modals with `detachable: false`:

```javascript
Template.myTemplate.onRendered(function() {
  $('.ui.modal.my-modal').modal({
    detachable: false,  // ← REQUIRED for Blaze Template.events() to work
    onApprove: function() {
      return false; // Prevent auto-close if needed
    }
  });
});

Template.myTemplate.events({
  'click .modal-button': async function(e, template) {
    e.preventDefault();

    try {
      await Meteor.callAsync('myMethod', someData);
      $('.ui.modal.my-modal').modal('hide');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
});
```

**Important Note on Client-Side Authentication:**
Client-side authentication methods (`Meteor.loginWithPassword`, `Accounts.createUser`) use **callbacks, not async/await**. The async variants (`loginWithPasswordAsync`, `createUserAsync`) are not part of Meteor's standard client API. For authentication specifically, use callbacks:

```javascript
// For login/signup forms - use callbacks
Meteor.loginWithPassword(username, password, (err) => {
  if (err) {
    errorMessageVar.set(err.reason);
  } else {
    $('.ui.modal.login-modal').modal('hide');
  }
});
```

For other Meteor methods (game logic, data operations), `await Meteor.callAsync()` works fine on the client.

#### Files using this pattern

- `client/ui/components/login.js` - Reference implementation
- `client/ui/admin/adminGames.js` - Edit/delete game modals
- `client/ui/admin/adminUsers.js` - Password reset/delete user modals
- `client/ui/admin/adminChat.js` - Delete chat message modal

#### Common pitfalls

❌ **DON'T**: Use jQuery global delegation
```javascript
// BAD - Creates memory leaks, bypasses Blaze
$(document).on('click', '.modal-button', function() { ... });
```

✅ **DO**: Use `detachable: false` + Blaze Template.events()
```javascript
// GOOD - Clean, proper Blaze integration
Template.myTemplate.events({
  'click .modal-button': function(e, template) { ... }
});
```

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

**CODE LANGUAGE:**
- ⚠️ **ALL code, comments, variables, and documentation MUST be in ENGLISH ONLY**
- ❌ **NEVER** write French (or any other language) in code/comments
- ✅ Use English for: variable names, function names, comments, console.log messages, error messages

**STYLING:**
- ⚠️ **ALWAYS use LESS, NEVER CSS**
- Files must have `.less` extension
- Use LESS nesting syntax (see `client/ui/game/game.less`)

**ASYNC/AWAIT:**
- Server methods use async/await for MongoDB operations
- Client calls use `await Meteor.callAsync()`
- User data: `await Meteor.userAsync()` on server, `Meteor.user()` on client
- Collections: `insertAsync`, `updateAsync`, `removeAsync`, `findOneAsync`

## 🚨 CRITICAL: Bug Fixing Philosophy

**NEVER HIDE PROBLEMS - ALWAYS FIX THE ROOT CAUSE**

When fixing bugs, follow these STRICT rules:

### ❌ **FORBIDDEN: Defensive Coding**

**DO NOT** add checks that hide symptoms without fixing the cause:

```javascript
// ❌ BAD - Hides the problem
if(this.destStation) {
  this.setPath();
} else {
  // Silently fail - bug is hidden!
  this.running = false;
  return;
}
```

This approach:
- Masks the real issue
- Makes debugging harder
- Allows bugs to propagate silently
- Creates technical debt

### ✅ **REQUIRED: Root Cause Analysis**

**ALWAYS** follow this process:

1. **Understand the FULL context**
   - Read the logs carefully
   - Trace the execution flow from start to end
   - Identify WHEN and WHY the problem occurs

2. **Find the ROOT CAUSE**
   - Ask: "Why is this value null/undefined/invalid?"
   - Ask: "Where should this value have been set?"
   - Ask: "What broke the normal flow?"
   - **Never assume** - verify with logs and code inspection

3. **Fix at the SOURCE**
   - Fix where the problem originates, not where it manifests
   - Update the data at the right time, in the right place
   - Ensure proper state transitions

4. **Add LEGITIMATE validation only**
   - Input validation at API boundaries = ✅ Good
   - Null checks with clear "This is a BUG" errors = ✅ Good
   - Silent fallbacks that hide issues = ❌ Bad

### 📋 Example: The Right Way

**Scenario**: Train crashes because `destStation` is null when calling `setPath()`

❌ **WRONG** (defensive):
```javascript
// In checkStations()
if(this.destStation) {
  this.setPath();  // Only call if exists
}
// Problem hidden, real cause not fixed
```

✅ **RIGHT** (root cause fix):
```javascript
// In updateTrainsAfterMerge() - the REAL source of the problem
if(needsPathRecalc && train.destStation && train.fromStation) {
  // Handle the merge properly
  if(train.nextStation._id === train.destStation._id) {
    train.path = [];  // Special case: already at next = dest
  } else {
    train.setPath();  // Recalculate properly
    train.nextStation = train.path.shift();
  }
}
// Problem fixed at the source
```

### 🔍 Debugging Approach

When encountering a bug:

1. **Read the error stack trace completely**
   - Note the exact line and conditions
   - Check what values are null/undefined

2. **Add strategic logging**
   - Log state BEFORE the crash
   - Log the path that led to the crash
   - Use `console.log` liberally during investigation

3. **Ask critical questions**
   - "Why is this null NOW when it should have a value?"
   - "What operation should have set this value?"
   - "When did the value become invalid?"

4. **Trace backwards from the crash**
   - Find where the invalid state was created
   - Fix the state transition, not the symptom

5. **Legitimate validation vs defensive coding**
   - Validation at boundaries = Good
   ```javascript
   // ✅ GOOD - Catch invalid input early
   if(!start || !goal) {
     console.error('PathFinder: BUG - called with null');
     return {found: false, ...};
   }
   ```

   - Silent workarounds = Bad
   ```javascript
   // ❌ BAD - Hides the bug
   if(!this.destStation) {
     return; // Silently do nothing
   }
   ```

### 🎯 Summary

- **Find the root cause** - don't patch symptoms
- **Fix at the source** - update where data should be set
- **Add explicit logging** - make bugs visible, not hidden
- **Validate inputs** - but crash loudly on invalid state
- **Never silently fail** - if something is wrong, make it obvious

**Remember**: A hidden bug is worse than a crash. Crashes force fixes, hidden bugs accumulate debt.

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
