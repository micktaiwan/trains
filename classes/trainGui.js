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
  }

  /*
   setImage() {
   this.img.src = '/rails/' + this.map.skin + '/train.png';
   //console.log(this.img.src);
   }
   */

  // animate the move
  // will cut the animation into this.moveProgress steps
  draw() {
    // the pos is the destination
    this.ctx.fillStyle = "#aaf";
    let w = this.map.displayOptions.tileWidth;
    const margin = w * this.displayOptions.margin;
    this.ctx.fillRect(this.pos.x * w + margin, this.pos.y * w + margin, w - margin * 2, w - margin * 2);

    /*      let half = 0.5;
          let center = {x: this.pos.x + half, y: this.pos.y + half};
          let tip = {x: (center.x + this.dir.x * 0.7) * w, y: (center.y + this.dir.y * 0.7 ) * w};

          let p1, p2;
          if(this.dir.x == 1) {
            p1 = {x: (this.pos.x + 1) * w, y: this.pos.y * w};
            p2 = {x: (this.pos.x + 1) * w, y: (this.pos.y + 1) * w}
          }
          else if(this.dir.x == -1) {
            p1 = {x: (this.pos.x) * w, y: this.pos.y * w};
            p2 = {x: (this.pos.x) * w, y: (this.pos.y + 1) * w}
          }
          else if(this.dir.y == 1) {
            p1 = {x: (this.pos.x) * w, y: (this.pos.y + 1) * w};
            p2 = {x: (this.pos.x + 1) * w, y: (this.pos.y + 1) * w}
          }
          else if(this.dir.y == -1) {
            p1 = {x: (this.pos.x) * w, y: this.pos.y * w};
            p2 = {x: (this.pos.x + 1) * w, y: (this.pos.y) * w}
          }

          var path = new Path2D();
          /!*this.ctx.beginPath();*!/
          path.moveTo(p1.x, p1.y);
          path.lineTo(tip.x, tip.y);
          path.lineTo(p2.x, p2.y);
          this.ctx.fill(path);
          */

    //this.ctx.drawImage(this.img, this.pos.x * w, this.pos.y * w, w, w+10);
    //this.move();
  }

}
