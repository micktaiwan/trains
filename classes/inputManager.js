import {Drawing, Geometry, Helpers} from "./helpers";
import {StationGui} from "./stationGui";

export class InputManager {

  constructor(mapGui) {
    this.map = mapGui;
    this.game = mapGui.game;
    this.canvas = mapGui.canvas;
    
    this.mouseIsDown = false;
    this.mouseOldPos = {x: 0, y: 0};
    this.mousePos = {x: 0, y: 0};
    this.mouseRelPos = {x: 0, y: 0};
    this.mouseSnappedCoords = {x: 0, y: 0};
    this.dragStation = null;
    this.dragStationOriginalCity = null;
    this.currentStation = null; // For linking
    this.nearestObj = null;
    this.button = 0;
  }

  init() {
    this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
    this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
    this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
    this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
    this.canvas.addEventListener("contextmenu", $.proxy(this.onContextMenu, this), false);
  }

  onContextMenu(e) {
    e.preventDefault();
    return false;
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

    return {x: cx, y: cy};
  }

  // game mouse coords (relative to zoom and panning)
  relMouseCoords(e) {
    const c = this.mouseCoords(e);
    const factor = this.map.dispo.zoom;
    c.x = Math.round((c.x / factor) - (this.map.pan.x / factor));
    c.y = Math.round((c.y / factor) - (this.map.pan.y / factor));
    return c;
  }

  // real mouse coords snapped to rel grid
  snappedMouseCoords(e) {
    // first get relative coords
    const c = this.relMouseCoords(e); // rounded
    // then go back to real coords
    return this.map.relToRealCoords(c);
  }

  onMouseWheel(e) {
    e.preventDefault();
    const oldPos = this.relMouseCoords(e);

    const delta = Math.max(-1, Math.min(1, (e.deltaY || e.wheelDelta || -e.detail)));
    const factor = this.map.dispo.zoom / (delta * 60);
    this.map.dispo.zoom += factor;
    this.map.dispo.zoom = Math.round(this.map.dispo.zoom * 1000) / 1000;
    if(this.map.dispo.zoom < 0.05)
      this.map.dispo.zoom = 0.05;
    if(this.map.dispo.zoom > 6)
      this.map.dispo.zoom = 6;

    // zoom depends on mouse position
    const newPos = this.relMouseCoords(e);
    this.map.pan.x += (newPos.x - oldPos.x) * this.map.dispo.zoom;
    this.map.pan.y += (newPos.y - oldPos.y) * this.map.dispo.zoom;
    this.map.pan.x = Math.round(this.map.pan.x);
    this.map.pan.y = Math.round(this.map.pan.y);

    this.map.draw();
    this.map.drawMouse();
  }

  onMouseMove(e) {
    this.map.draw();
    let drawmouse = true;
    this.mouseOldPos = this.mousePos;
    this.mousePos = this.mouseCoords(e);
    this.mouseSnappedCoords = this.snappedMouseCoords(e);
    this.mouseRelPos = this.relMouseCoords(e);
    this.mouseMovement = {x: this.mousePos.x - this.mouseOldPos.x, y: this.mousePos.y - this.mouseOldPos.y};
    
    // Update MapGui state so it can be accessed by Renderer/others if needed
    this.map.mousePos = this.mousePos;
    this.map.mouseRelPos = this.mouseRelPos;
    this.map.mouseSnappedCoords = this.mouseSnappedCoords;

    this.nearestObj = this.map.getNearestStation(this.mouseRelPos, this.map.dispo.stationSize);
    
    // Update timestamp for city zone fade animation
    this.map.cityZoneLastMouseMove = Date.now();
    
    if(this.mouseIsDown) {
      if(e.ctrlKey) { // pan map
        drawmouse = false;
        this.map.pan.x += this.mouseMovement.x;
        this.map.pan.y += this.mouseMovement.y;
      }
      else { // edit map
        if(this.button === 1) {// dragging
          if(this.dragStation)
            this.doDragPoint(e);
          else
            this.map.drawCurrentLinkFromEvent(e, this.currentStation); // MapGui handles drawing
          drawmouse = false;
        }
        else if(this.button === 2) { // middle button = pan
          this.map.pan.x += this.mouseMovement.x;
          this.map.pan.y += this.mouseMovement.y;
          this.map.pan.x = Math.round(this.map.pan.x);
          this.map.pan.y = Math.round(this.map.pan.y);
        }
        else if(this.button === 3)
          this.removePointFromEvent(e);
      }
    }
    else { // mouse is up
      if(this.nearestObj) {
        drawmouse = false;
        document.body.style.cursor = 'move';
      }
      else {
        // test if near a link
        this.nearestObj = this.map.getNearestLinks(this.mouseRelPos);
        if(this.nearestObj) {
          // check if near a station
          // if not near a point, we are on a link
          if(this.nearestObj.rel.inside) {
            drawmouse = false;
            document.body.style.cursor = 'pointer';
            this.map.ctx.fillStyle = '#6f6';
            let size = this.map.dispo.zoom * this.map.dispo.stationSize;
            Drawing.drawPoint(this.map.ctx, this.map.relToRealCoords(this.nearestObj.rel.projection), size);
          }
        }
        else
          document.body.style.cursor = 'auto';
      }
    }
    if(drawmouse) this.map.drawMouse();
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
              if(this.map.game.canModifyMap()) {
                this.dragStation = this.nearestObj;
                // Store original city name for move logging
                const originalCityInfo = this.map.findNearestCity(this.dragStation.pos);
                this.dragStationOriginalCity = originalCityInfo ? originalCityInfo.city.name : 'Unknown';
                this.map.game.sound('drag');
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
      this.map.draw();
      this.map.drawMouse();
    }
    this.mouseIsDown = true;
    document.body.style.cursor = 'none';
  }

