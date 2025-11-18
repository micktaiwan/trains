/**
 * Animation Manager - Central animation system for Canvas rendering
 *
 * Inspired by game engines (Phaser, PixiJS, Three.js):
 * - Single requestAnimationFrame loop
 * - Centralized time management (deltaTime)
 * - Layer-based rendering
 * - Dirty flag optimization
 */

// Easing functions for smooth animations
export const Easing = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

/**
 * Base Animation class
 * All specific animations inherit from this
 */
export class Animation {
  constructor(id, options = {}) {
    this.id = id;
    this.duration = options.duration || 1000; // ms
    this.startTime = null;
    this.easing = options.easing || Easing.linear;
    this.onComplete = options.onComplete || null;
    this.onUpdate = options.onUpdate || null;
    this.loop = options.loop || false;
    this.running = false;
    this.completed = false;
  }

  start(currentTime) {
    this.startTime = currentTime;
    this.running = true;
    this.completed = false;
  }

  /**
   * Update animation state
   * @param {number} currentTime - Current timestamp
   * @returns {boolean} - true if animation is complete
   */
  update(currentTime) {
    if (!this.running || !this.startTime) return false;

    const elapsed = currentTime - this.startTime;
    let progress = Math.min(elapsed / this.duration, 1);

    // Apply easing
    const easedProgress = this.easing(progress);

    // Call update callback
    if (this.onUpdate) {
      this.onUpdate(easedProgress, elapsed);
    }

    // Check if complete
    if (progress >= 1) {
      if (this.loop) {
        // Restart animation
        this.startTime = currentTime;
        return false;
      } else {
        this.running = false;
        this.completed = true;
        if (this.onComplete) {
          this.onComplete();
        }
        return true;
      }
    }

    return false;
  }

  stop() {
    this.running = false;
  }

  reset() {
    this.startTime = null;
    this.running = false;
    this.completed = false;
  }
}

/**
 * Fade Animation (opacity changes)
 * Used for city zones, UI elements, etc.
 */
export class FadeAnimation extends Animation {
  constructor(id, options = {}) {
    super(id, options);
    this.fromOpacity = options.from !== undefined ? options.from : 0;
    this.toOpacity = options.to !== undefined ? options.to : 1;
    this.currentOpacity = this.fromOpacity;
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);

    if (this.running) {
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easing(progress);

      this.currentOpacity = this.fromOpacity + (this.toOpacity - this.fromOpacity) * easedProgress;
    }

    return isComplete;
  }

  getOpacity() {
    return this.currentOpacity;
  }
}

/**
 * Sprite Animation (position, scale, rotation)
 * Base class for moving objects
 */
export class SpriteAnimation extends Animation {
  constructor(id, options = {}) {
    super(id, options);
    this.fromPos = options.from || {x: 0, y: 0};
    this.toPos = options.to || {x: 0, y: 0};
    this.currentPos = {...this.fromPos};
    this.fromScale = options.fromScale || 1;
    this.toScale = options.toScale || 1;
    this.currentScale = this.fromScale;
    this.fromRotation = options.fromRotation || 0;
    this.toRotation = options.toRotation || 0;
    this.currentRotation = this.fromRotation;
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);

    if (this.running) {
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easing(progress);

      // Interpolate position
      this.currentPos.x = this.fromPos.x + (this.toPos.x - this.fromPos.x) * easedProgress;
      this.currentPos.y = this.fromPos.y + (this.toPos.y - this.fromPos.y) * easedProgress;

      // Interpolate scale
      this.currentScale = this.fromScale + (this.toScale - this.fromScale) * easedProgress;

      // Interpolate rotation
      this.currentRotation = this.fromRotation + (this.toRotation - this.fromRotation) * easedProgress;
    }

    return isComplete;
  }

  getPosition() {
    return this.currentPos;
  }

  getScale() {
    return this.currentScale;
  }

  getRotation() {
    return this.currentRotation;
  }
}

/**
 * Layer - Rendering layer with z-index
 */
export class Layer {
  constructor(name, zIndex) {
    this.name = name;
    this.zIndex = zIndex;
    this.visible = true;
    this.objects = [];
    this.dirty = true; // needs redraw
  }

  addObject(obj) {
    if (!this.objects.includes(obj)) {
      this.objects.push(obj);
      this.dirty = true;
    }
  }

  removeObject(obj) {
    const index = this.objects.indexOf(obj);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.dirty = true;
    }
  }

  clear() {
    this.objects = [];
    this.dirty = true;
  }

  markDirty() {
    this.dirty = true;
  }
}

