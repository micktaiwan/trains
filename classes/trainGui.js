/**
 * Created by mfaivremacon on 01/09/2015.
 */

import {Train} from './train';
import {Drawing, Helpers, Vector} from "./helpers";

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
    this.currentDrawStep = this.moveTotalSteps = 20; // default values that are calculated later
    this.animateWait = 100; // constant: draw every animateWait ms
    this.animating = false;
  }

  draw() {
    return this.doDraw();
    this.moveTotalSteps = Helpers.serverInterval / this.animateWait;
    // console.log('TrainGui#draw', Helpers.serverInterval, this.moveTotalSteps, this.animateWait);
    if(!this.animating) {
      if(this.hasMoved) {
        this.hasMoved = false;
        this.currentDrawStep = 0;
        this.animate();
      }
    }
    this.doDraw();
  }

  // animate the move
  // will cut the animation into moveTotalSteps steps
  animate() {
    // console.log('TrainGui#animate');
    this.animating = true;
    this.currentDrawStep += 1;
    this.doDraw();
    const self = this;
    if(this.currentDrawStep < this.moveTotalSteps) {
      Meteor.setTimeout(function() {
        self.animate();
      }, this.animateWait);
    }
    else {
      this.currentDrawStep = this.moveTotalSteps;
      this.doDraw();
      this.animating = false;
    }
  }

  doDraw() {
    // console.log('TrainGui#doDraw', this._id);
    // console.log(this.from, this.pos);
    let size = this.map.dispo.zoom * this.dispo.trainSize;
    // if(size < 5) size = 5;
    // the pos is the destination
    // we calculate the relative position with a vector
    const progress = this.currentDrawStep / this.moveTotalSteps;
    let v = new Vector(this.from, this.pos);
    const projection = v.origin().plus((v.scal(progress))).norm();
    // this.map.drawSection(projection);
    const rpos = this.map.relToRealCoords(projection);

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
