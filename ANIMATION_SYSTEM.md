# Animation System Documentation

## 🎬 Overview

The animation system has been completely refactored to follow game engine best practices (inspired by Phaser, PixiJS, Three.js). This document explains the new architecture and how to use it.

## 🏗️ Architecture

### Core Principle: Single requestAnimationFrame Loop

**Before (problematic):**
```
map.draw() called from:
  ├─ onMouseMove()
  ├─ onMouseDown()
  ├─ onMouseUp()
  ├─ onMouseWheel()
  ├─ DB observer callbacks
  ├─ Game clock updates
  └─ Individual animations (city zones)
```
**Problem:** Multiple, uncoordinated draw calls → glitches, screen tearing, race conditions

**After (clean):**
```
AnimationManager
  └─ Single requestAnimationFrame loop
     ├─ Updates all animations
     ├─ Calculates deltaTime
     ├─ Calls drawScene() ONCE per frame
     └─ Only redraws when needed (dirty flag)
```

### System Components

```
┌──────────────────────────────────────────┐
│  AnimationManager (classes/animationManager.js)
│  - Central RAF loop
│  - Manages all animations
│  - Tracks deltaTime, FPS
│  - Dirty flag optimization
└──────────────┬───────────────────────────┘
               │
               ├──► Animation (base class)
               │    - Common properties: duration, easing, callbacks
               │    - update() method
               │
               ├──► FadeAnimation
               │    - Opacity transitions
               │    - Used for: city zones, UI elements
               │
               ├──► SpriteAnimation
               │    - Position, scale, rotation
               │    - Used for: moving objects
               │
               ├──► PassengerBoardingAnimation
               │    - Bezier curve movement to train
               │    - Fade out + shrink effect
               │
               └──► PassengerDisembarkingAnimation
                    - Radial spread from train
                    - Fade in + grow effect
```

## 📚 Classes Reference

### 1. AnimationManager

**Location:** `classes/animationManager.js`

**Responsibilities:**
- Single source of truth for animation timing
- Manages animation lifecycle (add, update, remove)
- Coordinates drawing with requestAnimationFrame
- Provides dirty flag optimization (only redraw when needed)

**Key Methods:**

```javascript
// Start the animation loop (called in GameMapGui.init())
animationManager.start()

// Stop the loop (called in GameMapGui.destroy())
animationManager.stop()

// Add an animation
animationManager.addAnimation(animation)

// Remove an animation
animationManager.removeAnimation(id)

// Check if animation exists
animationManager.hasAnimation(id)

// Request a redraw on next frame
animationManager.requestRedraw()
```

**Example Integration (GameMapGui):**

```javascript
constructor() {
  // Create animation manager with draw callback
  this.animationManager = new AnimationManager((timestamp, deltaTime, animations) => {
    this.drawScene(timestamp, deltaTime, animations);
  });
}

init() {
  // Start the loop
  this.animationManager.start();
}

destroy() {
  // Stop the loop
  this.animationManager.stop();
}
```

### 2. Animation (Base Class)

**Properties:**
- `id` - Unique identifier
- `duration` - Animation length in milliseconds
- `easing` - Easing function (from Easing constants)
- `onUpdate` - Callback called each frame with progress
- `onComplete` - Callback when animation finishes
- `loop` - Whether to restart when complete

**Example:**

```javascript
const animation = new Animation('myAnimation', {
  duration: 1000,
  easing: Easing.easeInOutQuad,
  onUpdate: (progress) => {
    console.log('Progress:', progress); // 0 to 1
  },
  onComplete: () => {
    console.log('Done!');
  }
});
```

### 3. FadeAnimation

**Extends:** Animation

**Use Cases:** Opacity transitions (fade in/out)

**Example: City Zone Fade**

```javascript
// Fade in
const fadeIn = new FadeAnimation('cityZoneFadeIn', {
  from: 0,
  to: 1,
  duration: 1100,
  easing: Easing.easeOutQuad,
  onUpdate: (progress) => {
    this.cityZoneFadeOpacity = fadeIn.getOpacity();
  }
});
animationManager.addAnimation(fadeIn);

// Fade out
const fadeOut = new FadeAnimation('cityZoneFadeOut', {
  from: 1,
  to: 0,
  duration: 1100,
  easing: Easing.easeInQuad,
  onUpdate: (progress) => {
    this.cityZoneFadeOpacity = fadeOut.getOpacity();
  }
});
animationManager.addAnimation(fadeOut);
```

### 4. SpriteAnimation

**Extends:** Animation

**Use Cases:** Moving objects, transformations

**Properties:**
- `fromPos` / `toPos` - Start and end positions
- `fromScale` / `toScale` - Scale transformation
- `fromRotation` / `toRotation` - Rotation transformation

**Example: Moving an Object**

```javascript
const moveAnimation = new SpriteAnimation('moveObject', {
  from: {x: 100, y: 100},
  to: {x: 500, y: 300},
  fromScale: 1,
  toScale: 1.5,
  duration: 2000,
  easing: Easing.easeInOutCubic,
  onUpdate: (progress) => {
    const pos = moveAnimation.getPosition();
    const scale = moveAnimation.getScale();
    // Use pos and scale for drawing
  }
});
```