  async onMouseUp(e) {
    this.map.game.sounds['drag'].fade(0.1, 0, 100);
    await this.endLinkFromEvent(e);
    this.mouseIsDown = false;
    if(this.dragStation) {
      console.log('[MOUSEUP] dragStation detected:', this.dragStation._id, 'at', this.dragStation.pos);
      // test if draggued onto another Station (to merge them)
      let stations = this.overlappingStations();
      console.log('[MOUSEUP] Overlapping stations:', stations.length);
      if(stations.length > 1) {
        const self = this;
        stations = _.reject(stations, function(s) {return s.station._id === self.dragStation._id;});
        console.log('[MOUSEUP] After filtering self:', stations.length, 'stations remain');

        if(stations.length === 0) {
          console.log('[MOUSEUP] No stations to merge with after filtering, treating as simple move');
          await this.handleStationMove();
          this.dragStation = null;
          this.dragStationOriginalCity = null;
          return;
        }

        console.log('[MOUSEUP] Merging with station', stations[0].station._id);
        // Charge move cost first
        try {
          await Meteor.callAsync('teamDeductCost', this.map._id,
            Helpers.stationMoveCost, 'Station move');
        } catch(err) {
          this.map.setMessage(err.reason || err.message);
          this.dragStation = null;
          return;
        }

        this.map.game.sound('merge');
        await this.dragStation.mergeStation(stations[0].station);

        // Credit station refund
        await Meteor.callAsync('teamAddRevenue', this.map._id,
          Helpers.stationCost, 0);
      }
      else {
        // Simple move (no merge)
        console.log('[MOUSEUP] Simple move (no overlapping stations)');
        await this.handleStationMove();
      }
      this.dragStation = null;
      this.dragStationOriginalCity = null;
    }
    document.body.style.cursor = 'default';
  }

  async handleStationMove() {
    console.log('[MOVE] handleStationMove called for station', this.dragStation._id, 'at pos', this.dragStation.pos);
    try {
      await Meteor.callAsync('teamDeductCost', this.map._id,
        Helpers.stationMoveCost, 'Station move');
      console.log('[MOVE] Cost deducted, updating DB');
      // Get new city name after move
      const newCityInfo = this.map.findNearestCity(this.dragStation.pos);
      const newCityName = newCityInfo ? newCityInfo.city.name : 'Unknown';
      console.log('[MOVE] Station moved from', this.dragStationOriginalCity, 'to', newCityName);
      // Pass old and new city names for logging
      await this.dragStation.updateDB({
        oldCityName: this.dragStationOriginalCity,
        newCityName: newCityName
      });
      console.log('[MOVE] Station position saved to DB successfully');
    } catch(err) {
      console.error('[MOVE] Error during station move:', err);
      this.map.setMessage(err.reason || err.message);
      // TODO: Rollback position to original
    }
  }

  // return all stations under the mouse
  overlappingStations() {
    const mergeRadius = (this.map.dispo.stationSize * 2) / this.map.dispo.zoom;
    return this.map.getNearestStations(this.mouseRelPos, mergeRadius);
  }

  doDragPoint(e) {
    // test if we are on another station
    const stations = this.overlappingStations();
    if(stations.length > 1) { // if yes, snap pos
      this.map.game.sound('clip', {onlyIfNotPlaying: true, stopAllOthers: true});
      this.dragStation.pos = stations[1].station.pos;
      console.log('[DRAG] Station snapped to', stations[1].station._id, 'at', stations[1].station.pos);

      // Highlight merge target station (delegated to renderer via map state or explicit draw)
      // For now, we can't easily draw here without passing context, assume render loop handles it or ignore highlight
      // Actually GameMapGui.doDragPoint did drawing.
      // We should let MapRenderer handle highlights based on InputManager state.
    }
    else {
      this.dragStation.pos = this.mouseRelPos;
      console.log('[DRAG] Station moved to', this.mouseRelPos);
    }
  }

