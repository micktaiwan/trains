/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {Map, Point, Segment} from './map';
import {TrainGui} from './trainGui';
import {Helpers} from "./helpers";

const defaultSegmentSize = 50;

export class SegmentGui extends Segment {

  constructor(map, doc, id) {
    super(map, doc, id);
    this.ctx = map.ctx;
  }

  drawSegment(x, y, size) {
  }

  draw(options) {
    // console.log(this);
    options = options || {};
    if(options.withBackground) {
      let w = this.map.displayOptions.segmentWidth;
      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(this.pos.x, this.pos.y, w, w);
    }
    const w = this.map.displayOptions.segmentWidth;
    this.ctx.fillStyle = "#666";
    const self = this;
    _.each(this.points, function(p) {
      Helpers.drawPoint(self.ctx, p.pos.x, p.pos.y, w);
    });
  }
}

export class MapGui extends Map {

  constructor(gameId, displayOptions) {
    super(gameId);
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      segmentWidth: displayOptions.segmentWidth || defaultSegmentSize
    };

    this.mouseIsDown = false;
    this.mouseOldPos = {x: -1, y: -1};
    this.mousePos = {x: -1, y: -1};
    this.pan = {x: 0, y: 0};
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
  setSegmentWithId(id, doc) {
    const segment = new SegmentGui(this, doc, id);
    super.setSegmentWithId(segment);
  }

  // coming from db
  updateSegmentWithId(id, doc) {
    const c = this.getSegmentById(id);
    //console.log('setSegmentWithId', id, doc, 'found', c);
    if(c) { // if the client already have it
      c._id = id; // make sure the object have a DB id so we can remove it later
      c.type = doc.type;
      c.draw();
    }
    else {
      console.error('updateSegmentWithId: oops');
      //this.segments.push(new SegmentGui(this, doc, id));
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

  constinueSegmentFromEvent(event) {
    const c = this.relMouseCoords(e);
    const endPoint = new Point({x: c.x, y: c.y});
    endPoint.draw();
  }

  // given a mouse down, start creating a segment
  startSegmentCreationFromEvent(e) {
    if(!this.game.canModifyMap()) return;
    const c = this.relMouseCoords(e);
    const startPoint = new Point({x: c.x, y: c.y});
    const segment = new SegmentGui(this, {points: [startPoint]});
    this.saveSegmentToDB(segment);
  }

  removePointFromEvent(event) {
    if(!this.game.canModifyMap()) return;
    // const pos = this.getMouseSegmentCoords(this.mouseCoords(event));
    // const segment = this.getSegment(pos);
    // if(segment) {
    //   // console.log('removing', segment);
    //   this.removeSegmentFromDb(segment._id);
    // }
  }

  resetMap() {
    super.resetMap();
    this.resetPosition();
  }

  resetPosition() {
    this.displayOptions.segmentWidth = 50;
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
    for(let i = 0; i < this.segments.length; i++)
      this.segments[i].draw();
    this.untranslate();

    for(let i = 0; i < this.trains.length; i++)
      this.trains[i].draw();

    this.drawMapBorder();
    // window.requestAnimationFrame(this.draw);
  }

  drawMouse(event) {
    if(!this.game.canModifyMap()) return;
    const c = this.mouseCoords(event);
    this.ctx.fillStyle = 'white';
    // display coords
    this.ctx.fillText((c.x + this.pan.x) + ' ' + (c.y + this.pan.y), 20, 20);
    // display mouse
    Helpers.drawPoint(this.ctx, c.x, c.y, this.displayOptions.segmentWidth);
  }

  drawSection(posArray) {
    if(!this.ctx) return;
    const self = this;
    posArray.forEach(function(pos) {
      const t = self.getSegment(pos);
      if(t) t.draw({withBackground: true});
    });
  }

  // we have been notified that another client removed this segment
  removeSegment(id) {
    // console.log('removing segment', id, '...');
    super.removeSegment(id);
    this.draw();
  }

  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const factor = Math.round((this.displayOptions.segmentWidth / (e.wheelDelta / 30)));
    this.displayOptions.segmentWidth += factor;
    if(this.displayOptions.segmentWidth < 1)
      this.displayOptions.segmentWidth = 1;
    if(this.displayOptions.segmentWidth > 100)
      this.displayOptions.segmentWidth = 100;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.pan.x += (newPos.x - oldPos.x) / (defaultSegmentSize / this.displayOptions.segmentWidth);
    this.pan.y += (newPos.y - oldPos.y) / (defaultSegmentSize / this.displayOptions.segmentWidth);

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
          this.continueSegmentFromEvent(e);
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
    if(!e.ctrlKey) { // Ctrl is for panning
      switch(e.which) {
        case 1: // left button
          this.startSegmentCreationFromEvent(e);
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

  getMouseSegmentCoords(coords, ignorePan) {
    if(ignorePan) {
      return {
        x: Math.floor((coords.x - (this.pan.x % this.displayOptions.segmentWidth)) / this.displayOptions.segmentWidth),
        y: Math.floor((coords.y - (this.pan.y % this.displayOptions.segmentWidth)) / this.displayOptions.segmentWidth)
      };
    }
    return {
      x: Math.floor((coords.x - this.pan.x) / this.displayOptions.segmentWidth),
      y: Math.floor((coords.y - this.pan.y) / this.displayOptions.segmentWidth)
    };
  }

  // mouse coords relative to a segment size and panning
  relMouseCoords(e) {
    let c = this.mouseCoords(e);
    let factor = defaultSegmentSize / this.displayOptions.segmentWidth;
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
