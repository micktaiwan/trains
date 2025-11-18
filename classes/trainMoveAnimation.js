/**
 * TrainMoveAnimation - Smooth train movement animation
 *
 * Interpolates train position between server updates using the centralized
 * AnimationManager system. This provides smooth 60 FPS movement instead of
 * the "jumping" effect when receiving position updates from the server.
 */

import {SpriteAnimation, Easing} from "./animationManager";
import {Helpers} from "./helpers";

export class TrainMoveAnimation extends SpriteAnimation {
  constructor(id, options = {}) {
    // Calculate animation duration based on server update interval
    // Use 90% of the interval to leave a margin for network latency
    const duration = (Helpers.serverInterval || 5000) * 0.9;

    super(id, {
      from: options.from,           // Starting position {x, y}
      to: options.to,               // Target position {x, y}
      duration: duration,
      easing: Easing.linear,        // Linear movement (realistic for trains)
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
    });

    this.train = options.train;
  }

  update(currentTime) {
    const isComplete = super.update(currentTime);

    if (this.running && this.train) {
      // Update the train's display position (used for rendering)
      // Note: This does NOT update this.pos (authoritative server position)
      this.train.displayPos = this.getPosition();
    }

    if (isComplete && this.train) {
      // Animation complete - ensure train is at final position
      this.train.displayPos = this.toPos;
    }

    return isComplete;
  }
}
