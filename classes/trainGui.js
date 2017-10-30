/**
 * Created by mfaivremacon on 01/09/2015.
 */

import {Train} from './train';

export class TrainGui extends Train {

  constructor(map, doc, id, displayOptions) {
    super(map, doc, id);
    this.ctx = map.ctx;
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      margin: displayOptions.margin || 0.15 // %
    };
    //this.img = new Image();
    this.moveProgression = 0; // % between from case to to case
    this.moveSpeed = 0; // % steps
    this.moveAcc = 10;
    this.currentDrawStep = 0;
    this.moveTotalSteps = 10;
    this.currentDrawStep = 0;
    this.animateWait = 100;
    this.animating = false;
  }

  /*
   setImage() {
   this.img.src = '/rails/' + this.map.skin + '/train.png';
   //console.log(this.img.src);
   }
   */

  doDraw() {
    // console.log('draw', this.currentDrawStep);
    // the pos is the destination
    this.map.drawSection([this.pos, this.from]);
    // this.map.draw();
    this.ctx.fillStyle = "#aaf";
    let w = this.map.displayOptions.tileWidth;
    const margin = w * this.displayOptions.margin;

    let x, y;

    x = this.pos.x * w + margin;
    if(this.dir.x === 1)
      x = this.pos.x * w - (this.moveTotalSteps - this.currentDrawStep) * w / this.moveTotalSteps + margin;
    else if(this.dir.x === -1)
      x = (this.pos.x + 1) * w - (this.currentDrawStep) * w / this.moveTotalSteps + margin;

    y = this.pos.y * w + margin;
    if(this.dir.y === 1)
      y = this.pos.y * w - (this.moveTotalSteps - this.currentDrawStep) * w / this.moveTotalSteps + margin;
    else if(this.dir.y === -1)
      y = (this.pos.y + 1) * w - (this.currentDrawStep) * w / this.moveTotalSteps + margin;

    this.ctx.fillRect(x, y, w - margin * 2, w - margin * 2);
  }

  animate() {
    this.animating = true;
    // console.log('animate', this.currentDrawStep, this.animateWait);
    this.doDraw();
    const self = this;
    this.currentDrawStep += 1;
    if(this.currentDrawStep < this.moveTotalSteps) {
      Meteor.setTimeout(function() {
        self.animate();
      }, this.animateWait);
    }
    else {
      this.currentDrawStep = 0;
      this.animating = false;
    }
  }

  // animate the move
  // will cut the animation into this.moveInterval / this.moveTotalSteps steps
  draw() {
    // this.moveTotalSteps = 10;
    this.animateWait = this.moveInterval / this.moveTotalSteps;
    console.log(this.moveInterval, this.moveTotalSteps, this.animateWait);
    if(!this.animating) this.animate();
    else this.doDraw();
  }

}
