/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

class Tile {

  constructor(map, pos, id) {
    this.map = map;
    this.pos = pos;
    this.id = id;
    //console.log('created Tile', this);
    //this.img = new Image();
    //this.img.src = "http://static.dotjobs.io.s3.amazonaws.com/www/img/perks/cross.svg";
  }

}

class Map {
  constructor(dbid) {
    this.tiles = [];
    this.trains = [];
    this._id = dbid;
  }

  resetMap() {
    this.tiles.length = 0;
    this.trains.length = 0;
    Meteor.call('mapReset', this._id);
  }

  updateTrain(doc) {
    let train = this.getTrainById(doc._id);
    if(!train) this.trains.push(new TrainGui(this, doc.pos, doc._id));
    else train.pos = doc.pos;
    this.draw();
  }

  draw() {
    console.error('method should be overridded');
  }

  tileCount() {
    return this.tiles.length;
  }

  removeTile(id) {
    for(let i = 0; i < this.tiles.length; i++) {
      if(this.tiles[i].id === id) {
        this.tiles.splice(i, 1);
        break;
      }
    }
  }

  removeTrain(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i].id === id) {
        this.trains.splice(i, 1);
        break;
      }
    }
  }

  saveTileToDB(pos) {
    console.log('saveTileToDB session', this._id);
    if(this.getTile(pos)) return false;
    Meteor.call('mapSet', pos, this._id);
    return true;
  }

  addTrainToDB(train) {
    console.log('addTrainToDB session', this._id);
    Meteor.call('trainAdd', this._id, train.pos, train.dir);
    return true;
  }


  removeTileFromDb(id) {
    //if(!this.getCase(pos)) return false;
    Meteor.call('mapRemove', id);
    return true;
  }

  getTile(pos) {
    for(let i = 0; i < this.tiles.length; i++) {
      //console.log(this.tiles[i].pos);
      if(this.tiles[i].pos.x === pos.x && this.tiles[i].pos.y === pos.y) return this.tiles[i];
    }
    return null;
  }

  getTrain(pos) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i].pos.x === pos.x && this.trains[i].pos.y === pos.y) return this.trains[i];
    }
    return null;
  }

  getTrainById(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i]._id === id) return this.trains[i];
    }
    return null;
  }

}

if(Meteor

    .
    isClient
) {
  window
    .
    Tile = Tile;
  window
    .
    Map = Map;
}
TrainsApp.Tile = Tile;
TrainsApp.Map = Map;
