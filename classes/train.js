/**
 * Created by mfaivremacon on 01/09/2015.
 */
import {Helpers} from './helpers';

export class Train {

  constructor(map, doc, id) {
    //console.log('new train', id, doc, map);
    this.game_id = doc.game_id;
    this.map = map;
    this._id = id;
    this.pos = doc.pos || {x: 1, y: 1};
    this.dir = doc.dir || {x: 1, y: 0};
    this.from = {x: -1, y: -1};
    this.moveInterval = doc.interval; // will tell the gui when te next move will be done
    this.hasMoved = false;
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
    // const backup = {x: this.dir.x, y: this.dir.y};
    for(let i = 0; i < 10; i++) { // FIXME P1: just because changeDir could return a bad dir
      if(this.dirMove()) {
        this.hasMoved = true;
        return true;
      }
      // caseCopy(this.dir, backup);
      this.changeDir(); // FIXME P3: could choose a dir that is not valid
    }
    this.hasMoved = false;
    return false;
  }

  // move in the current direction
  dirMove() {
    const dest = this.getDest(this.pos);
    if(Helpers.caseEqual(this.from, dest) || !this.map.getPoint(dest)) return false;
    Helpers.caseCopy(this.from, this.pos);
    Helpers.caseCopy(this.pos, dest);
    return true;
  }

  // return pos + dir case
  getDest(pos) {
    return {x: pos.x + this.dir.x, y: pos.y + this.dir.y};
  }

  changeDir() {
    const arr = [-1, 1];
    const r = Math.floor(Math.random() * 2);
    const rand = arr[r];
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
      Helpers.caseCopy(this.from, this.pos);
      this.pos = doc.pos;
      this.hasMoved = true;
    }
    if(doc.dir) this.dir = doc.dir;
    if(doc.interval) this.moveInterval = doc.interval;
  }

}
