/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

class Tile {

  constructor(map, pos) {
    this.map = map;
    this.pos = pos;
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
  }

/*
  setCase(pos) {
    this.tiles.push(new Tile(this, pos));
  }
*/

  getCase(coords) {
    for(let i = 0; i < this.tiles.length; i++) {
      if(this.tiles[i].pos.x === coords.x && this.tiles[i].pos.y === coords.y) return this.tiles[i];
    }
    return null;
  }

}

if(Meteor.isClient) {
  window.Tile = Tile;
  window.Map = Map;
}
