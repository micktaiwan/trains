/**
 * Created by mfaivremacon on 01/09/2015.
 */

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

  // Will be redone with pathfinding
  move() {
    console.log('Train#move');
    this.pos.x++;
    this.hasMoved = true;
    this.updateDB();
  }


  toObj() {
    return {
      game_id: this.map._id,
      pos: this.pos,
      dir: this.dir
    };
  }

  saveToDB() {
    console.log('saveTrainToDB', this._id);
    Meteor.call('trainAdd', this._id, this.toObj());
  }

  updateDB() {
    console.log('Train#updateDB', this._id);
    Meteor.call('trainUpdate', this._id, this.toObj());
  }

  updateFromDB(doc) {
    console.log('Train#updateFromDB');
    if(doc.pos) {
      this.from = _.clone(this.pos);
      this.pos = doc.pos;
      this.hasMoved = true;
    }
    if(doc.dir) this.dir = doc.dir;
    if(doc.interval) this.moveInterval = doc.interval;
  }

}
