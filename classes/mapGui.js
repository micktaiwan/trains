/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {Map, Point, Segment} from './map';
import {TrainGui} from './trainGui';
import {Drawing} from "./helpers";

const defaultZoom = 5;

export class SegmentGui extends Segment {

  constructor(map, doc, id) {
    super(map, doc, id);
    this.ctx = map.ctx;
  }

  draw(options) {
    const z = this.map.displayOptions.zoom;
    const self = this;
    // draw the points
    this.ctx.fillStyle = "#666";
    _.each(this.points, function(p) {
      Drawing.drawPoint(self.ctx, self.map.relToRealCoords(p.pos), z * self.map.displayOptions.pointSize);
    });
    // draw the lines
    const len = this.points.length;
    // if(len === 0) return; // happens just after creating a segment without points
    if(len === 1) { // redraw this point in white
      this.ctx.fillStyle = "#fff";
      Drawing.drawPoint(self.ctx, self.map.relToRealCoords(this.points[0].pos), z * self.map.displayOptions.pointSize);
    }
    else if(len > 1) {
      this.ctx.lineWidth = z * self.map.displayOptions.segmentSize;
      this.ctx.strokeStyle = '#666';
      for(let i = 0; i < this.points.length - 1; i++) {
        const a = this.points[i];
        const b = this.points[i + 1];
        // console.log('dist', self._id, Helpers.dist(a, b));
        Drawing.drawLine(self.ctx, this.map.relToRealCoords(a.pos), this.map.relToRealCoords(b.pos));
      }
    }
  }
}

export class MapGui extends Map {

  constructor(gameId, displayOptions) {
    super(gameId);
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      zoom: displayOptions.zoom || defaultZoom,
      mouseSize: displayOptions.mouseSize || 5,
      pointSize: displayOptions.pointSize || 5,
      segmentSize: displayOptions.segmentSize || 5
    };

