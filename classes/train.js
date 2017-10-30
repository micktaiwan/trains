/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";

let caseEqual = function(a, b) {
  return a.x === b.x && a.y === b.y;
};

let caseCopy = function(to, from) {
  to.x = from.x;
  to.y = from.y;
};

export class Train {
  constructor(map, doc, id) {
    //console.log('new train', id, doc, map);
    this.game_id = doc.game_id;
    this.map = map;
    this._id = id;
    this.pos = doc.pos || {x: 1, y: 1};
    this.dir = doc.dir || {x: 1, y: 0};
    this.from = {x: -1, y: -1};
  }

  getDBObj() {
    return {
      game_id: this.game_id,
      pos: this.pos,
      dir: this.dir
    }
  }

  reset() {
    this.pos.x = this.pos.y = 1;
  }

  move() {
    for(let i = 1; i <= 4; i++) {
      if(this.dirMove()) return;
      this.changeDir();
    }
  }

  // move in the current direction
  dirMove() {
    let tmp = {x: this.pos.x, y: this.pos.y};
    tmp.x += this.dir.x;
    tmp.y += this.dir.y;
    //console.log('tmp', tmp);
    if(!caseEqual(this.from, tmp) && this.map.getTile(tmp)) {
      caseCopy(this.from, this.pos);
      caseCopy(this.pos, tmp);
      //console.log('after move', this.pos);
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
    //console.log('after dir', this.dir);
  }

  updateFromDB(doc) {
    if(doc.pos) {
      caseCopy(this.from, this.pos);
      this.pos = doc.pos;
    }
    if(doc.dir) this.dir = doc.dir;
  }

}
