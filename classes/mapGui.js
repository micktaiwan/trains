/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {GameMap} from './map';
import {Point} from "./station";
import {StationGui} from "./stationGui";
import {TrainGui} from './trainGui';
import {Drawing} from "./helpers";

const defaultZoom = 5;

export class GameMapGui extends GameMap {

  constructor(gameId, displayOptions) {
    super(gameId);
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      zoom: displayOptions.zoom || defaultZoom,
      mouseSize: displayOptions.mouseSize || 4,
      stationSize: displayOptions.stationSize || 4,
      segmentSize: displayOptions.segmentSize || 5
    };

    this.mouseIsDown = false;
    this.mouseOldPos = {x: 0, y: 0};
    this.mousePos = {x: 0, y: 0};
    this.mouseRelPos = {x: 0, y: 0};
    this.pan = {x: 0, y: 0};
    this.dragStation = null;
  }

  static onContextMenu(e) {
    e.preventDefault();
    return false;
  }

  init(canvas_id, game_id) {
    console.log('GameMapGui init', game_id);
    super.init(game_id);
    this.game.canModifyMap(); // just to trigger reactivity and depending helpers
    this.canvas = $(canvas_id).get(0);
    this.ctx = this.canvas.getContext("2d");
    this.currentStation = null;
    // listen to mouse
    this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
    this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
    this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
    this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
    this.canvas.addEventListener("contextmenu", $.proxy(GameMapGui.onContextMenu, this), false);
    //this.canvas.addEventListener("mouseout", $.proxy(this.onMouseOut, this), false);
    //this.canvas.addEventListener("dblclick", $.proxy(this.onMouseDblClick, this), false);
    this.draw();
    console.log('map initialized');
  }

  setGame(game) { // only needed for client, in a mapGui
    this.game = game;
  }

  // insert a station q as a child of another p
  // p => children will become p => q => children
  // p => parents will become q => parents
  insertProjection(rel) {
    const parent = this.getStationByPos(rel.p1).station;
    const child = this.getStationByPos(rel.p2).station;
    const q = new StationGui(this, {pos: rel.projection, children: [], parents: []});
    this.stations.push(q);
    parent.removeChild(child); // will remove child's parent ('parent')
    child.removeChild(parent); // will remove parent's parent ('child')
    parent.addBiChild(q);
    child.addBiChild(q);
    // console.log('parent:', parent);
    // console.log('q', q);
    q.saveToDB();
    parent.updateDB();
    child.updateDB();
    return q;
  }

  // given a mouse down, start creating a link between 2 new stations
  startLinkFromEvent(e) {
    this.game.sound('station');
    if(!this.game.canModifyMap()) return;
    const c = this.relMouseCoords(e);
    this.currentStation = new StationGui(this, {pos: c});
    // this.currentStation.saveToDB();
  }

  insertStationToLink() {
    this.game.sound('station');
    this.dragStation = this.insertProjection(this.nearestObj.rel);
  }

  drawCurrentLinkFromEvent(e) {
    if(!this.currentStation) return;
    // if(!this.stations.length) return;
    const c = this.snappedMouseCoords(e);
    this.ctx.lineWidth = this.displayOptions.zoom * this.displayOptions.segmentSize;
    const cpos = this.relToRealCoords(this.currentStation.pos);
    this.ctx.strokeStyle = '#666';
    Drawing.drawLine(this.ctx, cpos, c);
    Drawing.drawPoint(this.ctx, cpos, this.displayOptions.mouseSize * this.displayOptions.zoom);
    Drawing.drawPoint(this.ctx, c, this.displayOptions.mouseSize * this.displayOptions.zoom);
  }

  endLinkFromEvent(e) {
    if(!this.currentStation) return;
    this.game.sound('station');
    const c = this.relMouseCoords(e);
    const endStation = new StationGui(this, {pos: c});
    this.currentStation.addBiChild(endStation);
    this.currentStation.saveToDB();
    endStation.saveToDB();
    this.currentStation = null;
    this.draw();
  }

  resetMap() {
    this.game.sound('success', {stereo: 0});
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

  drawStations() {
    const z = this.displayOptions.zoom;
    const self = this;
    // first draw segments
    _.each(this.stations, function(station) {
      // console.log('drawing station', station);
      // draw children
      self.ctx.lineWidth = z * self.displayOptions.segmentSize;
      self.ctx.strokeStyle = '#666';
      _.each(station.children, function(p) {
        if(typeof(p) === 'string') return;
        Drawing.drawLine(self.ctx, self.relToRealCoords(station.pos), self.relToRealCoords(p.pos));
      });
    });

    // draw the stations
    _.each(this.stations, function(p) {p.draw();});

    // then links
    _.each(this.stations, function(station) {
      // draw children
      self.ctx.lineWidth = 2;
      self.ctx.strokeStyle = '#fff';
      _.each(station.children, function(p) {
        if(typeof(p) === 'string') return;
        Drawing.drawArrow(self.ctx, self.relToRealCoords(station.pos), self.relToRealCoords(p.pos), 0.2);
      });
      // draw parents links
      // self.ctx.lineWidth = 4;
      // self.ctx.strokeStyle = '#f00';
      // _.each(station.parents, function(p) {
      //   if(typeof(p) === 'string') return;
      //   Drawing.drawArrow(self.ctx, self.relToRealCoords(p.pos), self.relToRealCoords(station.pos), 0.1);
      // });
    });
  }

  draw() {
    const time = new Date().getTime();
    if(!this.ctx) return;
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // this.dotranslate();
    this.drawStations();
    // this.untranslate();

    for(let i = 0; i < this.trains.length; i++) {
      this.trains[i].draw();
    }

    this.drawMapBorder();
    this.drawCenter();
    this.drawTime = (new Date().getTime()) - time;
    // display coords
    this.ctx.font = '14px sans';
    this.ctx.fillStyle = '#999';
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
      // const t = self.getPath(pos);
      // if(t) t.draw({withBackground: true});
    });
  }

  // we have been notified that another client removed this station
  removeStationById(id) {
    // console.log('removing station', id, '...');
    super.removeStationById(id);
    this.draw();
  }

  // Zoom
  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const factor = this.displayOptions.zoom / (e.wheelDelta / 45);
    this.displayOptions.zoom += factor;
    this.displayOptions.zoom = Math.round(this.displayOptions.zoom * 100) / 100;
    if(this.displayOptions.zoom < 0.2)
      this.displayOptions.zoom = 0.2;
    if(this.displayOptions.zoom > 50)
      this.displayOptions.zoom = 50;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.pan.x += (newPos.x - oldPos.x) * this.displayOptions.zoom;
    this.pan.y += (newPos.y - oldPos.y) * this.displayOptions.zoom;
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
    this.nearestObj = this.getNearestStation(this.mouseRelPos, this.displayOptions.stationSize);
    if(this.mouseIsDown) {
      if(e.ctrlKey) { // pan map
        drawmouse = false;
        this.pan.x += this.mouseMovement.x;
        this.pan.y += this.mouseMovement.y;
      }
      else { // edit map
        if(this.button === 1) {// dragging
          if(this.dragStation)
            this.doDragPoint(e);
          else
            this.drawCurrentLinkFromEvent(e);
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
      if(this.nearestObj) {
        drawmouse = false;
        document.body.style.cursor = 'move';
        // this.ctx.fillStyle = '#900';
        // Drawing.drawPoint(this.ctx, this.relToRealCoords(this.nearestObj.pos), this.displayOptions.zoom * this.displayOptions.stationSize);
      }
      else {
        // test if near a link
        this.nearestObj = this.getNearestObject(this.mouseRelPos);
        if(this.nearestObj) {
          // check if near a station
          // if not near a point, we are on a link
          if(this.nearestObj.rel.inside) {
            drawmouse = false;
            document.body.style.cursor = 'pointer';
            this.ctx.fillStyle = '#6f6';
            Drawing.drawPoint(this.ctx, this.relToRealCoords(this.nearestObj.rel.projection), this.displayOptions.zoom * this.displayOptions.stationSize);
          }
        }
        else
          document.body.style.cursor = 'auto';
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
          if(!this.nearestObj) // creating a new link
            this.startLinkFromEvent(e);
          else { // on a path or station
            if(!this.nearestObj.rel) { // a station
              this.dragStation = this.nearestObj;
              this.game.sound('drag');
            }
            else // it's a path
              this.insertStationToLink();
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
    this.game.sounds['drag'].fade(0.1, 0, 100);
    this.endLinkFromEvent(e);
    this.mouseIsDown = false;
    if(this.dragStation) {
      // if(this.dragStation.notSaved) this.removeStationById(this.dragStation._id);
      // test if draggued onto another Station (to merge them)
      let stations = this.overlappingStations();
      if(stations.length > 1) {
        const self = this;
        stations = _.reject(stations, function(s) {return s.station._id === self.dragStation._id});
        this.game.sound('merge');
        this.dragStation.mergeStation(stations[0].station);
      }

      this.dragStation.updateDB();
      this.dragStation = null;
    }
    document.body.style.cursor = 'default';
  }

  // return all stations under the mouse
  overlappingStations() {
    return this.getNearestStations(this.mouseRelPos, this.displayOptions.stationSize * 1.5, 1);
  }

  doDragPoint(e) {
    // test if we are on another station
    const stations = this.overlappingStations();
    if(stations.length > 1) { // if yes, snap pos
      this.game.sound('clip', {onlyIfNotPlaying: true, stopAllOthers: true});
      this.dragStation.pos = stations[1].station.pos;
    }
    else this.dragStation.pos = this.mouseRelPos;
  }

  removePointFromEvent(e) {
    if(!this.game.canModifyMap()) return;
    this.nearestObj = this.getNearestStation(this.mouseRelPos, this.displayOptions.stationSize);
    if(this.nearestObj) {
      this.game.sound('remove');
      const station = this.nearestObj;
      this.removeStation(station);
      this.removeIsolatedStations(); // FIXME P1: should be automatic
    }
    /*
        else {
          // test if near a link
          this.nearestObj = this.getNearestObject(this.mouseRelPos);
          if(this.nearestObj) {
            if(this.nearestObj.rel.inside) {
              this.game.sound('remove');
              console.log(2);
              // this.removeStationFromDb(this.nearestObj.path._id);
            }
            else
              console.log(this.nearestObj);
          }
          else
            document.body.style.cursor = 'auto';
        }
    */
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

  // real mouse coords snapped to rel grid
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

  // game mouse coords (relative to zoom and panning)
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

  // coming from db
  addStation(id, doc) {
    if(this.getStationById(id)) return; // the client could have added it before saving it to the db
    const s = new StationGui(this, doc, id);
    super.addStation(s);
    this.draw();
    // console.log('added', s);
  }

  // coming from db
  updateStation(id, doc) {
    super.updateStation(id, doc);
    this.draw();
  }

  // coming from db
  addTrain(id, doc) {
    const pos = doc.pos;
    const c = this.getTrain(pos);
    //console.log('addTrain', id, doc, 'found', c);
    if(c) // if the client already have it
      c.id = id; // make sure the object have a DB id so we can remove it later
    else {
      console.log('pushing');
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

}
