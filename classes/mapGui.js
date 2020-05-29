/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {GameMap} from './map';
import {StationGui} from "./stationGui";
import {TrainGui} from './trainGui';
import {Drawing, Geometry, Helpers} from "./helpers";
import {CityGui} from "./city";
import {PersonGui} from "./person";

export class GameMapGui extends GameMap {

  constructor(gameId, displayOptions = {}) {
    super(gameId);
    //displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.dispo = {
      zoom: displayOptions.zoom || Helpers.defaultZoom,
      mouseSize: displayOptions.mouseSize || 15,
      stationSize: displayOptions.stationSize || 15, // in real pixels
      linkSize: displayOptions.linkSize || 10,
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

  // real mouse coords
  static mouseCoords(e) {
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

    return {x: cx, y: cy};
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

  // insert a station q as a child of another p
  // p => children will become p => q => children

  setGame(game) { // only needed for client, in a mapGui
    this.game = game;
  }

  // p => parents will become q => parents
  insertProjection(rel) {
    const parent = this.getStationByPos(rel.p1).station;
    const child = this.getStationByPos(rel.p2).station;
    const q = new StationGui({map: this, pos: rel.projection, children: [], parents: []});
    this.addObject(q);
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
    this.currentStation = new StationGui({map: this, pos: c});
    // this.currentStation.saveToDB();
  }

  insertStationToLink() {
    this.game.sound('station');
    this.dragStation = this.insertProjection(this.nearestObj.rel);
  }

  drawCurrentLinkFromEvent(e) {
    if(!this.currentStation) return;
    const c = this.snappedMouseCoords(e);
    this.ctx.lineWidth = this.dispo.zoom * this.dispo.linkSize;
    const cpos = this.relToRealCoords(this.currentStation.pos);
    this.ctx.strokeStyle = '#666';
    Drawing.drawLine(this.ctx, cpos, c);
    Drawing.drawPoint(this.ctx, cpos, this.dispo.mouseSize * this.dispo.zoom);
    Drawing.drawPoint(this.ctx, c, this.dispo.mouseSize * this.dispo.zoom);
  }

  endLinkFromEvent(e) {
    if(!this.currentStation) return;
    this.game.sound('station');
    const c = this.relMouseCoords(e);
    const endStation = new StationGui({map: this, pos: c});
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
    this.dispo.zoom = Helpers.defaultZoom;
    this.pan = {x: 0, y: 0};
    this.draw();
  }

  // dotranslate() { this.ctx.translate(this.pan.x, this.pan.y); }
  // untranslate() { this.ctx.translate(-this.pan.x, -this.pan.y); }

  drawStations() {
    const z = this.dispo.zoom;
    const self = this;
    // first draw segments
    _.each(this.objects, function(station) {
      if(station.type !== 'station') return;
      // console.log('drawing station', station);
      // draw children
      let size = z * (self.dispo.linkSize);
      // if(size > self.dispo.linkSize) size = self.dispo.linkSize;
      self.ctx.lineWidth = size;

      self.ctx.strokeStyle = '#666';
      _.each(station.children, function(p) {
        if(typeof (p) === 'string') return;
        Drawing.drawLine(self.ctx, self.relToRealCoords(station.pos), self.relToRealCoords(p.pos));
      });
    });

    // draw the stations
    _.each(this.objects, function(station) {
      if(station.type !== 'station') return;
      station.draw();
    });

    // then links
    // if(self.dispo.zoom >= 0.25) {
    _.each(this.objects, function(station) {
        if(station.type !== 'station') return;
        // draw children
        self.ctx.lineWidth = 2;
        self.ctx.strokeStyle = '#fff';
        self.ctx.fillStyle = '#fff';
        _.each(station.children, function(child) {
          if(typeof (child) === 'string') return;
          const distInKm = Geometry.dist(station.pos, child.pos) * Helpers.pixelMeter / 1000;
          if(self.dispo.zoom >= 0.5)
            Drawing.drawArrow(self.ctx, self.relToRealCoords(station.pos), self.relToRealCoords(child.pos), 0.2);
          // display length
          // FIXME: draw 2 times
          if(
            (self.dispo.zoom >= 0.05 && distInKm > 50) ||
            (self.dispo.zoom >= 0.08 && distInKm > 20) ||
            (self.dispo.zoom >= 0.14 && distInKm > 10) ||
            self.dispo.zoom >= 0.45
          )
            Drawing.text(self.ctx, Helpers.gameDist(Geometry.dist(station.pos, child.pos)), self.relToRealCoords(Geometry.middlePoint(station.pos, child.pos)));
        });
        // draw parents links
        // self.ctx.lineWidth = 4;
        // self.ctx.strokeStyle = '#f00';
        // _.each(station.parents, function(p) {
        //   if(typeof(p) === 'string') return;
        //   Drawing.drawArrow(self.ctx, self.relToRealCoords(p.pos), self.relToRealCoords(station.pos), 0.1);
        // });
      },
    )
    ;
    // }
  }

  // Given a pos try to redraw the portion of this map (links for example)
  drawSection(pos) {
    // draw a back box over the position to erase movement trace
    const size = this.dispo.stationSize * 2.2 * this.dispo.zoom;
    const a = this.relToRealCoords(pos);
    // const rpos = _.clone(a);
    a.x = a.x - size / 2;
    a.y = a.y - size / 2;
    this.ctx.fillStyle = '#000';
    // console.log(a, size);
    this.ctx.fillRect(a.x, a.y, size, size);

    // find if we are near a segment
    // const links = this.getLinks(pos, size);
    // this.ctx.font = '14px sans';
    // this.ctx.fillStyle = '#9f9';
    // this.ctx.fillText('pos: ' + Math.round(pos.x) + ', ' + Math.round(pos.y) + ', links: ' + links.length, rpos.x - 100, rpos.y + this.dispo.linkSize * this.dispo.zoom + 10);


    // TODO: redraw the segment
  }

  draw() {
    const time = new Date().getTime();
    if(!this.ctx) return;
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i].type !== 'city') continue;
      this.objects[i].draw();
    }
    this.drawStations();
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i].type !== 'train') continue;
      this.objects[i].draw();
    }
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i].type !== 'person') continue;
      this.objects[i].draw();
    }
    this.drawMapBorder();
    this.drawCenter();
    this.drawTime = (new Date().getTime()) - time;
    // display coords
    this.ctx.font = '14px sans';
    this.ctx.fillStyle = '#999';
    this.ctx.fillText('pos: ' + this.mouseRelPos.x + ', ' + this.mouseRelPos.y, 20, 20);
    this.ctx.fillText('pan: ' + (this.pan.x) + ', ' + (this.pan.y), 20, 40);
    this.ctx.fillText('zoom: ' + (this.dispo.zoom), 20, 60);
    this.ctx.fillText('time: ' + (this.drawTime), 20, 80);
  }

  drawMouse() {
    if(!this.game.canModifyMap()) return;
    const c = this.mouseSnappedCoords;
    if(!c) return;
    // display mouse
    let size = this.dispo.mouseSize * this.dispo.zoom;
    // if(size < 5) size = 5;
    Drawing.drawPoint(this.ctx, c, size);
  }

  // we have been notified that another client removed this station
  removeObjectById(id) {
    // console.log('removing station', id, '...');
    super.removeObjectById(id);
    this.draw();
  }

  // Zoom
  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const factor = this.dispo.zoom / (e.wheelDelta / 30);
    this.dispo.zoom += factor;
    this.dispo.zoom = Math.round(this.dispo.zoom * 1000) / 1000;
    if(this.dispo.zoom < 0.05)
      this.dispo.zoom = 0.05;
    if(this.dispo.zoom > 6)
      this.dispo.zoom = 6;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.pan.x += (newPos.x - oldPos.x) * this.dispo.zoom;
    this.pan.y += (newPos.y - oldPos.y) * this.dispo.zoom;
    this.pan.x = Math.round(this.pan.x);
    this.pan.y = Math.round(this.pan.y);

    this.draw();
    this.drawMouse();
  }

  onMouseMove(e) {
    this.draw();
    let drawmouse = true;
    this.mouseOldPos = this.mousePos;
    this.mousePos = GameMapGui.mouseCoords(e);
    this.mouseSnappedCoords = this.snappedMouseCoords(e);
    this.mouseRelPos = this.relMouseCoords(e);
    this.mouseMovement = {x: this.mousePos.x - this.mouseOldPos.x, y: this.mousePos.y - this.mouseOldPos.y};
    this.nearestObj = this.getNearestStation(this.mouseRelPos, this.dispo.stationSize);
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
    else { // mouse is up
      if(this.nearestObj) {
        drawmouse = false;
        document.body.style.cursor = 'move';
        // this.ctx.fillStyle = '#900';
        // Drawing.drawPoint(this.ctx, this.relToRealCoords(this.nearestObj.pos), this.dispo.zoom * this.dispo.stationSize);
      }
      else {
        // test if near a link
        this.nearestObj = this.getNearestLinks(this.mouseRelPos);
        if(this.nearestObj) {
          // check if near a station
          // if not near a point, we are on a link
          if(this.nearestObj.rel.inside) {
            drawmouse = false;
            document.body.style.cursor = 'pointer';
            this.ctx.fillStyle = '#6f6';
            let size = this.dispo.zoom * this.dispo.stationSize;
            // if(size < 5) size = 5;
            Drawing.drawPoint(this.ctx, this.relToRealCoords(this.nearestObj.rel.projection), size);
          }
        }
        else
          document.body.style.cursor = 'auto';
      }
    }
    if(drawmouse) this.drawMouse();
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
      this.drawMouse();
    }
    this.mouseIsDown = true;
    document.body.style.cursor = 'none';
  }

  onMouseUp(e) {
    this.game.sounds['drag'].fade(0.1, 0, 100);
    this.endLinkFromEvent(e);
    this.mouseIsDown = false;
    if(this.dragStation) {
      // test if draggued onto another Station (to merge them)
      let stations = this.overlappingStations();
      if(stations.length > 1) {
        const self = this;
        stations = _.reject(stations, function(s) {return s.station._id === self.dragStation._id;});
        this.game.sound('merge');
        this.dragStation.mergeStation(stations[0].station);
      }
      else
        this.dragStation.updateDB();
      this.dragStation = null;
    }
    document.body.style.cursor = 'default';
  }

  // return all stations under the mouse
  overlappingStations() {
    return this.getNearestStations(this.mouseRelPos, this.dispo.stationSize * 1.5, 1);
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
    this.nearestObj = this.getNearestStation(this.mouseRelPos, this.dispo.stationSize);
    if(this.nearestObj) {
      this.game.sound('remove');
      const station = this.nearestObj;
      this.removeStation(station);
      this.removeIsolatedStations(); // FIXME P1: should be automatic
    }
    /*
        else {
          // test if near a link
          this.nearestObj = this.getNearestLinks(this.mouseRelPos);
          if(this.nearestObj) {
            if(this.nearestObj.rel.inside) {
              this.game.sound('remove');
              console.log(2);
              // this.removeObjectFromDb(this.nearestObj.path._id);
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
    const factor = this.dispo.zoom;
    return {x: Math.round((c.x * factor) + (this.pan.x)), y: Math.round((c.y * factor) + (this.pan.y))};
  }

  // game mouse coords (relative to zoom and panning)
  relMouseCoords(e) {
    const c = GameMapGui.mouseCoords(e);
    const factor = this.dispo.zoom;
    c.x = Math.round((c.x / factor) - (this.pan.x / factor));
    c.y = Math.round((c.y / factor) - (this.pan.y / factor));
    return c;
  }

  // coming from db
  addStation(doc) {
    // console.log("GameMapGui#addStation", doc);
    if(this.getObjectById(doc._id)) return; // the client could have added it before saving it to the db
    const s = new StationGui(doc);
    super.addObject(s); // not addStation
    this.updateStationsLinks();
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
    this.draw();
    // console.log('added', s);
  }

  // coming from db
  addTrain(doc) {
    const pos = doc.pos;
    const c = this.getTrainByPos(pos);
    console.log('addTrain', doc._id, doc, 'found', c);
    if(c) return; // if the client already have it
    super.addObject(new TrainGui(doc));
  }

  addCity(doc) {
    const c = new CityGui(doc);
    this.cities.push(c);
    return c;
  }

  // coming from db
  addPerson(doc) {
    if(this.getObjectById(doc._id)) return; // the client could have added it before saving it to the db
    // console.log("GameMapGui#addPerson", doc);
    const p = new PersonGui(doc);
    super.addObject(p);
    this.draw();
  }

  // coming from db
  updateObject(id, doc) {
    super.updateObject(id, doc);
    // this.draw(); // too many draw for all objects update
  }

}