/**
 * Animation Manager - Central animation coordinator
 */
export class AnimationManager {
  constructor(drawCallback) {
    this.animations = new Map(); // id -> Animation
    this.layers = new Map(); // name -> Layer
    this.running = false;
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.fpsUpdateTime = 0;
    this.rafId = null;
    this.drawCallback = drawCallback; // function that draws the scene
    this.dirty = false; // needs redraw
    this.debugMode = false;

    // Create default layers
    this.createLayer('background', 0); // Cities
    this.createLayer('rails', 1); // Stations + rails
    this.createLayer('vehicles', 2); // Trains
    this.createLayer('npcs', 3); // Persons
    this.createLayer('effects', 4); // Particles, animations
    this.createLayer('ui', 5); // Overlays, text
  }

  createLayer(name, zIndex) {
    const layer = new Layer(name, zIndex);
    this.layers.set(name, layer);
    return layer;
  }

  getLayer(name) {
    return this.layers.get(name);
  }

  /**
   * Start the animation loop
   */
  start() {
    if (this.running) return;

    this.running = true;
    this.lastFrameTime = performance.now();
    this.tick(this.lastFrameTime);

    console.log('AnimationManager: started');
  }

  /**
   * Stop the animation loop
   */
  stop() {
    if (!this.running) return;

    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    console.log('AnimationManager: stopped');
  }

  /**
   * Main animation loop tick
   */
  tick(timestamp) {
    if (!this.running) return;

    // Calculate delta time
    this.deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // Update FPS counter
    this.frameCount++;
    if (timestamp - this.fpsUpdateTime > 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = timestamp;
    }

    // Update all animations
    let needsRedraw = false;
    for (const [id, animation] of this.animations) {
      const isComplete = animation.update(timestamp);

      if (isComplete) {
        // Remove completed animations
        this.animations.delete(id);
        needsRedraw = true;
      } else if (animation.running) {
        needsRedraw = true;
      }
    }

    // Check if any layer is dirty
    for (const layer of this.layers.values()) {
      if (layer.dirty) {
        needsRedraw = true;
      }
    }

    // Redraw if needed or if dirty flag is set
    if (needsRedraw || this.dirty) {
      this.draw(timestamp);
      this.dirty = false;

      // Clear layer dirty flags
      for (const layer of this.layers.values()) {
        layer.dirty = false;
      }
    }

    // Schedule next frame
    this.rafId = requestAnimationFrame((ts) => this.tick(ts));
  }

  /**
   * Draw the entire scene
   */
  draw(timestamp) {
    if (this.drawCallback) {
      this.drawCallback(timestamp, this.deltaTime, this.animations);
    }

    // Debug overlay
    if (this.debugMode) {
      this.drawDebugInfo();
    }
  }

  /**
   * Add an animation
   */
  addAnimation(animation) {
    if (this.animations.has(animation.id)) {
      console.warn('AnimationManager: animation already exists:', animation.id);
      return;
    }

    this.animations.set(animation.id, animation);
    animation.start(this.lastFrameTime);
    this.requestRedraw();

    if (this.debugMode) {
      console.log('AnimationManager: added animation:', animation.id);
    }
  }

  /**
   * Remove an animation
   */
  removeAnimation(id) {
    const animation = this.animations.get(id);
    if (animation) {
      animation.stop();
      this.animations.delete(id);
      this.requestRedraw();

      if (this.debugMode) {
        console.log('AnimationManager: removed animation:', id);
      }
    }
  }

  /**
   * Get an animation by id
   */
  getAnimation(id) {
    return this.animations.get(id);
  }

  /**
   * Check if an animation exists
   */
  hasAnimation(id) {
    return this.animations.has(id);
  }

  /**
   * Request a redraw on next frame
   */
  requestRedraw() {
    this.dirty = true;
  }

  /**
   * Clear all animations
   */
  clearAnimations() {
    this.animations.clear();
    this.requestRedraw();
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.requestRedraw();
  }

  /**
   * Draw debug information (FPS, animation count, etc.)
   */
  drawDebugInfo() {
    // This would be implemented by the map to draw debug info
    // For now, just log to console periodically
    if (this.frameCount % 60 === 0) {
      console.log(`FPS: ${this.fps}, Animations: ${this.animations.size}, Delta: ${this.deltaTime.toFixed(2)}ms`);
    }
  }
}
