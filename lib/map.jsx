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
  constructor() {
    this.tiles = [];
    this.trains = [];
    this.stations = [];
    this.currentTileSelection = 'Rails';
    this.message = new ReactiveVar('');
  }

  init(dbid) {
    this._id = dbid;
  }

  setTileSelection(tileName) {
    this.currentTileSelection = tileName;
  }

  resetMap() {
    this.tiles.length = 0;
    this.trains.length = 0;
    Meteor.call('mapReset', this._id);
  }

  updateTrain(id, doc) {
    //console.log('updateTrain', doc);
    let train = this.getTrainById(id);
    if(train)
      train.updateFromDB(doc);
    else console.error('no train?');
    this.drawTrain(train);
  }

  draw() {
    console.error('method should be overridded');
  }

  drawTrain(train) {
    console.error('method should be overridded');
  }

  tileCount() {
    return this.tiles.length;
  }

  removeTile(id) {
    //tiles
    for(let i = 0; i < this.tiles.length; i++) {
      if(this.tiles[i]._id === id) {
        this.tiles.splice(i, 1);
        break;
      }
    }

    // stations
    for(let i = 0; i < this.stations.length; i++) {
      if(this.stations[i]._id === id) {
        this.stations.splice(i, 1);
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

  setMessage(msg) {
    this.message.set(msg);
  }

  saveTileToDB(pos) {
    if(this.getTile(pos)) return false;

    let type;
    if(this.currentTileSelection === 'Rails') {
      let rail = this.affectNeighbors(pos, 'add');
      if(rail === 0) {
        this.setMessage("<strong>You must place a rail near a station or another rail<strong>");
        return;
      }
      this.setMessage("");
      type = {name: 'rail', rails: rail};
    }
    else if(this.currentTileSelection === 'Station') {
      type = {name: 'station', station: {team: 'red'}};
      this.setMessage("");
    }
    else throw new Meteor.Error('unknown tile selection ' + this.currentTileSelection);

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

  setTileWithId(tile) {
    //console.log(tile);
    this.tiles.push(tile);
    if(tile.type.name === 'station')
      this.stations.push(tile);
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
