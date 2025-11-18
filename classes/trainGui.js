/**
 * Created by mfaivremacon on 01/09/2015.
 */

import {Train} from './train';
import {Drawing, Helpers} from "./helpers";
import {TrainMoveAnimation} from "./trainMoveAnimation";

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
  }

  /**
   * Override updateFromDB to start smooth movement animation when position changes
   */
  updateFromDB(doc) {
    // Capture old displayPos before update
    const oldDisplayPos = this.displayPos ? _.clone(this.displayPos) : null;

    // Call parent updateFromDB (updates this.pos, this.from, etc.)
    super.updateFromDB(doc);

    // If position changed, start smooth animation
    if(doc.pos && oldDisplayPos) {
      // Check if position actually changed (not just a progress update)
      const posChanged = oldDisplayPos.x !== this.pos.x || oldDisplayPos.y !== this.pos.y;

      if(posChanged) {
        // Remove any existing animation for this train
        const animId = `train-move-${this._id}`;
        if(this.map.animationManager.hasAnimation(animId)) {
          this.map.animationManager.removeAnimation(animId);
        }

        // Create new smooth movement animation
        const animation = new TrainMoveAnimation(animId, {
          train: this,
          from: oldDisplayPos,      // Start from current display position
          to: this.pos,             // Animate to new server position
          onUpdate: () => {
            // Request redraw on each animation frame
            this.map.animationManager.requestRedraw();
          },
          onComplete: () => {
            // Ensure final position is exact
            this.displayPos = _.clone(this.pos);
          }
        });

        // Add animation to manager
        this.map.animationManager.addAnimation(animation);
      }
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

    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#fff';
    if(this.progress === 0) {
      Drawing.drawCircle(this.ctx, rpos, Helpers.getPassengersRadius * this.map.dispo.zoom);
    }
  }

}
