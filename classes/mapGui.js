/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {Map, Tile} from './map';
import {TrainGui} from './trainGui';

const defaultTileSize = 50;

export class TileGui extends Tile {

  constructor(map, doc, id) {
    super(map, doc, id);
    this.ctx = map.ctx;
    this.img = new Image();
  }

  setImage() {
    if(this.type.name === 'station')
      this.img.src = '/rails/' + this.map.skin + '/station.png';
    else
      this.img.src = '/rails/' + this.map.skin + '/' + this.type.rails + '.png';
    //console.log(this.img.src);
  }

  draw(options) {
    //console.log(this.type);
    options = options || {};
    if(options.withBackground) {
      let w = this.map.displayOptions.tileWidth;
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);
    }
    if(!this.type || this.type.rails !== undefined) this.drawRail();
    else if(this.type.name === 'station') this.drawStation();
    else throw new Meteor.Error('Unknown tile type ' + this.type.name);
  }

  drawRail() {
    //console.log('drawing rail');
    let w = this.map.displayOptions.tileWidth;
    if(this.map.skin === 'cube' || !this.type) {
      this.ctx.fillStyle = "#666";
      this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);
    }
    else {
      this.setImage();
      this.ctx.drawImage(this.img, this.pos.x * w, this.pos.y * w, w, w);
    }

  }

  drawStation() {
    //console.log('drawing station');
    let w = this.map.displayOptions.tileWidth;
    this.setImage();
    this.ctx.drawImage(this.img, this.pos.x * w, this.pos.y * w, w, w);
    //if(this.map.skin === 'cube' || !this.type ) {
    /*
     this.ctx.fillStyle = "#f00";
     this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);
     */
  }

}

export class MapGui extends Map {

  constructor(gameId, displayOptions) {
    super(gameId);
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      tileWidth: displayOptions.tileWidth || defaultTileSize
    };

