/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

class Tile {

  constructor(map, pos, id) {
    this.map = map;
    this.pos = pos;
    this.id = id;
    console.log('created Tile', id);
    //this.img = new Image();
    //this.img.src = "http://static.dotjobs.io.s3.amazonaws.com/www/img/perks/cross.svg";
  }

}

class Map {
  constructor() {
    this.tiles = [];
  }

  resetMap() {
    this.tiles.length = 0;
    this.train = null;
    Meteor.call('mapReset');
  }

  setCase(pos) {
    if(this.getCase(pos)) return false;
    Meteor.call('mapSet', pos);
    return true;
  }

  removeCase(pos) {
    if(!this.getCase(pos)) return false;
    Meteor.call('mapRemove', pos);
    return true;
  }

  getCase(pos) {
    for(let i = 0; i < this.tiles.length; i++) {
      if(this.tiles[i].pos.x === pos.x && this.tiles[i].pos.y === pos.y) return this.tiles[i];
    }
    return null;
  }

}

if(Meteor.isClient) {
  window.Tile = Tile;
  window.Map = Map;
}
