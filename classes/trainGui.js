/**
 * Created by mfaivremacon on 01/09/2015.
 */

import {Train} from './train';
import {Drawing, Helpers} from "./helpers";
import {TrainMoveAnimation} from "./trainMoveAnimation";
import {FadeAnimation, Easing} from "./animationManager";

export class TrainGui extends Train {

  constructor(doc) {
    // console.log('trainGui#constructor', doc);
    super(doc);
    this.ctx = this.map.ctx;
    const displayOptions = doc.displayOptions || {};
    this.dispo = {
      margin: displayOptions.margin || 0.15, // %
      trainSize: displayOptions.trainSize || 15,
    };
    this.loadingCircleOpacity = 0; // Animated opacity for loading circle (0-1)
    this.stateTextOpacity = 0; // Animated opacity for state text (0-1)
    this.stateText = ''; // Current state text to display
  }

  /**
   * Get display text for current state
   * @returns {string} Human-readable state text
   */
  getStateText() {
    switch(this.state) {
      case Helpers.TrainStates.STOPPED:
        return 'Stopped';
      case Helpers.TrainStates.LOADING:
        return 'Loading...';
      case Helpers.TrainStates.UNLOADING:
        return 'Unloading...';
      case Helpers.TrainStates.MOVING:
        return 'Moving';
      case Helpers.TrainStates.WAITING:
        return 'Waiting';
      default:
        return '';
    }
  }

  /**
   * Override updateFromDB to start smooth movement animation when position changes
   * and detect state changes for loading animations
   */
  updateFromDB(doc) {
    // Capture old state and displayPos before update
    const oldState = this.state;
    const oldDisplayPos = this.displayPos ? _.clone(this.displayPos) : null;

    // Call parent updateFromDB (updates this.pos, this.state, etc.)
    super.updateFromDB(doc);

    // Detect state changes
    if(oldState !== this.state) {
      this.onStateChange(oldState, this.state);
    }

    // If position changed, start smooth movement animation
    if(doc.pos && oldDisplayPos) {
      const posChanged = oldDisplayPos.x !== this.pos.x || oldDisplayPos.y !== this.pos.y;

      if(posChanged) {
        // Remove any existing movement animation
        const animId = `train-move-${this._id}`;
        if(this.map.animationManager.hasAnimation(animId)) {
          this.map.animationManager.removeAnimation(animId);
        }

        // Create new smooth movement animation
        const animation = new TrainMoveAnimation(animId, {
          train: this,
          from: oldDisplayPos,
          to: this.pos,
          onUpdate: () => {
            this.map.animationManager.requestRedraw();
          },
          onComplete: () => {
            this.displayPos = _.clone(this.pos);
          }
        });

        this.map.animationManager.addAnimation(animation);
      }
    }
  }

  /**
   * Called when train state changes (detected in updateFromDB)
   * @param {string} oldState - Previous state
   * @param {string} newState - New current state
   */
  onStateChange(oldState, newState) {
    console.log(`Train ${this._id}: ${oldState} -> ${newState}`);

    // Update state text
    this.stateText = this.getStateText();

    // For LOADING/UNLOADING states, show text immediately (no fade animation)
    // because these states are short-lived (800-1000ms) and fade animations
    // take 500ms total (200ms out + 300ms in), leaving no time to see the text
    if(newState === Helpers.TrainStates.LOADING || newState === Helpers.TrainStates.UNLOADING) {
      // Cancel any ongoing text animations
      this.map.animationManager.removeAnimation(`train-statetext-fadein-${this._id}`);
      this.map.animationManager.removeAnimation(`train-statetext-fadeout-${this._id}`);
      // Show text immediately at full opacity
      this.stateTextOpacity = 1;
      this.map.animationManager.requestRedraw();
    } else {
      // For other states (STOPPED, MOVING, WAITING), use smooth fade transition
      this.fadeOutStateText(() => {
        this.startStateTextAnimation();
      });
    }

    // Loading circle animation
    if(newState === Helpers.TrainStates.LOADING || newState === Helpers.TrainStates.UNLOADING) {
      // Entering loading/unloading state
      this.startLoadingCircleAnimation();
    }
    else if(oldState === Helpers.TrainStates.LOADING || oldState === Helpers.TrainStates.UNLOADING) {
      // Exiting loading/unloading state
      this.fadeOutLoadingCircle();
    }
  }

