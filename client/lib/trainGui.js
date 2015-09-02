/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";

Meteor.startup(function() {

  class TrainGui extends Train {
    constructor(map, displayOptions) {
      super(map);
      this.ctx = map.ctx;
      displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
      this.displayOptions = {
        margin: displayOptions.margin || 4
      };

    }

    draw() {
      this.ctx.fillStyle = "#fff";
      let w = this.map.displayOptions.caseWidth;
      this.ctx.fillRect(this.pos.x * w + this.displayOptions.margin, this.pos.y * w + this.displayOptions.margin, w - this.displayOptions.margin * 2, w - this.displayOptions.margin * 2);
      this.move();
    }


  }

  window.TrainGui = TrainGui;
});