    this.mouseIsDown = false;
    this.mouseOldPos = {x: -1, y: -1};
    this.mousePos = {x: -1, y: -1};
    this.pan = {x: 0, y: 0};
    this.skin = 'default';
  }

  static onContextMenu(e) {
    e.preventDefault();
    return false;
  }

  init(canvas_id, game_id) {
    console.log('init', game_id);
    super.init(game_id);
    this.game.canModifyMap(); // just to trigger reactivity and depending helpers
    this.canvas = $(canvas_id).get(0);
    this.ctx = this.canvas.getContext("2d");
    // listen to mouse
    this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
    this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
    this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
    this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
    this.canvas.addEventListener("contextmenu", $.proxy(MapGui.onContextMenu, this), false);
    //this.canvas.addEventListener("dblclick", $.proxy(this.onMouseDblClick, this), false);
    //this.canvas.addEventListener("mouseout", $.proxy(this.onMouseOut, this), false);
    this.draw();
    console.log('map initialized');
    // window.requestAnimationFrame(this.draw);
  }

  setGame(game) {
    this.game = game;
  }

  // create a new train
  createTrain() {
    if(this.trains.length === 0) { // for now only one train
      this.addTrainToDB({pos: {x: 1, y: 1}, dir: {x: 1, y: 0}}); // TODO: let the server set the position
    }
    this.draw();
  }

  // coming from db
  setTileWithId(id, doc) {
    const tile = new TileGui(this, doc, id);
    super.setTileWithId(tile);
  }

  // coming from db
  updateTileWithId(id, doc) {
    const c = this.getTileById(id);
    //console.log('setTileWithId', id, doc, 'found', c);
    if(c) { // if the client already have it
      c._id = id; // make sure the object have a DB id so we can remove it later
      c.type = doc.type;
      c.draw();
    }
    else {
      console.error('updateTileWithId: oops');
      //this.tiles.push(new TileGui(this, doc, id));
      this.draw();
    }
  }
  // coming from db
  addTrain(id, doc) {
    const pos = doc.pos;
    const c = this.getTrain(pos);
    //console.log('addTrain', id, doc, 'found', c);
    if(c) // if the client already have it
      c.id = id; // make sure the object have a DB id so we can remove it later
    else {
      this.trains.push(new TrainGui(this, doc, id));
    }
  }

  updateTrain(id, doc) {
    //console.log('updateTrain', doc);
    let train = this.getTrainById(id);
    if(!train) return console.error('updateTrain: no train');
    train.updateFromDB(doc);
    train.draw();
  }

  setTileFromEvent(event) {
    if(!this.game.canModifyMap()) return;
    this.saveTileToDB(this.getMouseTileCoords(this.mouseCoords(event)));
  }

  removeTileFromEvent(event) {
    if(!this.game.canModifyMap()) return;
    const pos = this.getMouseTileCoords(this.mouseCoords(event));
    const tile = this.getTile(pos);
    if(tile) {
      // console.log('removing', tile);
      this.removeTileFromDb(tile._id);
    }
  }

  resetMap() {
    super.resetMap();
    this.resetPosition();
  }

  resetPosition() {
    this.displayOptions.tileWidth = 50;
    this.pan = {x: 0, y: 0};
    this.draw();
  }

  dotranslate() {
    this.ctx.translate(this.pan.x, this.pan.y);
  }

  untranslate() {
    this.ctx.translate(-this.pan.x, -this.pan.y);
  }

  draw() {
    if(!this.ctx) return;
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.dotranslate();
    for(let i = 0; i < this.tiles.length; i++)
      this.tiles[i].draw();
    this.untranslate();

    for(let i = 0; i < this.trains.length; i++)
      this.trains[i].draw();

    this.drawMapBorder();
    // window.requestAnimationFrame(this.draw);
  }

  drawSection(posArray) {
    if(!this.ctx) return;
    const self = this;
    posArray.forEach(function(pos) {
      const t = self.getTile(pos);
      if(t) t.draw({withBackground: true});
    });
  }

  drawMouse(event) {
    if(!this.game.canModifyMap()) return;
    const c = this.getMouseTileCoords(this.mouseCoords(event), true);
    //this.ctx.fillStyle = 'white';
    //this.ctx.fillText(c.x + ' ' + c.y, 20, 20);
    this.drawMouseTile(c);
  }

  // we have been notified that another client removed this tile
  removeTile(id) {
    // console.log('removing tile', id, '...');
    super.removeTile(id);
    this.draw();
  }

  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const factor = Math.round((this.displayOptions.tileWidth / (e.wheelDelta / 30)));
    this.displayOptions.tileWidth += factor;
    if(this.displayOptions.tileWidth < 1)
      this.displayOptions.tileWidth = 1;
    if(this.displayOptions.tileWidth > 200)
      this.displayOptions.tileWidth = 200;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.pan.x += (newPos.x - oldPos.x) / (defaultTileSize / this.displayOptions.tileWidth);
    this.pan.y += (newPos.y - oldPos.y) / (defaultTileSize / this.displayOptions.tileWidth);

    this.draw();
    this.drawMouse(e);
  }

  onMouseMove(e) {
    this.mouseOldPos = this.mousePos;
    this.mousePos = this.mouseCoords(e);
    this.mouseMovement = {x: this.mousePos.x - this.mouseOldPos.x, y: this.mousePos.y - this.mouseOldPos.y};
    if(this.mouseIsDown) {
      if(e.ctrlKey) { // pan map
        this.pan.x += this.mouseMovement.x;
        this.pan.y += this.mouseMovement.y;
      }
      else { // edit map
        if(this.button === 1)
          this.setTileFromEvent(e);
        else if(this.button === 2) { // middle button = pan
          this.pan.x += this.mouseMovement.x;
          this.pan.y += this.mouseMovement.y;
        }
        else if(this.button === 3)
          this.removeTileFromEvent(e);
      }
    }
    this.draw();
    if(!e.ctrlKey) this.drawMouse(e);
  }

  onMouseDown(e) {
    e.preventDefault();
    if(!e.ctrlKey) {
      switch(e.which) {
        case 1: // left button
          this.setTileFromEvent(e);
          break;
        case 3: // right button
          this.removeTileFromEvent(e);
          break;
      }
    }
    this.button = e.which;
    this.draw();
    this.drawMouse(e);
    this.mouseIsDown = true;
    document.body.style.cursor = 'none';
  }

  onMouseUp(event) {
    this.mouseIsDown = false;
    document.body.style.cursor = 'default';
  }

  drawMapBorder() {
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#999';
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.stroke();
  }

  drawMouseTile(c) {
    let margin = 0;

    // set transparency
    this.ctx.globalAlpha = 0.5;
    //console.log('currentTileSelection', this.currentTileSelection);
    if(this.currentTileSelection === 'Rails') {
      this.ctx.fillStyle = '#333';
    }
    else if(this.currentTileSelection === 'Station') {
      this.ctx.fillStyle = '#500';
    }
    this.ctx.fillRect(c.x * this.displayOptions.tileWidth + margin + (this.pan.x % this.displayOptions.tileWidth), c.y * this.displayOptions.tileWidth + margin + (this.pan.y % this.displayOptions.tileWidth), this.displayOptions.tileWidth - margin * 2, this.displayOptions.tileWidth - margin * 2);
    // set back transparency
    this.ctx.globalAlpha = 1;

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#300';
    this.ctx.beginPath();
    this.ctx.rect(c.x * this.displayOptions.tileWidth + margin + (this.pan.x % this.displayOptions.tileWidth), c.y * this.displayOptions.tileWidth + margin + (this.pan.y % this.displayOptions.tileWidth), this.displayOptions.tileWidth - margin * 2, this.displayOptions.tileWidth - margin * 2);
    this.ctx.stroke();
  }

  getMouseTileCoords(coords, ignorePan) {
    if(ignorePan) {
      return {
        x: Math.floor((coords.x - (this.pan.x % this.displayOptions.tileWidth)) / this.displayOptions.tileWidth),
        y: Math.floor((coords.y - (this.pan.y % this.displayOptions.tileWidth)) / this.displayOptions.tileWidth)
      };

    }
    return {
      x: Math.floor((coords.x - this.pan.x) / this.displayOptions.tileWidth),
      y: Math.floor((coords.y - this.pan.y) / this.displayOptions.tileWidth)
    };
  }

  // mouse coords relative to a tile size and panning
  relMouseCoords(e) {
    let c = this.mouseCoords(e);
    let factor = defaultTileSize / this.displayOptions.tileWidth;
    c.x = (c.x * factor) - (this.pan.x * factor);
    c.y = (c.y * factor) - (this.pan.y * factor);
    return c;
  }

  // real mouse coords
  mouseCoords(e) {
    let cx, cy;
    if(e.pageX || e.pageY) {
      cx = e.pageX;
      cy = e.pageY;
    }
    else {
      cx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      cy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    cx -= e.target.offsetLeft;
    cy -= e.target.offsetTop;

    return {x: cx, y: cy}
  }

  selectSkin(skin) {
    this.skin = skin;
  }

}