### 5. PassengerBoardingAnimation

**Extends:** SpriteAnimation

**Location:** `classes/passengerAnimations.js`

**Use Case:** Animate passengers moving from ground to train

**Features:**
- Bezier curve path (smooth arc movement)
- Fade out + shrink effect
- Staggered animation support

**Example:**

```javascript
import {PassengerAnimationGroup} from './classes/passengerAnimations';

// In train getPassengers() method:
const animGroup = new PassengerAnimationGroup(this.map.animationManager);
animGroup.animateBoarding(passengers, trainPos, this.map);
```

### 6. PassengerDisembarkingAnimation

**Extends:** SpriteAnimation

**Location:** `classes/passengerAnimations.js`

**Use Case:** Animate passengers spreading from train

**Features:**
- Radial spread pattern
- Fade in + grow effect
- Randomized spread distance

**Example:**

```javascript
// In train leavePassengers() method:
const animGroup = new PassengerAnimationGroup(this.map.animationManager);
animGroup.animateDisembarking(passengerCount, trainPos, this.map);
```

## 🎨 Easing Functions

Available easing functions in `Easing` object:

```javascript
Easing.linear         // No easing
Easing.easeInQuad     // Accelerate slowly
Easing.easeOutQuad    // Decelerate slowly
Easing.easeInOutQuad  // Smooth acceleration + deceleration
Easing.easeInCubic    // Strong acceleration
Easing.easeOutCubic   // Strong deceleration
Easing.easeInOutCubic // Strong smooth curve
```

**Visual representation:**
```
linear:       ___/
easeInQuad:   __/
easeOutQuad:  /‾‾
easeInOutQuad: _/‾
```

## 🔄 Migration Guide

### Old Pattern (DON'T)

```javascript
// ❌ BAD - Direct draw calls
onMouseMove(e) {
  this.mousePos = getMouseCoords(e);
  this.draw(); // Immediate redraw
}

// ❌ BAD - Manual RAF management
this.animating = true;
requestAnimationFrame(() => {
  this.draw();
});
```

### New Pattern (DO)

```javascript
// ✅ GOOD - Request redraw
onMouseMove(e) {
  this.mousePos = getMouseCoords(e);
  this.draw(); // Actually calls animationManager.requestRedraw()
}

// ✅ GOOD - Use AnimationManager
const animation = new FadeAnimation('myFade', {...});
this.animationManager.addAnimation(animation);
```

## 🛠️ How to Add New Animations

### Step 1: Create Animation Class

```javascript
// classes/myAnimation.js
import {Animation, Easing} from "./animationManager";

export class MyCustomAnimation extends Animation {
  constructor(id, options = {}) {
    super(id, {
      ...options,
      duration: options.duration || 1000,
      easing: options.easing || Easing.linear,
    });

    // Your custom properties
    this.customValue = 0;
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);

    if (this.running) {
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easing(progress);

      // Update your custom values
      this.customValue = easedProgress * 100;
    }

    return isComplete;
  }

  // Optional: Add draw method
  draw(ctx) {
    if (!this.running) return;
    // Draw your animation
  }
}
```

### Step 2: Use in GameMapGui or Game Objects

```javascript
import {MyCustomAnimation} from './classes/myAnimation';

// In your game code:
const animation = new MyCustomAnimation('myAnim', {
  duration: 2000,
  easing: Easing.easeInOutQuad,
  onUpdate: (progress) => {
    // Update callback
  },
  onComplete: () => {
    // Completion callback
  }
});

// Add to manager
this.map.animationManager.addAnimation(animation);

// Optional: Add draw callback
animation.drawCallback = (ctx) => animation.draw(ctx);
```

### Step 3: Draw Callback (if visual)

Animations with visual effects need a `drawCallback`:

```javascript
animation.drawCallback = (ctx) => {
  // Your drawing code here
  ctx.fillStyle = 'red';
  ctx.fillRect(x, y, width, height);
};
```

This gets called automatically in `drawScene()` (Layer 5: Effects).

## 🐛 Debugging

### Enable Debug Mode

```javascript
// In browser console:
map.animationManager.setDebugMode(true);
```

**Debug info logged every 60 frames:**
- FPS
- Active animation count
- Delta time

### Check Active Animations

```javascript
// In browser console:
console.log(map.animationManager.animations);
```

### Force Redraw

```javascript
map.animationManager.requestRedraw();
```

## 📊 Performance Optimization

### Dirty Flag System

The AnimationManager only redraws when:
1. An animation is running
2. `requestRedraw()` is called explicitly
3. A layer is marked dirty

**Benefits:**
- 60 FPS only when needed
- 0 FPS when idle (battery friendly)
- No unnecessary redraws

### Best Practices

