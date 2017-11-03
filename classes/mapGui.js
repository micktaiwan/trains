/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {Map, Point} from './map';
import {TrainGui} from './trainGui';

const defaultPointSize = 50;

export class PointGui extends Point {

  constructor(map, doc, id) {
    super(map, doc, id);
    this.ctx = map.ctx;
  }

  draw(options) {
    // console.log(this);
    options = options || {};
    if(options.withBackground) {
      let w = this.map.displayOptions.pointWidth;
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);
    }
    if(this.type.name === 'rail') this.drawRail();
    else if(this.type.name === 'station') this.drawStation();
    else throw new Meteor.Error('Unknown point type ' + this.type.name);
  }

  drawRail() {
    //console.log('drawing rail');
    const w = this.map.displayOptions.pointWidth;
    this.ctx.fillStyle = "#666";
    this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);
  }

  drawStation() {
    // console.log('drawing station');
    const w = this.map.displayOptions.pointWidth;
    this.ctx.fillStyle = "#f00";
    this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);
  }

}

export class MapGui extends Map {

  constructor(gameId, displayOptions) {
    super(gameId);
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      pointWidth: displayOptions.pointWidth || defaultPointSize
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
      this.addTrainToDB({pos: {x: 1, y: 1}, dir: {x: 1, y: 0}}); // FIXME P1: let the server set the position
    }
    this.draw();
  }

  // coming from db
  setPointWithId(id, doc) {
    const point = new PointGui(this, doc, id);
    super.setPointWithId(point);
  }

  // coming from db
  updatePointWithId(id, doc) {
    const c = this.getPointById(id);
    //console.log('setPointWithId', id, doc, 'found', c);
    if(c) { // if the client already have it
      c._id = id; // make sure the object have a DB id so we can remove it later
      c.type = doc.type;
      c.draw();
    }
    else {
      console.error('updatePointWithId: oops');
      //this.points.push(new PointGui(this, doc, id));
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

  setPointFromEvent(event) {
    if(!this.game.canModifyMap()) return;
    this.savePointToDB(this.getMousePointCoords(this.mouseCoords(event)));
  }

  removePointFromEvent(event) {
    if(!this.game.canModifyMap()) return;
    const pos = this.getMousePointCoords(this.mouseCoords(event));
    const point = this.getPoint(pos);
    if(point) {
      // console.log('removing', point);
      this.removePointFromDb(point._id);
    }
  }

  resetMap() {
    super.resetMap();
    this.resetPosition();
  }

  resetPosition() {
    this.displayOptions.pointWidth = 50;
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
    for(let i = 0; i < this.points.length; i++)
      this.points[i].draw();
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
      const t = self.getPoint(pos);
      if(t) t.draw({withBackground: true});
    });
  }

  drawMouse(event) {
    if(!this.game.canModifyMap()) return;
    const c = this.getMousePointCoords(this.mouseCoords(event), true);
    //this.ctx.fillStyle = 'white';
    //this.ctx.fillText(c.x + ' ' + c.y, 20, 20);
    this.drawMousePoint(c);
  }

  // we have been notified that another client removed this point
  removePoint(id) {
    // console.log('removing point', id, '...');
    super.removePoint(id);
    this.draw();
  }

  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const factor = Math.round((this.displayOptions.pointWidth / (e.wheelDelta / 30)));
    this.displayOptions.pointWidth += factor;
    if(this.displayOptions.pointWidth < 1)
      this.displayOptions.pointWidth = 1;
    if(this.displayOptions.pointWidth > 200)
      this.displayOptions.pointWidth = 200;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.pan.x += (newPos.x - oldPos.x) / (defaultPointSize / this.displayOptions.pointWidth);
    this.pan.y += (newPos.y - oldPos.y) / (defaultPointSize / this.displayOptions.pointWidth);

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
          this.setPointFromEvent(e);
        else if(this.button === 2) { // middle button = pan
          this.pan.x += this.mouseMovement.x;
          this.pan.y += this.mouseMovement.y;
        }
        else if(this.button === 3)
          this.removePointFromEvent(e);
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
          this.setPointFromEvent(e);
          break;
        case 3: // right button
          this.removePointFromEvent(e);
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

  drawMousePoint(c) {
    let margin = 0;

    // set transparency
    this.ctx.globalAlpha = 0.5;
    //console.log('currentPointSelection', this.currentPointSelection);
    if(this.currentPointSelection === 'Rails') {
      this.ctx.fillStyle = '#333';
    }
    else if(this.currentPointSelection === 'Station') {
      this.ctx.fillStyle = '#500';
    }
    this.ctx.fillRect(c.x * this.displayOptions.pointWidth + margin + (this.pan.x % this.displayOptions.pointWidth), c.y * this.displayOptions.pointWidth + margin + (this.pan.y % this.displayOptions.pointWidth), this.displayOptions.pointWidth - margin * 2, this.displayOptions.pointWidth - margin * 2);
    // set back transparency
    this.ctx.globalAlpha = 1;

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#300';
    this.ctx.beginPath();
    this.ctx.rect(c.x * this.displayOptions.pointWidth + margin + (this.pan.x % this.displayOptions.pointWidth), c.y * this.displayOptions.pointWidth + margin + (this.pan.y % this.displayOptions.pointWidth), this.displayOptions.pointWidth - margin * 2, this.displayOptions.pointWidth - margin * 2);
    this.ctx.stroke();
  }

  getMousePointCoords(coords, ignorePan) {
    if(ignorePan) {
      return {
        x: Math.floor((coords.x - (this.pan.x % this.displayOptions.pointWidth)) / this.displayOptions.pointWidth),
        y: Math.floor((coords.y - (this.pan.y % this.displayOptions.pointWidth)) / this.displayOptions.pointWidth)
      };

    }
    return {
      x: Math.floor((coords.x - this.pan.x) / this.displayOptions.pointWidth),
      y: Math.floor((coords.y - this.pan.y) / this.displayOptions.pointWidth)
    };
  }

  // mouse coords relative to a point size and panning
  relMouseCoords(e) {
    let c = this.mouseCoords(e);
    let factor = defaultPointSize / this.displayOptions.pointWidth;
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
