/**
 * Created by mfaivremacon on 01/09/2015.
 */
import {DBObject} from "./dbobject";
import {Geometry, Helpers, Vector} from "./helpers";
import {PathFinder} from "./pathfinder";

export class Train extends DBObject {

  constructor(doc) {
    // console.log('Train#constructor', doc);
    const def = {
      type: 'train',
      game_id: null,
      map: null,
      pos: {x: 10, y: 10},
      fromStation: null, // station
      destStation: null, // station
      nextStation: null, // current target station in path
      path: [], // stations without fromStation
      progress: 0, // progress along current segment (0-100)
      running: false, // whether train is currently moving
      hasMoved: false,
    };
    super(def, doc);
    this.updateFromDB(doc); // perform additional object transformations
  }

  // to be done with pathfinding
  async update(clock) {
    // const from = this.fromStation ? this.fromStation._id + ' ' + this.fromStation.children.length : 'no from station';
    // console.log('Train#move', from, this.pos);
    // Find the station where we want to go to
    this.checkStations();

    if(this.fromStation === null) { // we are not on a track
      // find the nearest station
      const station = this.map.getNearestStation(this.pos, -1);
      // go to it
      this.fromStation = station;
    }
    else { // we come from a station
      if(!this.running) { // we are stopped at a station
        // If no destination set (e.g., after page refresh), calculate one
        if(!this.destStation) {
          this.findDestination();
        }
        await this.getPassengers();
      }
      this.goTowardNextStop();
      this.hasMoved = true;
    }
    if(!this.fromStation) await this.removeFromDB(); // no rails, remove the train
    else await this.updateDB();
  }

  // update train position
  goTowardNextStop() {
    if(!this.nextStation) {
      this.nextStation = this.path.shift();
      this.progress = 0;
    }
    if(!this.nextStation) return this.running = false; // end of path

    this.checkStations();

    let v = new Vector(this.fromStation.pos, this.nextStation.pos);
    const segmentLen = v.len(); // the length of a segment in meters (note hat the coordinates of the vector are already zoomed)
    const push = (Helpers.timePixels / segmentLen) * 100; // % progress
    // we "even out" the number of steps
    const nbPushInSegment = 100 / push; // segments are 100% long (push is a %)
    const even = 100 / Math.round(nbPushInSegment);
    // console.log('push', even, push, even === push, nbPushInSegment);
    this.progress += even; // total progress
    this.running = true;
    if(this.progress >= 100) { // FIXME: we could be very quick and jump a station on the next display
      this.fromStation = this.nextStation;
      this.nextStation = this.path.shift();
      this.pos = this.fromStation.pos;
      this.progress = 0;
      if(this.fromStation === this.destStation) {
        this.running = false;
        // this.leavePassengers();
      }
      else this.getPassengers();
    }
      // calculate vector to goal
    // console.log('from', this.fromStation, 'dest', this.nextStation);
    else
      this.pos = Geometry.getProgressPos(v, this.progress / 100);
    // console.log(this.progress, this.pos, this.fromStation._id, this.nextStation._id);
  }

  checkStations() {
    //check if the stations are still alive
    if(!this.fromStation) return this.running = false;
    this.fromStation = this.map.getObjectById(this.fromStation._id); // we get the real object again in case of DB update (we need it later to check the children)
    if(!this.fromStation) return this.running = false;
    if(!this.nextStation) return;
    if(!this.map.getObjectById(this.nextStation._id)) {
      this.nextStation = this.path.shift();
      return;
    }
    // reset path if the next is not a child of from anymore
    const children = _.map(this.fromStation.children, function(child) {return child._id;});
    if(!children.includes(this.nextStation._id)) {
      this.setPath();
      this.nextStation = this.path.shift();
    }
  }

  // will choose a destination based on passenger demand
  findDestination() {
    // Get all stations
    const stations = this.map.getStations();
    if(stations.length === 0) return;

    // Count people waiting at each station
    const stationDemand = {};
    for(const s of stations) {
      stationDemand[s._id] = this.map.countPeopleNearStation(s);
    }

    // Find station with most waiting passengers (excluding current station)
    let bestStation = null;
    let maxPeople = 0;

    for(const station of stations) {
      if(station._id === this.fromStation._id) continue; // Skip current station
      const demand = stationDemand[station._id];
      if(demand > maxPeople) {
        maxPeople = demand;
        bestStation = station;
      }
    }

    // Fallback to random if no people waiting anywhere
    if(!bestStation || maxPeople === 0) {
      // Filter out current station
      const availableStations = stations.filter(s => s._id !== this.fromStation._id);
      if(availableStations.length === 0) return;
      bestStation = availableStations[_.random(availableStations.length - 1)];
    }

    this.destStation = bestStation;
    if(!this.destStation) return;
    if(this.destStation._id === this.fromStation._id) return console.error('on self');
    // console.log('======= New Trip:', this.fromStation._id, '=>', this.destStation._id, 'demand:', maxPeople);
    this.setPath();
  }

  setPath() {
    const self = this;
    this.path = _.map(PathFinder.path(this.fromStation, this.destStation), function(id) {
      // console.log("Station", id);
      return self.map.getObjectById(id);
    });
    // console.log('len', this.path.length);
    if(this.path.length === 0) this.destStation = null;
  }

  objToSave() {
    const self = this;
    // console.log('len to map', this.path.length);
    return {
      // game_id: this.map._id,
      pos: this.pos,
      progress: this.progress,
      running: this.running,
      fromStation: this.fromStation ? this.fromStation._id : null,
      destStation: this.destStation ? this.destStation._id : null,
      nextStation: this.nextStation ? this.nextStation._id : null,
      path: _.compact(_.map(self.path, function(s) {
        if(s && s._id) return s._id;
      }))
    };
  }

  updateFromDB(doc) {
    // console.log('Train#updateFromDB', doc);
    const self = this;
    if(doc.pos) {
      this.from = _.clone(this.pos);
      if(doc.pos) this.pos = doc.pos;
      this.hasMoved = true;
    }
    if(typeof(doc.progress) !== "undefined") this.progress = doc.progress;
    if(typeof(doc.running) !== "undefined") this.running = doc.running;
    if(doc.fromStation) this.fromStation = this.map.getObjectById(doc.fromStation);
    if(doc.destStation) this.destStation = this.map.getObjectById(doc.destStation);
    if(doc.nextStation) this.nextStation = this.map.getObjectById(doc.nextStation);
    if(doc.path) this.path = _.compact(_.map(doc.path, function(id) {return self.map.getObjectById(id);}));
    // console.log('Train#updateFromDB', doc, "\n", 'this', this);
  }

  async getPassengers() {
    let nb = 0;
    const passengers = [];
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      if(Geometry.dist(this.pos, obj.pos) < Helpers.getPassengersRadius) {
        nb++;
        passengers.push(this.map.objects[i]);
      }
    }
    for(const p of passengers) {
      await p.removeFromDB(); // kill nearby passengers....
    }
    if(nb) console.log('train killed', nb, 'people');
  }

}
