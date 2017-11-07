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
    this.moveInterval = doc.moveInterval; // will tell the gui when the next move will be done
    this.hasMoved = false;
  }

  reset() {
    this.pos.x = this.pos.y = 1;
  }

  // Will be redone with pathfinding
  move() {
    console.log('Train#move', this.pos);
    const links = this.map.getLinks(this.pos, 5);
    console.log('Links:', links.length);
    if(links.length === 0) {
      this.pos.x = _.random(20, 200);
      this.pos.y = _.random(20, 100);
    }
    else {
      let link = links[_.random(links.length - 1)];
      let dest = link.stations[1].pos;
      if(_.isEqual(this.pos, dest)) dest = link.stations[0].pos;
      this.pos = _.clone(dest);
    }
    console.log(this.pos);
    this.hasMoved = true;
    this.updateDB();
  }

  toObj() {
    return {
      game_id: this.map._id,
      pos: this.pos,
      moveInterval: this.moveInterval
      // dir: this.dir
    };
  }

  saveToDB() {
    console.log('saveTrainToDB', this._id);
    Meteor.call('trainAdd', this._id, this.toObj());
  }

  updateDB() {
    // console.log('Train#updateDB', this._id);
    Meteor.call('trainUpdate', this._id, this.toObj());
  }

  updateFromDB(doc) {
    // console.log('Train#updateFromDB');
    if(doc.pos) {
      this.from = _.clone(this.pos);
      if(doc.pos) this.pos = doc.pos;
      this.hasMoved = true;
      if(doc.moveInterval) this.moveInterval = doc.moveInterval
    }
    if(doc.dir) this.dir = doc.dir;
    if(doc.interval) this.moveInterval = doc.interval;
  }

}