  /**
   * Start loading circle animation (fade-in)
   * Circle will stay visible until state changes (onStateChange triggers fade-out)
   */
  startLoadingCircleAnimation() {
    // Remove any existing fade-in animation
    const fadeInId = `train-loading-fadein-${this._id}`;
    this.map.animationManager.removeAnimation(fadeInId);

    // Fade in (0 → 1, 200ms)
    const fadeIn = new FadeAnimation(fadeInId, {
      from: 0,
      to: 1,
      duration: 200,
      easing: Easing.easeOutQuad,
      onUpdate: (progress) => {
        this.loadingCircleOpacity = progress;
        this.map.animationManager.requestRedraw();
      },
      onComplete: () => {
        // Hold at opacity=1 until state changes (via onStateChange)
        this.loadingCircleOpacity = 1;
      }
    });

    this.map.animationManager.addAnimation(fadeIn);
  }

  /**
   * Fade out the loading circle
   */
  fadeOutLoadingCircle() {
    // Remove any existing animations
    const fadeInId = `train-loading-fadein-${this._id}`;
    const fadeOutId = `train-loading-fadeout-${this._id}`;
    this.map.animationManager.removeAnimation(fadeInId);
    this.map.animationManager.removeAnimation(fadeOutId);

    // Only fade out if circle is visible
    if(this.loadingCircleOpacity > 0) {
      const currentOpacity = this.loadingCircleOpacity;
      const fadeOut = new FadeAnimation(fadeOutId, {
        from: currentOpacity,
        to: 0,
        duration: 200,
        easing: Easing.easeInQuad,
        onUpdate: (progress) => {
          this.loadingCircleOpacity = currentOpacity * (1 - progress);
          this.map.animationManager.requestRedraw();
        },
        onComplete: () => {
          this.loadingCircleOpacity = 0;
        }
      });

      this.map.animationManager.addAnimation(fadeOut);
    } else {
      this.loadingCircleOpacity = 0;
    }
  }

  /**
   * Start state text animation (fade-in)
   */
  startStateTextAnimation() {
    // Remove any existing fade-in animation
    const fadeInId = `train-statetext-fadein-${this._id}`;
    this.map.animationManager.removeAnimation(fadeInId);

    // Fade in (0 → 1, 300ms - slightly slower for readability)
    const fadeIn = new FadeAnimation(fadeInId, {
      from: 0,
      to: 1,
      duration: 300,
      easing: Easing.easeOutQuad,
      onUpdate: (progress) => {
        this.stateTextOpacity = progress;
        this.map.animationManager.requestRedraw();
      },
      onComplete: () => {
        // Hold at opacity=1 until state changes
        this.stateTextOpacity = 1;
      }
    });

    this.map.animationManager.addAnimation(fadeIn);
  }

  /**
   * Fade out the state text
   * @param {Function} onComplete - Callback when fade-out completes
   */
  fadeOutStateText(onComplete) {
    // Remove any existing animations
    const fadeInId = `train-statetext-fadein-${this._id}`;
    const fadeOutId = `train-statetext-fadeout-${this._id}`;
    this.map.animationManager.removeAnimation(fadeInId);
    this.map.animationManager.removeAnimation(fadeOutId);

    // Only fade out if text is visible
    if(this.stateTextOpacity > 0) {
      const currentOpacity = this.stateTextOpacity;
      const fadeOut = new FadeAnimation(fadeOutId, {
        from: currentOpacity,
        to: 0,
        duration: 200,
        easing: Easing.easeInQuad,
        onUpdate: (progress) => {
          this.stateTextOpacity = currentOpacity * (1 - progress);
          this.map.animationManager.requestRedraw();
        },
        onComplete: () => {
          this.stateTextOpacity = 0;
          if(onComplete) onComplete();
        }
      });

      this.map.animationManager.addAnimation(fadeOut);
    } else {
      this.stateTextOpacity = 0;
      if(onComplete) onComplete();
    }
  }