    this.mouseIsDown = false;
    this.mouseOldPos = {x: 0, y: 0};
    this.mousePos = {x: 0, y: 0};
    this.mouseRelPos = {x: 0, y: 0};
    this.pan = {x: 0, y: 0};
    this.dragPoint = null;
  }

  static onContextMenu(e) {
    e.preventDefault();
    return false;
  }

  init(canvas_id, game_id) {
    console.log('MapGui init', game_id);
    super.init(game_id);
    this.game.canModifyMap(); // just to trigger reactivity and depending helpers
    this.canvas = $(canvas_id).get(0);
    this.ctx = this.canvas.getContext("2d");
    this.currentSegment = null;
    // listen to mouse
    this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
    this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
    this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
    this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
    this.canvas.addEventListener("contextmenu", $.proxy(MapGui.onContextMenu, this), false);
    //this.canvas.addEventListener("mouseout", $.proxy(this.onMouseOut, this), false);
    //this.canvas.addEventListener("dblclick", $.proxy(this.onMouseDblClick, this), false);
    this.draw();
    console.log('map initialized');
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
  addSegment(id, doc) {
    const segment = new SegmentGui(this, doc, id);
    super.addSegment(segment);
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

  // given a mouse down, start creating a segment
  startSegmentCreationFromEvent(e) {
    if(!this.game.canModifyMap()) return;
    const c = this.relMouseCoords(e);
    this.currentSegment = new SegmentGui(this);
    const self = this;
    this.currentSegment.saveToDB(function(err, rv) {
      self.currentSegment.addPoint(c);
    });
  }

  addPointToSegment() {
    this.dragPoint = this.nearestObj.segment.addPoint(this.nearestObj.rel.projection, this.nearestObj.rel.from);
  }

  drawCurrentSegmentFromEvent(e) {
    if(!this.currentSegment) return;
    if(!this.currentSegment.points.length) return;
    const c = this.snappedMouseCoords(e);
    this.ctx.lineWidth = this.displayOptions.zoom * this.displayOptions.segmentSize;
    this.ctx.strokeStyle = '#fff';
    Drawing.drawLine(this.ctx, this.relToRealCoords(this.currentSegment.points[0].pos), c);
    Drawing.drawPoint(this.ctx, c, this.displayOptions.mouseSize * this.displayOptions.zoom);
  }

  endSegmentFromEvent(e) {
    if(!this.currentSegment) return;
    const c = this.relMouseCoords(e);
    const segment = this.currentSegment;
    const endPoint = new Point({pos: c}, segment);
    segment.points.push(endPoint);
    this.currentSegment.updateDB();
    this.currentSegment = null;
    this.draw();
  }

  doDragPoint(e) {
    this.dragPoint.pos = this.mouseRelPos;
  }

  removePointFromEvent(event) {
    if(!this.game.canModifyMap()) return;
    // const pos = this.getMouseSegmentCoords(this.mouseCoords(event));
    // const segment = this.getSegment(pos);
    // if(segment) {
    //   console.log('removing', segment);
    //   this.removeSegmentFromDb(segment._id);
    // }
  }

  resetMap() {
    super.resetMap();
    this.resetPosition();
  }

  resetPosition() {
    this.displayOptions.zoom = defaultZoom;
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
    const time = new Date().getTime();
    if(!this.ctx) return;
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // this.dotranslate();
    for(let i = 0; i < this.segments.length; i++)
      this.segments[i].draw();
    // this.untranslate();

    for(let i = 0; i < this.trains.length; i++)
      this.trains[i].draw();

    this.drawMapBorder();
    this.drawCenter();
    this.drawTime = (new Date().getTime()) - time;
    // display coords
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('pos: ' + this.mouseRelPos.x + ', ' + this.mouseRelPos.y, 20, 20);
    this.ctx.fillText('pan: ' + (this.pan.x) + ', ' + (this.pan.y), 20, 40);
    this.ctx.fillText('zoom: ' + (this.displayOptions.zoom), 20, 60);
    this.ctx.fillText('time: ' + (this.drawTime), 20, 80);

    // window.requestAnimationFrame(this.draw);
  }

  drawMouse(event) {
    if(!this.game.canModifyMap()) return;
    const c = this.snappedMouseCoords(event);
    const r = this.relMouseCoords(event);
    // display mouse
    Drawing.drawPoint(this.ctx, c, this.displayOptions.mouseSize * this.displayOptions.zoom);
  }

  drawSection(posArray) {
    if(!this.ctx) return;
    const self = this;
    posArray.forEach(function(pos) {
      // const t = self.getSegment(pos);
      // if(t) t.draw({withBackground: true});
    });
  }

  // we have been notified that another client removed this segment
  removeSegment(id) {
    // console.log('removing segment', id, '...');
    super.removeSegment(id);
    this.draw();
  }

  // Zoom
  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const factor = this.displayOptions.zoom / (e.wheelDelta / 60);
    this.displayOptions.zoom += factor;
    this.displayOptions.zoom = Math.round(this.displayOptions.zoom * 100) / 100;
    if(this.displayOptions.zoom < 0.01)
      this.displayOptions.zoom = 0.01;
    if(this.displayOptions.zoom > 50)
      this.displayOptions.zoom = 50;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.pan.x += (newPos.x - oldPos.x) / (defaultZoom / this.displayOptions.zoom);
    this.pan.y += (newPos.y - oldPos.y) / (defaultZoom / this.displayOptions.zoom);
    this.pan.x = Math.round(this.pan.x);
    this.pan.y = Math.round(this.pan.y);

    this.draw();
    this.drawMouse(e);
  }

  onMouseMove(e) {
    this.draw();
    let drawmouse = true;
    this.mouseOldPos = this.mousePos;
    this.mousePos = this.mouseCoords(e);
    this.mouseRelPos = this.relMouseCoords(e);
    this.mouseMovement = {x: this.mousePos.x - this.mouseOldPos.x, y: this.mousePos.y - this.mouseOldPos.y};
    if(this.mouseIsDown) {
      if(e.ctrlKey) { // pan map
        drawmouse = false;
        this.pan.x += this.mouseMovement.x;
        this.pan.y += this.mouseMovement.y;
      }
      else { // edit map
        if(this.button === 1) {// dragging
          if(this.dragPoint)
            this.doDragPoint(e);
          else
            this.drawCurrentSegmentFromEvent(e);
          drawmouse = false;
        }
        else if(this.button === 2) { // middle button = pan
          this.pan.x += this.mouseMovement.x;
          this.pan.y += this.mouseMovement.y;
          this.pan.x = Math.round(this.pan.x);
          this.pan.y = Math.round(this.pan.y);
        }
        else if(this.button === 3)
          this.removePointFromEvent(e);
      }
    }
    else {
      // test if near a segment
      this.nearestObj = this.getNearestObject(this.mouseRelPos);
      if(this.nearestObj) {
        drawmouse = false;
        this.ctx.fillStyle = '#666';
        if(this.nearestObj.rel.inside) {
          // document.body.style.cursor = 'none';
          Drawing.drawPoint(this.ctx, this.relToRealCoords(this.nearestObj.rel.projection), this.displayOptions.zoom * this.displayOptions.pointSize);
        }
      }
    }
    if(drawmouse) this.drawMouse(e);
  }

  onMouseDown(e) {
    e.preventDefault();
    let draw = true;
    if(!e.ctrlKey) { // Ctrl is for panning
      switch(e.which) {
        case 1: // left button
          if(!this.nearestObj) // creating a new segment
            this.startSegmentCreationFromEvent(e);
          else { // on a segment
            let p;
            if(p = this.nearestObj.segment.getNearestPoint(this.nearestObj.rel.projection, this.displayOptions.pointSize))
              this.dragPoint = p;
            else // it's a segment
              this.addPointToSegment();
            draw = false;
          }
          break;
        case 3: // right button
          this.removePointFromEvent(e);
          break;
      }
    }
    this.button = e.which;
    if(draw) {
      this.draw();
      this.drawMouse(e);
    }
    this.mouseIsDown = true;
    document.body.style.cursor = 'none';
  }

  onMouseUp(e) {
    this.endSegmentFromEvent(e);
    this.mouseIsDown = false;
    if(this.dragPoint) {
      this.dragPoint.updateDB();
      this.dragPoint = null;
    }
    document.body.style.cursor = 'default';
  }

  drawMapBorder() {
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#999';
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.stroke();
  }

  drawCenter() {
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#999';
    this.ctx.beginPath();
    this.ctx.moveTo(this.pan.x - 5, this.pan.y);
    this.ctx.lineTo(this.pan.x + 5, this.pan.y);
    this.ctx.moveTo(this.pan.x, this.pan.y - 5);
    this.ctx.lineTo(this.pan.x, this.pan.y + 5);
    this.ctx.stroke();
  }

  getMouseSegmentCoords(coords, ignorePan) {
    if(ignorePan) {
      return {
        x: Math.floor((coords.x - (this.pan.x % this.displayOptions.zoom)) / this.displayOptions.zoom),
        y: Math.floor((coords.y - (this.pan.y % this.displayOptions.zoom)) / this.displayOptions.zoom)
      };
    }
    return {
      x: Math.floor((coords.x - this.pan.x) / this.displayOptions.zoom),
      y: Math.floor((coords.y - this.pan.y) / this.displayOptions.zoom)
    };
  }

  // real mouse coords snap to grid
  snappedMouseCoords(e) {
    // first get relative coords
    const c = this.relMouseCoords(e); // rounded
    // then go back to real coords
    return this.relToRealCoords(c);
  }

  // transform relative to real coordinates
  relToRealCoords(c) {
    const factor = this.displayOptions.zoom;
    return {x: Math.round((c.x * factor) + (this.pan.x)), y: Math.round((c.y * factor) + (this.pan.y))}
  }

  // mouse coords relative to zoom and panning
  relMouseCoords(e) {
    const c = this.mouseCoords(e);
    const factor = this.displayOptions.zoom;
    c.x = Math.round((c.x / factor) - (this.pan.x / factor));
    c.y = Math.round((c.y / factor) - (this.pan.y / factor));
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
