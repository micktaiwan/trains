/**
 * Created by mfaivremacon on 31/08/2015.
 */

import {GameMap} from './map';
import {StationGui} from "./stationGui";
import {TrainGui} from './trainGui';
import {Drawing, Geometry, Helpers} from "./helpers";
import {CityGui} from "./city";
import {PersonGui} from "./person";
import {AnimationManager} from "./animationManager";
import {InputManager} from "./inputManager";
import {MapRenderer} from "./mapRenderer";

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

    // State managed by InputManager but exposed here for shared access
    this.mouseIsDown = false;
    this.mouseOldPos = {x: 0, y: 0};
    this.mousePos = {x: 0, y: 0};
    this.mouseRelPos = {x: 0, y: 0};
    this.mouseSnappedCoords = {x: 0, y: 0};
    this.pan = {x: 0, y: 0};
    
    // Animation Manager - centralized animation system
    // Delegates drawing to Renderer
    this.animationManager = new AnimationManager((timestamp, deltaTime, animations) => {
      if(this.renderer) {
        this.renderer.drawScene(timestamp, deltaTime, animations);
      }
    });

    // City zone fade animation state
    this.cityZoneFadeOpacity = 0;          // Current opacity (0-1)
    this.cityZoneLastMouseMove = Date.now(); // Timestamp of last mouse movement
    this.cityZoneIdleDelay = 500;           // Delay before fade-out (ms)
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
    
    // Initialize Managers
    this.renderer = new MapRenderer(this);
    this.inputManager = new InputManager(this);
    this.inputManager.init();

    // Start the animation manager
    this.animationManager.start();

    console.log('map initialized');
  }

  // Stop the animation manager (called on destroy)
  destroy() {
    if (this.animationManager) {
      this.animationManager.stop();
    }
  }

  setGame(game) { // only needed for client, in a mapGui
    this.game = game;
  }

  // insert a station q as a child of another p
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

    // Wait for the observer to add the station (with timeout)
    const stationId = q._id;
    const maxWaitMs = 2000;
    const startTime = Date.now();

    while(!this.getObjectById(stationId)) {
      if(Date.now() - startTime > maxWaitMs) {
        // Fallback: add it manually if observer failed
        this.addObject(q);
        break;
      }
      // Wait 10ms before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Get the station that was added by the observer (not our local object)
    const addedStation = this.getObjectById(stationId);

    parent.removeChild(child); // will remove child's parent ('parent')
    child.removeChild(parent); // will remove parent's parent ('child')
    parent.addBiChild(addedStation);
    child.addBiChild(addedStation);
    await parent.updateDB();
    await child.updateDB();

    // Log the station insertion (split)
    const cityInfo = this.findNearestCity(addedStation.pos);
    const cityName = cityInfo ? cityInfo.city.name : 'Unknown';
    await Meteor.callAsync('gameLogAdd', this._id, 'station_inserted', {
      cityName: cityName,
      stationId: addedStation._id
    });

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

  /**
   * Request a redraw on next animation frame
   * This replaces direct calls to draw()
   */
  draw() {
    if (this.animationManager) {
      this.animationManager.requestRedraw();
    }
  }
  
  // Proxy methods for drawing (used by inputManager)
  drawMouse() {
    if(this.renderer) this.renderer.drawMouse();
  }
  
  drawCurrentLinkFromEvent(e, currentStation) {
    if(this.renderer) this.renderer.drawCurrentLink(e);
  }

  // transform relative to real coordinates
  relToRealCoords(c) {
    const factor = this.dispo.zoom;
    return {x: Math.round((c.x * factor) + (this.pan.x)), y: Math.round((c.y * factor) + (this.pan.y))};
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

  // we have been notified that another client removed this station
  removeObjectById(id) {
    // console.log('removing station', id, '...');
    super.removeObjectById(id);
    this.draw(); // This now calls animationManager.requestRedraw()
  }

  // coming from db
  addStation(doc) {
    // Prevent duplicate adds (critical for split operations)
    const existing = this.getObjectById(doc._id);
    if(existing) {
      return;
    }

    const s = new StationGui(doc);
    super.addObject(s); // not addStation
    this.stationsCache.push(s); // Add to cache for fast lookups (inherited from GameMap)
    this.updateStationsLinks();
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
    this.draw();
  }

  // coming from db
  addTrain(doc) {
    // Check by ID, not by position (position can change)
    const existing = this.getObjectById(doc._id);
    if(existing) {
      return;
    }
    super.addObject(new TrainGui(doc));
  }

  // coming from db
  addCity(doc) {
    const existing = this.getObjectById(doc._id);
    if(existing) {
      return;
    }
    const c = new CityGui(doc);
    super.addObject(c);
    this.draw();
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
