/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";
Meteor.startup(function() {

  class TrainGui extends Train {
    constructor(map, pos, id, displayOptions) {
      super(map, pos, id);
      this.ctx = map.ctx;
      displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
      this.displayOptions = {
        margin: displayOptions.margin || 0
      };
      //this.img = new Image();
      //this.img.src = "/img/redTrain.svg";
    }

    draw() {
      this.ctx.fillStyle = "#fff";
      let w = this.map.displayOptions.tileWidth;
      this.ctx.fillRect(this.pos.x * w + this.displayOptions.margin, this.pos.y * w + this.displayOptions.margin, w - this.displayOptions.margin * 2, w - this.displayOptions.margin * 2);


      let half = 0.5;
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
      /*this.ctx.beginPath();*/
      path.moveTo(p1.x, p1.y);
      path.lineTo(tip.x, tip.y);
      path.lineTo(p2.x, p2.y);
      this.ctx.fill(path);
      //this.ctx.drawImage(this.img, this.pos.x * w, this.pos.y * w, w, w+10);
      //this.move();
    }

  }

  window.TrainGui = TrainGui;
})
;