  draw() {
    this.doDraw();
  }

  doDraw() {
    // console.log('TrainGui#doDraw', this._id);
    let size = this.map.dispo.zoom * this.dispo.trainSize;

    // Use displayPos (interpolated by animation) for rendering
    // Falls back to pos if displayPos is not set
    const renderPos = this.displayPos || this.pos;
    const rpos = this.map.relToRealCoords(renderPos);

    // draw path
    // console.log(this.path.length, this.destStation);

    // destination
    if(this.destStation) {
      const destpos = this.map.relToRealCoords(this.destStation.pos);
      this.ctx.fillStyle = "#fa0";
      Drawing.drawPoint(this.ctx, destpos, size);
    }

    /*
        _.each(this.path, function(p) {
          this.ctx.fillStyle = "#ff0";
          const rpos = this.map.relToRealCoords(p.pos);
          Drawing.drawPoint(this.ctx, rpos, size);
        });
    */

    // train's position
    // const rpos = this.map.relToRealCoords(this.pos);
    this.ctx.fillStyle = "#f00";
    Drawing.drawPoint(this.ctx, rpos, size);

    // Display passenger count above train (always show, even if 0)
    if(this.passengers) {
      const passengerCount = this.passengers.length;
      const fontSize = Math.max(14, 14 * this.map.dispo.zoom);
      this.ctx.font = `bold ${fontSize}px sans-serif`;

      const text = `${passengerCount}`;
      const textMetrics = this.ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      const textX = rpos.x - textWidth / 2;
      const textY = rpos.y - size - 8;

      // Draw background rectangle
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(textX - 4, textY - textHeight, textWidth + 8, textHeight + 6);

      // Draw text in white (or gray if empty)
      this.ctx.fillStyle = passengerCount > 0 ? '#fff' : '#888';
      this.ctx.fillText(text, textX, textY);
    }

    // Draw state text with animated opacity
    if(this.stateTextOpacity > 0 && this.stateText) {
      const fontSize = Math.max(12, 12 * this.map.dispo.zoom);
      this.ctx.font = `${fontSize}px sans-serif`;

      const textMetrics = this.ctx.measureText(this.stateText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      // Position above passenger count (or above train if no passengers shown)
      const passengerTextOffset = this.passengers && this.passengers.length >= 0 ? (textHeight + 12) : 0;
      const textX = rpos.x - textWidth / 2;
      const textY = rpos.y - size - 8 - passengerTextOffset;

      // Apply opacity
      const oldAlpha = this.ctx.globalAlpha;
      this.ctx.globalAlpha = this.stateTextOpacity;

      // Draw background rectangle (semi-transparent)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(textX - 4, textY - textHeight, textWidth + 8, textHeight + 4);

      // Draw text with color based on state
      let textColor = '#fff';
      if(this.state === Helpers.TrainStates.LOADING) {
        textColor = '#4CAF50'; // Green for loading
      } else if(this.state === Helpers.TrainStates.UNLOADING) {
        textColor = '#FF9800'; // Orange for unloading
      } else if(this.state === Helpers.TrainStates.MOVING) {
        textColor = '#2196F3'; // Blue for moving
      } else if(this.state === Helpers.TrainStates.STOPPED) {
        textColor = '#9E9E9E'; // Gray for stopped
      }

      this.ctx.fillStyle = textColor;
      this.ctx.fillText(this.stateText, textX, textY);

      // Restore alpha
      this.ctx.globalAlpha = oldAlpha;
    }

    // Draw loading circle with animated opacity (only if opacity > 0)
    if(this.loadingCircleOpacity > 0) {
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = '#fff';

      // Save current alpha and apply animated opacity
      const oldAlpha = this.ctx.globalAlpha;
      this.ctx.globalAlpha = this.loadingCircleOpacity;

      Drawing.drawCircle(this.ctx, rpos, Helpers.getPassengersRadius * this.map.dispo.zoom);

      // Restore original alpha
      this.ctx.globalAlpha = oldAlpha;
    }
  }

}
