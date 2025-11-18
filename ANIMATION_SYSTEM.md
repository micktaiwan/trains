# Animation System Documentation

## 🎬 Overview

Centralized animation framework inspired by game engines (Phaser, PixiJS). Single requestAnimationFrame loop manages all animations with dirty flag optimization.

## 🏗️ Architecture

**Core Principle:** One RAF loop, one `drawScene()` call per frame.

```
AnimationManager (single RAF loop)
  └─ drawScene() called once per frame
     ├─ Updates all animations
     ├─ Calculates deltaTime
     └─ Only redraws when dirty flag is set
```

**Components:**

- `AnimationManager` - Central coordinator with RAF loop
- `Animation` - Base class (duration, easing, callbacks)
- `FadeAnimation` - Opacity transitions
- `SpriteAnimation` - Position/scale/rotation
- `TrainMoveAnimation` - Smooth train movement (extends SpriteAnimation)
- `PassengerBoardingAnimation` - Bezier boarding with fade
- `PassengerDisembarkingAnimation` - Radial spread with fade

## 📚 Key Classes

### AnimationManager

Located: `classes/animationManager.js`

```javascript
// Start in GameMapGui.init()
this.animationManager = new AnimationManager((timestamp, deltaTime) => {
  this.drawScene(timestamp, deltaTime);
});
this.animationManager.start();

// Add animation
animationManager.addAnimation(myAnimation);

// Request redraw
animationManager.requestRedraw();
```

### Creating Animations

```javascript
import {FadeAnimation, SpriteAnimation, Easing} from "./animationManager";

// Fade example
const fade = new FadeAnimation('myFade', {
  from: 0, to: 1,
  duration: 1000,
  easing: Easing.easeOutQuad,
  onUpdate: (progress) => { /* update state */ },
  onComplete: () => { /* cleanup */ }
});

// Move example
const move = new SpriteAnimation('myMove', {
  from: {x: 0, y: 0}, to: {x: 100, y: 100},
  duration: 2000,
  easing: Easing.linear
});
```

**Available easings:** `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`

## ✅ Implemented Features

### Train Movement Animation

Smooth 60 FPS interpolation between server updates (every 1000ms).

**How it works:**

1. Server updates `train.pos` every 1000ms
2. Client receives update via DDP
3. `TrainGui.updateFromDB()` detects position change
4. Creates `TrainMoveAnimation` (duration: 900ms)
5. Animation updates `train.displayPos` at 60 FPS
6. Rendering uses `displayPos` (interpolated) instead of `pos` (authoritative)

**Key distinction:**

- `this.pos` - Server position (game logic, collisions)
- `this.displayPos` - Interpolated position (rendering only)

## 🎨 Best Practices

### DO ✅
```javascript
// Use AnimationManager
this.map.animationManager.addAnimation(animation);
this.map.animationManager.requestRedraw();

// Clean up animations
this.animationManager.removeAnimation(id);
```

### DON'T ❌
```javascript
// Manual RAF management
requestAnimationFrame(() => this.draw());

// Direct draw() calls
this.draw(); // Use requestRedraw() instead
```

## 🔧 Extending the System

To add new animations, extend base classes:

```javascript
export class MyAnimation extends SpriteAnimation {
  constructor(id, options) {
    super(id, {
      from: options.from,
      to: options.to,
      duration: options.duration || 1000,
      easing: Easing.easeInOutQuad,
    });
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);
    if (this.running) {
      // Custom logic here
    }
    return isComplete;
  }
}
```

## 🐛 Debug

```javascript
// In browser console
map.animationManager.setDebugMode(true);
console.log(map.animationManager.animations);
```

## 📊 Performance

**Dirty Flag System:** Only redraws when:

- An animation is running
- `requestRedraw()` called explicitly
- A layer is marked dirty

**Result:** 60 FPS when animating, 0 FPS when idle (battery-friendly).

## 🔮 Future Enhancements

Potential additions using the same system:

- Particle effects (steam, sparkles, coins)
- Station placement animations (pop-in, ripple)
- UI transitions (panel slide, modal fade)

## 📝 Summary

| Before | After |
|--------|-------|
| Multiple `draw()` calls per frame | Single `drawScene()` per frame |
| Manual RAF management | Centralized AnimationManager |
| Hardcoded animations | Reusable animation classes |
| Always 60 FPS (wasteful) | Smart dirty flag (0-60 FPS) |

The system is now production-ready and powers smooth train movement with minimal overhead.