1. **Use `requestRedraw()` instead of `draw()`**
   ```javascript
   // ✅ GOOD
   this.map.draw(); // Internally calls requestRedraw()

   // ❌ BAD (old pattern, doesn't exist anymore)
   this.map.drawScene(); // Direct call
   ```

2. **Reuse animation IDs for toggle effects**
   ```javascript
   // Remove old animation before adding new one
   if (animationManager.hasAnimation('fade')) {
     animationManager.removeAnimation('fade');
   }
   animationManager.addAnimation(newFadeAnimation);
   ```

3. **Clean up animations on destroy**
   ```javascript
   // In destroy/cleanup:
   this.animationManager.clearAnimations();
   this.animationManager.stop();
   ```

4. **Stagger multiple animations**
   ```javascript
   passengers.forEach((p, index) => {
     setTimeout(() => {
       animationManager.addAnimation(createAnimation(p));
     }, index * 50); // 50ms delay between each
   });
   ```

## ✅ Implemented Features

### Train Movement Animation (IMPLEMENTED)

**Status**: ✅ Complete

Trains now move smoothly between server position updates using the centralized AnimationManager.

**How it works:**

1. **Server-side**: Trains update their position every ~5000ms in the game loop
2. **Client-side**: When a new position is received:
   - `TrainGui.updateFromDB()` detects the position change
   - Creates a `TrainMoveAnimation` to interpolate between old and new position
   - Animation runs at 60 FPS for ~4500ms (90% of server interval)
   - Uses `displayPos` for rendering (interpolated), while `pos` remains authoritative

**Implementation:**

```javascript
// classes/trainMoveAnimation.js
export class TrainMoveAnimation extends SpriteAnimation {
  constructor(id, options = {}) {
    const duration = (Helpers.serverInterval || 5000) * 0.9;
    super(id, {
      from: options.from,
      to: options.to,
      duration: duration,
      easing: Easing.linear,  // Linear movement for realistic train motion
    });
    this.train = options.train;
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);
    if (this.running && this.train) {
      // Update display position (used for rendering)
      this.train.displayPos = this.getPosition();
    }
    return isComplete;
  }
}
```

**Usage in TrainGui:**

```javascript
updateFromDB(doc) {
  const oldDisplayPos = this.displayPos ? _.clone(this.displayPos) : null;
  super.updateFromDB(doc);

  if(doc.pos && oldDisplayPos && positionChanged) {
    const animation = new TrainMoveAnimation(`train-move-${this._id}`, {
      train: this,
      from: oldDisplayPos,
      to: this.pos,
    });
    this.map.animationManager.addAnimation(animation);
  }
}
```

**Key properties:**
- `this.pos` - Authoritative position from server (used for collision detection, passenger pickup)
- `this.displayPos` - Interpolated position (used for rendering only)

**Benefits:**
- ✅ Smooth 60 FPS movement between server updates
- ✅ No visual "jumping"
- ✅ Proper handling of rapid position changes (animation replacement)
- ✅ Low CPU usage (dirty flag optimization)

## 🔮 Future Enhancements

### Potential additions:

1. **Particle Effects**
   - Steam from trains
   - Sparkles on station placement
   - Coin effects on revenue

2. **Station Placement Animation**
   - Pop-in effect when station is created
   - Ripple effect on placement

3. **UI Transitions**
   - Panel slide-in/out
   - Button hover effects
   - Modal fade-in/out

## 📝 Summary

### What Changed

| Before | After |
|--------|-------|
| Multiple `draw()` calls per frame | Single `drawScene()` per frame |
| Manual RAF management | Centralized AnimationManager |
| Hardcoded fade animation | Reusable FadeAnimation class |
| No animation system | Full animation framework |
| Always drawing at 60 FPS | Smart dirty flag (draw only when needed) |

### Benefits

✅ **No glitches** - single draw per frame
✅ **Easy to add animations** - extend base classes
✅ **Better performance** - dirty flag optimization
✅ **Maintainable** - clear separation of concerns
✅ **Debuggable** - centralized state, debug mode
✅ **Professional** - follows game engine patterns

### Key Takeaways

1. **Never call `drawScene()` directly** - use `draw()` which calls `requestRedraw()`
2. **All animations go through AnimationManager** - no manual RAF
3. **Extend base classes** for new animations
4. **Use easing functions** for smooth motion
5. **Add `drawCallback`** for visual animations
6. **Clean up** on destroy

## 🚀 Getting Started

To use the new system:

```javascript
// 1. Import animation classes
import {FadeAnimation, Easing} from './classes/animationManager';

// 2. Create animation
const fadeIn = new FadeAnimation('myFade', {
  from: 0,
  to: 1,
  duration: 1000,
  easing: Easing.easeInOutQuad,
  onUpdate: (progress) => { /* ... */ },
  onComplete: () => { /* ... */ }
});

// 3. Add to manager
this.map.animationManager.addAnimation(fadeIn);

// 4. (Optional) Add draw callback for visual effects
fadeIn.drawCallback = (ctx) => fadeIn.draw(ctx);
```

That's it! The AnimationManager handles the rest.
