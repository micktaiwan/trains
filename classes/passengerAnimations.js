/**
 * Passenger Animation Classes
 * Handles visual animations for passengers boarding/disembarking trains
 */

import {SpriteAnimation, Easing} from "./animationManager";
import {Drawing} from "./helpers";

/**
 * Passenger Boarding Animation
 * Animates a passenger moving from their position to the train
 * Uses bezier curve for smooth arc movement
 */
export class PassengerBoardingAnimation extends SpriteAnimation {
  constructor(id, options = {}) {
    // Calculate bezier curve control point for arc movement
    const midX = (options.from.x + options.to.x) / 2;
    const midY = Math.min(options.from.y, options.to.y) - 30; // Arc up

    super(id, {
      ...options,
      duration: options.duration || 1000, // 1 second boarding animation
      easing: Easing.easeInOutQuad,
    });

    // Bezier curve control point (for arc movement)
    this.controlPoint = {x: midX, y: midY};

    // Visual properties
    this.fromScale = 1;
    this.toScale = 0.3; // Shrink as they enter train
    this.fromOpacity = 1;
    this.toOpacity = 0; // Fade out as they board
    this.currentOpacity = 1;

    // Reference to map for drawing
    this.map = options.map;
    this.color = options.color || '#ff0'; // Yellow passenger
    this.size = options.size || 4;
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);

    if (this.running) {
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easing(progress);

      // Bezier curve interpolation (quadratic)
      // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const t = easedProgress;
      const oneMinusT = 1 - t;

      this.currentPos.x = oneMinusT * oneMinusT * this.fromPos.x +
                          2 * oneMinusT * t * this.controlPoint.x +
                          t * t * this.toPos.x;

      this.currentPos.y = oneMinusT * oneMinusT * this.fromPos.y +
                          2 * oneMinusT * t * this.controlPoint.y +
                          t * t * this.toPos.y;

      // Interpolate scale and opacity
      this.currentScale = this.fromScale + (this.toScale - this.fromScale) * easedProgress;
      this.currentOpacity = this.fromOpacity + (this.toOpacity - this.fromOpacity) * easedProgress;
    }

    return isComplete;
  }

  /**
   * Draw the animated passenger
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  draw(ctx) {
    if (!this.running) return;

    const size = this.map.dispo.zoom * this.size * this.currentScale;
    const rpos = this.map.relToRealCoords(this.currentPos);

    // Draw passenger with fade
    ctx.globalAlpha = this.currentOpacity;
    ctx.fillStyle = this.color;
    Drawing.drawPoint(ctx, rpos, size);
    ctx.globalAlpha = 1.0; // Reset alpha
  }
}

/**
 * Passenger Disembarking Animation
 * Animates passengers spreading out from the train in a radial pattern
 */
export class PassengerDisembarkingAnimation extends SpriteAnimation {
  constructor(id, options = {}) {
    super(id, {
      ...options,
      duration: options.duration || 1500, // 1.5 seconds disembark animation
      easing: Easing.easeOutCubic,
    });

    // Visual properties
    this.fromScale = 0.3; // Start small
    this.toScale = 1; // Grow to normal size
    this.fromOpacity = 0; // Fade in
    this.toOpacity = 1;
    this.currentOpacity = 0;

    // Reference to map for drawing
    this.map = options.map;
    this.color = options.color || '#ff0'; // Yellow passenger
    this.size = options.size || 4;

    // Radial spread parameters
    this.angle = options.angle || 0; // Angle for radial spread
    this.spreadDistance = options.spreadDistance || 30; // How far to spread
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);

    if (this.running) {
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      const easedProgress = this.easing(progress);

      // Radial movement from train position
      const distance = this.spreadDistance * easedProgress;
      this.currentPos.x = this.fromPos.x + Math.cos(this.angle) * distance;
      this.currentPos.y = this.fromPos.y + Math.sin(this.angle) * distance;

      // Interpolate scale and opacity
      this.currentScale = this.fromScale + (this.toScale - this.fromScale) * easedProgress;
      this.currentOpacity = this.fromOpacity + (this.toOpacity - this.fromOpacity) * easedProgress;
    }

    return isComplete;
  }

  /**
   * Draw the animated passenger
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  draw(ctx) {
    if (!this.running) return;

    const size = this.map.dispo.zoom * this.size * this.currentScale;
    const rpos = this.map.relToRealCoords(this.currentPos);

    // Draw passenger with fade
    ctx.globalAlpha = this.currentOpacity;
    ctx.fillStyle = this.color;
    Drawing.drawPoint(ctx, rpos, size);
    ctx.globalAlpha = 1.0; // Reset alpha
  }
}

/**
 * Multi-Passenger Animation Manager
 * Manages multiple passenger animations simultaneously
 */
export class PassengerAnimationGroup {
  constructor(animationManager) {
    this.animationManager = animationManager;
    this.groupId = Date.now() + '_' + Math.random();
  }

  /**
   * Animate multiple passengers boarding a train
   * @param {Array} passengers - Array of passenger objects with pos
   * @param {Object} trainPos - Train position
   * @param {Object} map - Map reference for drawing
   */
  animateBoarding(passengers, trainPos, map) {
    passengers.forEach((passenger, index) => {
      const animation = new PassengerBoardingAnimation(
        `boarding_${this.groupId}_${index}`,
        {
          from: passenger.pos,
          to: trainPos,
          map: map,
          // Stagger animation start for visual effect
          onUpdate: (progress) => {
            // Could add custom update logic here
          },
          onComplete: () => {
            // Animation complete
            console.log('Passenger boarding animation complete');
          }
        }
      );

      // Add slight delay for each passenger (stagger effect)
      setTimeout(() => {
        this.animationManager.addAnimation(animation);

        // Add custom draw callback to animation manager
        animation.drawCallback = (ctx) => animation.draw(ctx);
      }, index * 50); // 50ms stagger between each passenger
    });
  }

  /**
   * Animate multiple passengers disembarking from a train
   * @param {number} passengerCount - Number of passengers to animate
   * @param {Object} trainPos - Train position
   * @param {Object} map - Map reference for drawing
   */
  animateDisembarking(passengerCount, trainPos, map) {
    const angleStep = (2 * Math.PI) / passengerCount;

    for (let i = 0; i < passengerCount; i++) {
      const angle = i * angleStep;
      const animation = new PassengerDisembarkingAnimation(
        `disembark_${this.groupId}_${i}`,
        {
          from: trainPos,
          to: trainPos, // Will be calculated by radial spread
          angle: angle,
          spreadDistance: 30 + Math.random() * 20, // Random spread 30-50px
          map: map,
          onComplete: () => {
            console.log('Passenger disembarking animation complete');
          }
        }
      );

      // Add slight delay for visual effect
      setTimeout(() => {
        this.animationManager.addAnimation(animation);

        // Add custom draw callback to animation manager
        animation.drawCallback = (ctx) => animation.draw(ctx);
      }, i * 30); // 30ms stagger
    }
  }
}
