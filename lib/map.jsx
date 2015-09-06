/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

let W = 1, S = 2, E = 4, N = 8; // any rail directions is the sum of simple directions, SWE = 2 + 1 + 4 = 7


class Tile {

  constructor(map, doc, id) {
    this.map = map;
    this.pos = {x: doc.x, y: doc.y};
    this.id = id;
    this.type = {rails: W+E};
    //console.log('created Tile', this);
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

  updateTrain(id, doc) {
    //console.log('updateTrain', doc);
    let train = this.getTrainById(id);
    if(train) {
      if(doc.pos) train.pos = doc.pos;
      if(doc.dir) train.dir = doc.dir;
    }
    else console.error('no train?');
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
      //console.log('loop', this.tiles[i]);
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
