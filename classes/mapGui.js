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

    // City zone fade animation
    this.cityZoneFadeOpacity = 0;          // Current opacity (0-1)
    this.cityZoneLastMouseMove = Date.now(); // Timestamp of last mouse movement
    this.cityZoneFadeSpeed = 0.015;         // Fade speed per frame (slower: ~1.1 seconds)
    this.cityZoneIdleDelay = 500;           // Delay before fade-out (ms)
    this.cityZoneFadeAnimating = false;     // Animation loop active flag
    this.cityZoneFadeState = 'idle';        // 'idle', 'fading-in', 'visible', 'fading-out'
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
  async insertProjection(rel) {
    const parent = this.getStationByPos(rel.p1).station;
    const child = this.getStationByPos(rel.p2).station;
    const q = new StationGui({map: this, pos: rel.projection, children: [], parents: []});

    // Station cost will be automatically charged by mapInsert when calling saveToDB
    try {
      await q.saveToDB();
    } catch(err) {
      this.setMessage(err.reason || err.message);
      throw err; // Cancel operation
    }

    // DO NOT add locally - let the observer add it to prevent duplicates
    // this.addObject(q); // REMOVED: observer will add it via 'added' event

    // Wait for the observer to add the station (with timeout)
    const stationId = q._id;
    const maxWaitMs = 2000;
    const startTime = Date.now();
    console.log('insertProjection: waiting for observer to add station', stationId);

    while(!this.getObjectById(stationId)) {
      if(Date.now() - startTime > maxWaitMs) {
        console.error('insertProjection: timeout waiting for station', stationId);
        // Fallback: add it manually if observer failed
        this.addObject(q);
        break;
      }
      // Wait 10ms before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('insertProjection: station added by observer', stationId);

    // Get the station that was added by the observer (not our local object)
    const addedStation = this.getObjectById(stationId);

    parent.removeChild(child); // will remove child's parent ('parent')
    child.removeChild(parent); // will remove parent's parent ('child')
    parent.addBiChild(addedStation);
    child.addBiChild(addedStation);
    await parent.updateDB();
    await child.updateDB();
    return addedStation;
  }

  // Validate if a station can be placed at given position (must be within cityStationPlacementRadius of a city)
  validateStationPlacement(pos) {
    const nearestCityInfo = this.findNearestCity(pos);
    if(!nearestCityInfo) {
      return {valid: false, error: 'No cities found on map'};
    }

    const maxDistance = Helpers.cityStationPlacementRadius;
    if(nearestCityInfo.dist > maxDistance) {
      return {
        valid: false,
        error: `Station must be within ${maxDistance}m of a city (nearest: ${Math.round(nearestCityInfo.dist)}m from ${nearestCityInfo.city.name})`
      };
    }

    return {valid: true, nearestCity: nearestCityInfo.city};
  }

  // given a mouse down, start creating a link between 2 new stations
  startLinkFromEvent(e) {
    if(!this.game.canModifyMap()) return;
    const c = this.relMouseCoords(e);

    // Validate station placement
    const validation = this.validateStationPlacement(c);
    if(!validation.valid) {
      this.setMessage(validation.error);
      return;
    }

    this.game.sound('station');
    this.currentStation = new StationGui({map: this, pos: c});
    // this.currentStation.saveToDB();
  }

  async insertStationToLink() {
    if(!this.game.canModifyMap()) return;
    this.game.sound('station');
    this.dragStation = await this.insertProjection(this.nearestObj.rel);
  }

  // Draw radius circles around cities to show placement zones
  drawCityPlacementZones() {
    const cities = this.getCities();
    const maxDistance = Helpers.cityStationPlacementRadius;

    // State machine for fade animation
    const now = Date.now();
    const timeSinceMove = now - this.cityZoneLastMouseMove;
    let needsRedraw = false;

    // Determine state transitions
    if(timeSinceMove < 100) {
      // Mouse is moving
      if(this.cityZoneFadeState === 'idle' || this.cityZoneFadeState === 'fading-out') {
        // Start fading in
        this.cityZoneFadeState = 'fading-in';
      }
    } else if(timeSinceMove > this.cityZoneIdleDelay) {
      // Mouse has been idle for a while
      if(this.cityZoneFadeState === 'visible' || this.cityZoneFadeState === 'fading-in') {
        // Start fading out
        this.cityZoneFadeState = 'fading-out';
      }
    }

    // Update opacity based on state
    if(this.cityZoneFadeState === 'fading-in') {
      this.cityZoneFadeOpacity = Math.min(1, this.cityZoneFadeOpacity + this.cityZoneFadeSpeed);
      needsRedraw = true;

      // Check if fade-in is complete
      if(this.cityZoneFadeOpacity >= 0.99) {
        this.cityZoneFadeState = 'visible';
        this.cityZoneFadeOpacity = 1;
      }
    } else if(this.cityZoneFadeState === 'fading-out') {
      this.cityZoneFadeOpacity = Math.max(0, this.cityZoneFadeOpacity - this.cityZoneFadeSpeed);
      needsRedraw = true;

      // Check if fade-out is complete
      if(this.cityZoneFadeOpacity <= 0.01) {
        this.cityZoneFadeState = 'idle';
        this.cityZoneFadeOpacity = 0;
      }
    }

    // Schedule next redraw if animating
    if(needsRedraw) {
      const self = this;
      if(!this.cityZoneFadeAnimating) {
        this.cityZoneFadeAnimating = true;
        requestAnimationFrame(function() {
          self.cityZoneFadeAnimating = false;
          self.draw();
        });
      }
    }

    // Don't draw if fully transparent (optimization)
    if(this.cityZoneFadeOpacity <= 0.01) return;

    // Apply fade to normal circles
    const normalOpacity = 0.3 * this.cityZoneFadeOpacity;
    this.ctx.strokeStyle = `rgba(100, 200, 255, ${normalOpacity})`;
    this.ctx.lineWidth = 2;

    for(const city of cities) {
      const cityPos = this.relToRealCoords(city.pos);
      const radiusInPixels = maxDistance * this.dispo.zoom;
      Drawing.drawCircle(this.ctx, cityPos, radiusInPixels);
    }

    // Highlight nearest city
    if(this.mouseRelPos) {
      const nearestCityInfo = this.findNearestCity(this.mouseRelPos);
      if(nearestCityInfo && nearestCityInfo.dist <= maxDistance) {
        const highlightOpacity = 0.6 * this.cityZoneFadeOpacity;
        const cityPos = this.relToRealCoords(nearestCityInfo.city.pos);
        this.ctx.strokeStyle = `rgba(100, 255, 100, ${highlightOpacity})`;
        this.ctx.lineWidth = 3;
        Drawing.drawCircle(this.ctx, cityPos, maxDistance * this.dispo.zoom);
      }
    }
  }

  drawCurrentLinkFromEvent(e) {
    if(!this.currentStation) return;
    const c = this.snappedMouseCoords(e);
    const cRel = this.relMouseCoords(e);
    this.ctx.lineWidth = this.dispo.zoom * this.dispo.linkSize;
    const cpos = this.relToRealCoords(this.currentStation.pos);
    this.ctx.strokeStyle = '#666';
    Drawing.drawLine(this.ctx, cpos, c);
    Drawing.drawPoint(this.ctx, cpos, this.dispo.mouseSize * this.dispo.zoom);
    Drawing.drawPoint(this.ctx, c, this.dispo.mouseSize * this.dispo.zoom);

    // Highlight merge target station if mouse is close to an existing station
    const mergeRadius = (this.dispo.stationSize * 2) / this.dispo.zoom;
    const nearbyStations = this.getNearestStations(cRel, mergeRadius);

    // Check if we're starting from an existing station or creating new one
    const startOverlaps = this.getNearestStations(this.currentStation.pos, mergeRadius);
    const isStartExisting = startOverlaps.length > 0;

    if(nearbyStations.length > 0) {
      const targetStation = nearbyStations[0].station;

      // Don't highlight if it's the same station we started from (can't connect to itself)
      if(!isStartExisting || targetStation._id !== startOverlaps[0].station._id) {
        const targetPos = this.relToRealCoords(targetStation.pos);

        // Draw glowing highlight around target station
        this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
        this.ctx.lineWidth = 4;
        const highlightRadius = this.dispo.zoom * this.dispo.stationSize * 1.5;
        Drawing.drawCircle(this.ctx, targetPos, highlightRadius);

        // Draw smaller inner circle
        this.ctx.strokeStyle = 'rgba(150, 255, 150, 0.6)';
        this.ctx.lineWidth = 2;
        Drawing.drawCircle(this.ctx, targetPos, highlightRadius * 0.7);
      }
    }
  }

  async endLinkFromEvent(e) {
    if(!this.currentStation) return;
    if(!this.game.canModifyMap()) {
      this.currentStation = null;
      return;
    }

    const c = this.relMouseCoords(e);

    // Validate end station placement
    const validation = this.validateStationPlacement(c);
    if(!validation.valid) {
      this.setMessage(validation.error);
      this.currentStation = null;
      this.draw();
      return;
    }

    this.game.sound('station');

    // Check for existing stations to merge with
    // Convert screen pixels to world coordinates (account for zoom)
    const mergeRadius = (this.dispo.stationSize * 2) / this.dispo.zoom;
    const startOverlaps = this.getNearestStations(this.currentStation.pos, mergeRadius);
    const endOverlaps = this.getNearestStations(c, mergeRadius);

    // Use existing stations if we're merging, otherwise create new ones
    let fromStation = this.currentStation;
    let toStation = new StationGui({map: this, pos: c});
    let fromIsNew = true;
    let toIsNew = true;

    if(startOverlaps.length > 0) {
      fromStation = startOverlaps[0].station;
      fromIsNew = false;
    }

    if(endOverlaps.length > 0) {
      toStation = endOverlaps[0].station;
      toIsNew = false;
    }

    // Don't allow connecting a station to itself
    if(fromStation._id === toStation._id) {
      this.setMessage('Cannot connect a station to itself');
      this.currentStation = null;
      this.draw();
      return;
    }

    // Calculate costs
    const railDistance = Geometry.dist(fromStation.pos, toStation.pos);
    const railCost = Math.round(railDistance * Helpers.railCostPerMeter);
    const newStationCount = (fromIsNew ? 1 : 0) + (toIsNew ? 1 : 0);
    const mergeRefundCount = 2 - newStationCount;

    // Deduct costs
    try {
      console.log(`Attempting to deduct rail cost: $${railCost} for ${Math.round(railDistance)}m, ${newStationCount} new stations`);
      // Deduct rail cost
      await Meteor.callAsync('teamDeductCost', this._id, railCost,
        `Rail (${Math.round(railDistance)}m, ${newStationCount} stations)`);
      console.log('Rail cost deducted successfully');
    } catch(err) {
      console.error('Failed to deduct rail cost:', err);
      this.setMessage(err.reason || err.message);
      this.currentStation = null;
      this.draw();
      return;
    }

    // Create link
    fromStation.addBiChild(toStation);

    // Save new stations (this will charge station costs via mapInsert)
    try {
      console.log(`Saving stations: fromIsNew=${fromIsNew}, toIsNew=${toIsNew}`);
      if(fromIsNew) {
        console.log('Saving fromStation...');
        await fromStation.saveToDB();
        console.log('fromStation saved successfully');
      }
      if(toIsNew) {
        console.log('Saving toStation...');
        await toStation.saveToDB();
        console.log('toStation saved successfully');
      }

      // Update existing stations
      if(!fromIsNew) {
        console.log('Updating fromStation...');
        await fromStation.updateDB();
      }
      if(!toIsNew) {
        console.log('Updating toStation...');
        await toStation.updateDB();
      }

      // Credit back for merged stations
      if(mergeRefundCount > 0) {
        console.log(`Crediting back $${mergeRefundCount * Helpers.stationCost} for ${mergeRefundCount} merged stations`);
        await Meteor.callAsync('teamAddRevenue', this._id,
          mergeRefundCount * Helpers.stationCost, 0);
      }

      console.log('Rail creation completed successfully');
    } catch(err) {
      console.error('Failed to save stations:', err);
      this.setMessage(err.reason || err.message);
      this.currentStation = null;
      this.draw();
      return;
    }

    this.currentStation = null;
    this.draw();
  }

  async resetMap() {
    this.game.sound('success', {stereo: 0});
    await super.resetMap();

    // Wait for new objects to be loaded, then auto-fit
    const self = this;
    let computation;
    computation = Tracker.autorun(() => {
      // Wait until objects are loaded
      if(self.objects.length > 0) {
        // Defer to next tick to ensure all objects are fully added
        Meteor.defer(() => {
          self.fitMapToView();
        });
        // Stop tracking after first fit
        if(computation) computation.stop();
      }
    });
  }

  resetPosition() {
    this.dispo.zoom = Helpers.defaultZoom;
    this.pan = {x: 0, y: 0};
    this.draw();
  }

  // Fit map to view: auto-zoom and pan to show all objects
  fitMapToView() {
    if(this.objects.length === 0) return;

    // Calculate bounding box of all objects
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for(const obj of this.objects) {
      if(!obj.pos) continue;

      // Add some padding based on object type
      let padding = 50;
      if(obj.type === 'city') padding = obj.radius || 150;

      minX = Math.min(minX, obj.pos.x - padding);
      minY = Math.min(minY, obj.pos.y - padding);
      maxX = Math.max(maxX, obj.pos.x + padding);
      maxY = Math.max(maxY, obj.pos.y + padding);
    }

    // Calculate required dimensions
    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;

    // Calculate zoom to fit (with 10% margin)
    const zoomX = (this.canvas.width * 0.9) / mapWidth;
    const zoomY = (this.canvas.height * 0.9) / mapHeight;
    this.dispo.zoom = Math.min(zoomX, zoomY);

    // Clamp zoom to reasonable values
    if(this.dispo.zoom < 0.05) this.dispo.zoom = 0.05;
    if(this.dispo.zoom > 6) this.dispo.zoom = 6;

    // Calculate center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Center the view on the bounding box center
    this.pan.x = (this.canvas.width / 2) - (centerX * this.dispo.zoom);
    this.pan.y = (this.canvas.height / 2) - (centerY * this.dispo.zoom);

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

    // Draw city placement zones with fade animation
    this.drawCityPlacementZones();

    // Display passenger destinations for all trains
    this.drawTrainPassengerInfo();
  }

  drawTrainPassengerInfo() {
    const trains = this.getTrains();
    if(trains.length === 0) return;

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#fff';

    let yOffset = 20;

    for(const train of trains) {
      const trainIdShort = train._id.substring(0, 6);
      const passengerCount = train.passengers ? train.passengers.length : 0;
      const capacity = train.capacity || 10;
      const maxSpeed = train.maxSpeed || 180;

      // Build train info line: "Train [id] (3/10, 180km/h): destinations"
      let text = `Train ${trainIdShort} (${passengerCount}/${capacity}, ${maxSpeed}km/h)`;

      // Add destinations if there are passengers
      if(passengerCount > 0) {
        // Build list of destination cities
        const destinations = [];
        for(const passengerId of train.passengers) {
          const passenger = this.getObjectById(passengerId);
          if(passenger && passenger.destinationCityId) {
            const city = this.getObjectById(passenger.destinationCityId);
            if(city && city.name) {
              destinations.push(city.name);
            }
          }
        }

        if(destinations.length > 0) {
          // Count occurrences of each destination
          const destinationCounts = {};
          for(const dest of destinations) {
            destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
          }

          // Format output: "2× Paris, 1× Lyon"
          const destText = Object.entries(destinationCounts)
            .map(([city, count]) => count > 1 ? `${count}× ${city}` : city)
            .join(', ');

          text += `: ${destText}`;
        }
      }

      // Draw background
      const textMetrics = this.ctx.measureText(text);
      const textWidth = textMetrics.width;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(10, yOffset - 14, textWidth + 20, 20);

      // Draw text
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(text, 20, yOffset);

      yOffset += 25;
    }
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

    const delta = Math.max(-1, Math.min(1, (e.deltaY || e.wheelDelta || -e.detail)));
    const factor = this.dispo.zoom / (delta * 60);
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

    // Update timestamp for city zone fade animation
    this.cityZoneLastMouseMove = Date.now();
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

  async onMouseDown(e) {
    e.preventDefault();
    let draw = true;
    if(!e.ctrlKey) { // Ctrl is for panning
      switch(e.which) {
        case 1: // left button
          // Cmd+Click on Mac = delete (in addition to right-click)
          if(e.metaKey) {
            await this.removePointFromEvent(e);
          }
          else if(!this.nearestObj) // creating a new link
            this.startLinkFromEvent(e);
          else { // on a path or station
            if(!this.nearestObj.rel) { // a station
              if(this.game.canModifyMap()) {
                this.dragStation = this.nearestObj;
                this.game.sound('drag');
              }
            }
            else // it's a path
              await this.insertStationToLink();
            draw = false;
          }
          break;
        case 3: // right button
          await this.removePointFromEvent(e);
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

  async onMouseUp(e) {
    this.game.sounds['drag'].fade(0.1, 0, 100);
    await this.endLinkFromEvent(e);
    this.mouseIsDown = false;
    if(this.dragStation) {
      // test if draggued onto another Station (to merge them)
      let stations = this.overlappingStations();
      if(stations.length > 1) {
        const self = this;
        stations = _.reject(stations, function(s) {return s.station._id === self.dragStation._id;});

        // Safety check: ensure we still have stations to merge with after filtering
        if(stations.length === 0) {
          console.log('No stations to merge with after filtering, treating as simple move');
          try {
            await Meteor.callAsync('teamDeductCost', this._id,
              Helpers.stationMoveCost, 'Station move');
            await this.dragStation.updateDB();
          } catch(err) {
            this.setMessage(err.reason || err.message);
          }
          this.dragStation = null;
          return;
        }

        // Charge move cost first
        try {
          await Meteor.callAsync('teamDeductCost', this._id,
            Helpers.stationMoveCost, 'Station move');
        } catch(err) {
          this.setMessage(err.reason || err.message);
          this.dragStation = null;
          return;
        }

        this.game.sound('merge');
        await this.dragStation.mergeStation(stations[0].station);

        // Credit station refund (net = move cost - station refund = $100 - $500 = -$400)
        await Meteor.callAsync('teamAddRevenue', this._id,
          Helpers.stationCost, 0);
      }
      else {
        // Simple move (no merge)
        try {
          await Meteor.callAsync('teamDeductCost', this._id,
            Helpers.stationMoveCost, 'Station move');
          await this.dragStation.updateDB();
        } catch(err) {
          this.setMessage(err.reason || err.message);
          // TODO: Rollback position to original (would need to store original position)
        }
      }
      this.dragStation = null;
    }
    document.body.style.cursor = 'default';
  }

  // return all stations under the mouse
  overlappingStations() {
    const mergeRadius = (this.dispo.stationSize * 2) / this.dispo.zoom;
    return this.getNearestStations(this.mouseRelPos, mergeRadius);
  }

  doDragPoint(e) {
    // test if we are on another station
    const stations = this.overlappingStations();
    if(stations.length > 1) { // if yes, snap pos
      this.game.sound('clip', {onlyIfNotPlaying: true, stopAllOthers: true});
      this.dragStation.pos = stations[1].station.pos;

      // Highlight merge target station
      const targetStation = stations[1].station;
      const targetPos = this.relToRealCoords(targetStation.pos);

      this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
      this.ctx.lineWidth = 4;
      const highlightRadius = this.dispo.zoom * this.dispo.stationSize * 1.5;
      Drawing.drawCircle(this.ctx, targetPos, highlightRadius);

      this.ctx.strokeStyle = 'rgba(150, 255, 150, 0.6)';
      this.ctx.lineWidth = 2;
      Drawing.drawCircle(this.ctx, targetPos, highlightRadius * 0.7);
    }
    else this.dragStation.pos = this.mouseRelPos;
  }

  // Calculate refund for removing a station (station cost + all connected rails)
  calculateStationRefund(station) {
    let totalRefund = Helpers.stationCost; // $500 for the station

    // Calculate rail refunds (only count children to avoid double-counting bidirectional rails)
    for(const child of station.children) {
      const railDistance = Geometry.dist(station.pos, child.pos);
      const railRefund = Math.round(railDistance * Helpers.railCostPerMeter);
      totalRefund += railRefund;
    }

    return totalRefund;
  }

  // Override parent's removeIsolatedStations to add refunds
  async removeIsolatedStations() {
    const isolatedStations = [];

    // Find isolated stations
    for(const station of this.objects) {
      if(station.type !== 'station') continue;
      if(station.children.length === 0 && station.parents.length === 0) {
        isolatedStations.push(station);
      }
    }

    // Remove isolated stations
    for(const station of isolatedStations) {
      await this.removeObjectFromDb(station._id);
    }

    // Credit refund for isolated stations
    if(isolatedStations.length > 0) {
      const refund = isolatedStations.length * Helpers.stationCost;
      await Meteor.callAsync('teamAddRevenue', this._id, refund, 0);
      console.log(`Isolated stations removed: refunding $${refund} (${isolatedStations.length} stations)`);
    }
  }

  async removePointFromEvent(e) {
    if(!this.game.canModifyMap()) return;
    this.nearestObj = this.getNearestStation(this.mouseRelPos, this.dispo.stationSize);
    if(this.nearestObj) {
      this.game.sound('remove');
      const station = this.nearestObj;

      // Calculate refund before removing
      const refund = this.calculateStationRefund(station);
      console.log(`Station removal: refunding $${refund} (station + ${station.children.length} rails)`);

      await this.removeStation(station);
      await this.removeIsolatedStations(); // FIXME P1: should be automatic

      // Credit refund
      if(refund > 0) {
        await Meteor.callAsync('teamAddRevenue', this._id, refund, 0);
      }
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
    console.log("GameMapGui#addStation", doc._id, 'existing?', !!this.getObjectById(doc._id));

    // Prevent duplicate adds (critical for split operations)
    const existing = this.getObjectById(doc._id);
    if(existing) {
      console.log('GameMapGui#addStation: station already exists locally, skipping', doc._id);
      return;
    }

    const s = new StationGui(doc);
    super.addObject(s); // not addStation
    this.updateStationsLinks();
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
    this.draw();
    console.log('GameMapGui#addStation: added station', s._id, 'total stations:', this.getStations().length);
  }

  // coming from db
  addTrain(doc) {
    // Check by ID, not by position (position can change)
    const existing = this.getObjectById(doc._id);
    console.log('GameMapGui#addTrain', doc._id, 'existing?', !!existing);
    if(existing) {
      console.log('GameMapGui#addTrain: train already exists locally, skipping', doc._id);
      return;
    }
    super.addObject(new TrainGui(doc));
    console.log('GameMapGui#addTrain: added train', doc._id);
  }

  // coming from db
  addCity(doc) {
    const existing = this.getObjectById(doc._id);
    console.log('GameMapGui#addCity', doc._id, 'existing?', !!existing);
    if(existing) {
      console.log('GameMapGui#addCity: city already exists locally, skipping', doc._id);
      return;
    }
    const c = new CityGui(doc);
    super.addObject(c);
    this.draw();
    console.log('GameMapGui#addCity: added city', c._id);
  }

  // coming from db
  addPerson(doc) {
    const existing = this.getObjectById(doc._id);
    if(existing) {
      // Person additions are very frequent, don't spam console
      return;
    }
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
