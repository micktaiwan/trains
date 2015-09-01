/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";

let caseEqual = function(a, b) {
  return a.x === b.x && a.y === b.y;
};

let caseCopy = function(a, b) {
  a.x = b.x;
  a.y = b.y;
};

class Train {
  constructor(map, displayOptions) {
    this.map = map;
    this.ctx = map.ctx;
    this.pos = {x: 1, y: 1};
    this.dir = {x: 1, y: 0};
    this.from = {x: -1, y: -1};

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

  move() {
    for(let i = 1; i <= 4; i++) {
      if(this.dirMove()) return;
      this.changeDir();
    }
  }

  dirMove() {
    let tmp = {x: this.pos.x, y: this.pos.y};
    tmp.x += this.dir.x;
    tmp.y += this.dir.y;
    if(!caseEqual(this.from, tmp) && this.map.getCase(tmp)) {
      console.log(this.from, tmp);
      caseCopy(this.from, this.pos);
      caseCopy(this.pos, tmp);
      return true;
    }
    return false;
  }

  changeDir() {
    let arr = [-1, 1];
    let r = Math.floor(Math.random() * 2);
    let rand = arr[r];
    if(this.dir.x !== 0) {
      this.dir.x = 0;
      this.dir.y = rand;
    }
    else if(this.dir.y !== 0) {
      this.dir.x = rand;
      this.dir.y = 0;
    }
  }

}

window.Train = Train;