  startLinkFromEvent(e) {
    if(!this.map.game.canModifyMap()) return;
    const c = this.relMouseCoords(e);

    // Validate station placement
    const validation = this.map.validateStationPlacement(c);
    if(!validation.valid) {
      this.map.setMessage(validation.error);
      return;
    }

    this.map.game.sound('station');
    this.currentStation = new StationGui({map: this.map, pos: c});
  }

  async insertStationToLink() {
    if(!this.map.game.canModifyMap()) return;
    this.map.game.sound('station');
    this.dragStation = await this.map.insertProjection(this.nearestObj.rel);
  }

  async endLinkFromEvent(e) {
    if(!this.currentStation) return;
    if(!this.map.game.canModifyMap()) {
      this.currentStation = null;
      return;
    }

    const c = this.relMouseCoords(e);

    // Validate end station placement
    const validation = this.map.validateStationPlacement(c);
    if(!validation.valid) {
      this.map.setMessage(validation.error);
      this.currentStation = null;
      this.map.draw();
      return;
    }

    this.map.game.sound('station');

    // Check for existing stations to merge with
    const mergeRadius = (this.map.dispo.stationSize * 2) / this.map.dispo.zoom;
    const startOverlaps = this.map.getNearestStations(this.currentStation.pos, mergeRadius);
    const endOverlaps = this.map.getNearestStations(c, mergeRadius);

    let fromStation = this.currentStation;
    let toStation = new StationGui({map: this.map, pos: c});
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

    if(fromStation._id === toStation._id) {
      this.map.setMessage('Cannot connect a station to itself');
      this.currentStation = null;
      this.map.draw();
      return;
    }

    // Calculate costs
    const railDistance = Geometry.dist(fromStation.pos, toStation.pos);
    const railCost = Math.round(railDistance * Helpers.railCostPerMeter);
    const newStationCount = (fromIsNew ? 1 : 0) + (toIsNew ? 1 : 0);
    const mergeRefundCount = 2 - newStationCount;

    try {
      await Meteor.callAsync('teamDeductCost', this.map._id, railCost,
        `Rail (${Math.round(railDistance)}m, ${newStationCount} stations)`);
    } catch(err) {
      this.map.setMessage(err.reason || err.message);
      this.currentStation = null;
      this.map.draw();
      return;
    }

    fromStation.addBiChild(toStation);

    try {
      if(fromIsNew) await fromStation.saveToDB();
      if(toIsNew) await toStation.saveToDB();

      if(!fromIsNew) await fromStation.updateDB();
      if(!toIsNew) await toStation.updateDB();

      if(mergeRefundCount > 0) {
        await Meteor.callAsync('teamAddRevenue', this.map._id,
          mergeRefundCount * Helpers.stationCost, 0);
      }

      const fromCityInfo = this.map.findNearestCity(fromStation.pos);
      const toCityInfo = this.map.findNearestCity(toStation.pos);
      const fromCityName = fromCityInfo ? fromCityInfo.city.name : 'Unknown';
      const toCityName = toCityInfo ? toCityInfo.city.name : 'Unknown';

      if(fromIsNew && toIsNew) {
        await Meteor.callAsync('gameLogAdd', this.map._id, 'rail_built', {
          fromCity: fromCityName,
          toCity: toCityName
        });
      } else {
        await Meteor.callAsync('gameLogAdd', this.map._id, 'rail_connected', {
          fromCity: fromCityName,
          toCity: toCityName
        });
      }
    } catch(err) {
      this.map.setMessage(err.reason || err.message);
      this.currentStation = null;
      this.map.draw();
      return;
    }

    this.currentStation = null;
    this.map.draw();
  }

  async removePointFromEvent(e) {
    if(!this.map.game.canModifyMap()) return;
    this.nearestObj = this.map.getNearestStation(this.mouseRelPos, this.map.dispo.stationSize);
    if(this.nearestObj) {
      this.map.game.sound('remove');
      const station = this.nearestObj;

      const cityNames = [];
      const stationCityInfo = this.map.findNearestCity(station.pos);
      if(stationCityInfo && stationCityInfo.city) {
        cityNames.push(stationCityInfo.city.name);
      }

      const refund = this.map.calculateStationRefund(station);
      
      await this.map.removeStation(station);

      const isolatedStations = [];
      for(const s of this.map.objects) {
        if(s.type !== 'station') continue;
        if(s.children.length === 0 && s.parents.length === 0) {
          const isolatedCityInfo = this.map.findNearestCity(s.pos);
          if(isolatedCityInfo && isolatedCityInfo.city) {
            cityNames.push(isolatedCityInfo.city.name);
          }
          isolatedStations.push(s);
        }
      }

      await this.map.removeIsolatedStations();

      if(refund > 0) {
        await Meteor.callAsync('teamAddRevenue', this.map._id, refund, 0);
      }

      if(cityNames.length > 0) {
        await Meteor.callAsync('gameLogAdd', this.map._id, 'stations_removed', {
          cityNames: cityNames
        });
      }
    }
  }

}


