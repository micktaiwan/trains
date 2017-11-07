/**
 * Created by mfaivremacon on 01/09/2015.
 */

import {Train} from './train';
import {Drawing} from "./helpers";

export class TrainGui extends Train {

  constructor(map, doc, id, displayOptions) {
    super(map, doc, id);
    this.ctx = map.ctx;
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      margin: displayOptions.margin || 0.15 // %
    };
    this.currentDrawStep = this.moveTotalSteps = 20; // default values that are calculated later
    this.animateWait = 100; // constant: draw every animateWait ms
    this.animating = false;
  }

  draw() {
    this.moveTotalSteps = this.moveInterval / this.animateWait;
    // console.log(''TrainGui#draw'', this.moveInterval, this.moveTotalSteps, this.animateWait);
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
    console.log('TrainGui#doDraw', this._id);
    // the pos is the destination
    const z = this.map.displayOptions.zoom;
    this.ctx.fillStyle = "#f00";
    const rpos = this.map.relToRealCoords(this.pos);
    Drawing.drawPoint(this.ctx, rpos, z * this.map.displayOptions.stationSize);
  }

}
