/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

let N = 1, E = 2, S = 4, W = 8; // any rail directions is the sum of simple directions


class Tile {

  constructor(map, doc, id) {
    this.map = map;
    this.pos = {x: doc.x, y: doc.y};
    this._id = id;
    this.type = doc.type;
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
      if(this.tiles[i]._id === id) {
        this.tiles.splice(i, 1);
        break;
      }
    }
  }

  removeTrain(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i]._id === id) {
        this.trains.splice(i, 1);
        break;
      }
    }
  }

  affectNeighbor(rail, pos, dir, operation) {

    let newPos, oppDir;
    switch(dir) {
      case N:
        newPos = {x: pos.x, y: pos.y - 1};
        oppDir = S;
        break;
      case S:
        newPos = {x: pos.x, y: pos.y + 1};
        oppDir = N;
        break;
      case W:
        newPos = {x: pos.x - 1, y: pos.y};
        oppDir = E;
        break;
      case E:
        newPos = {x: pos.x + 1, y: pos.y};
        oppDir = W;
        break;
    }

    let tile = this.getTile(newPos);
    if(tile) {
      rail += dir;
      if(!tile.type) tile.type = {rails: 0}; // just to migrate old maps, TODO: migrate all rails once for all at map loading
      if(operation === 'add')
        tile.type.rails |= oppDir;
      if(operation === 'sub')
        tile.type.rails ^= oppDir;
      Meteor.call('mapUpdate', tile._id, tile.pos, tile.type, this._id); // Can't call wih simply tile as I have a error
    }
    return rail;
  }


  affectNeighbors(pos, operation) {
    let rail = 0;
    rail = this.affectNeighbor(rail, pos, N, operation);
    rail = this.affectNeighbor(rail, pos, E, operation);
    rail = this.affectNeighbor(rail, pos, S, operation);
    rail = this.affectNeighbor(rail, pos, W, operation);
    return rail;
  }

  saveTileToDB(pos) {
    if(this.getTile(pos)) return false;
    let rail = this.affectNeighbors(pos, 'add');
    let type = {rails: rail};
    Meteor.call('mapSet', pos, type, this._id);
    return true;
  }

  addTrainToDB(train) {
    console.log('addTrainToDB session', this._id);
    Meteor.call('trainAdd', this._id, train.pos, train.dir);
    return true;
  }

  removeTileFromDb(id) {
    let pos = this.getTileById(id).pos;
    this.removeTile(id);
    this.affectNeighbors(pos, 'sub');
    Meteor.call('mapRemove', id);
    return true;
  }

  getTile(pos) {
    for(let i = 0; i < this.tiles.length; i++) {
      //console.log('loop', this.tiles[i].type);
      if(this.tiles[i].pos.x === pos.x && this.tiles[i].pos.y === pos.y) return this.tiles[i];
    }
    return null;
  }

  getTileById(id) {
    for(let i = 0; i < this.tiles.length; i++) {
      if(this.tiles[i]._id === id) return this.tiles[i];
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

if(Meteor.isClient) {
  window.Tile = Tile;
  window.Map = Map;
}
TrainsApp.Tile = Tile;
TrainsApp.Map = Map;
