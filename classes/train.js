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
      path: [], // stations without fromStation
      hasMoved: false,
    };
    super(def, doc);
    this.updateFromDB(doc); // perform additional object transformations
  }

  // to be done with pathfinding
  update(clock) {
    // console.log('Train#move', this.pos, this.fromStation._id);
    // Find the station where we want to go to
    if(this.fromStation === null) { // we are not on a track
      // find the nearest station
      const station = this.map.getNearestStation(this.pos, -1);
      // go to it
      this.fromStation = station;
    }
    else { // we come from a station
      if(!this.running) {
        this.getPassengers();
        this.findDestination();
      }
      this.goTowardNextStop();
      this.hasMoved = true;
      this.updateDB();
    }
  }

  // update train position
  goTowardNextStop() {
    // get goal
    if(!this.nextStation) {
      this.nextStation = this.path.shift();
      this.progress = 0;
    }
    if(!this.nextStation) return; // end of path

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
      }
    }
    // calculate vector to goal
    // console.log('from', this.fromStation, 'dest', this.nextStation);
    else this.pos = Geometry.getProgressPos(v, this.progress / 100);
    // console.log(this.progress, this.pos, this.fromStation._id, this.nextStation._id);
  }

  // will choose a destination
  findDestination() {
    // FIXME: to avoid going to unreachable stations, we should generate an array all reachable stations and choose from it
    // but that's maybe not necessary depending on the futur game (take passengers on ours lines, I don't know)

    // random
    const stations = this.map.getStations();
    this.destStation = stations[_.random(stations.length - 1)];
    if(!this.destStation) return console.error('no dest ???', this.map.stations.length);
    if(this.destStation._id === this.fromStation._id) return console.error('on self');

    console.log('======= New Trip:', this.fromStation._id, '=>', this.destStation._id);
    const self = this;
    this.path = _.map(PathFinder.path(this.fromStation, this.destStation), function(id) {
      // console.log("Station", id);
      return self.map.getObjectById(id);
    });
    // console.log('len', this.path.length);
    if(this.path.len === 0) this.destStation = null;
  }

  objToSave() {
    const self = this;
    // console.log('len to map', this.path.length);
    return {
      // game_id: this.map._id,
      pos: this.pos,
      fromStation: this.fromStation ? this.fromStation._id : null,
      destStation: this.destStation ? this.destStation._id : null,
      /*
            path: _.compact(_.map(self.path, function(s) {
              if(s) {
                console.log('mapping', s._id);
                return s._id;
              }
            }))
      */
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
    if(doc.fromStation) this.fromStation = this.map.getObjectById(doc.fromStation);
    if(doc.destStation) this.destStation = this.map.getObjectById(doc.destStation);
    if(doc.path) this.path = _.compact(_.map(this.path, function(id) {return self.map.getObjectById(id);}))
    // console.log('Train#updateFromDB', doc, "\n", 'this', this);
  }

  getPassengers() {
    let nb = 0;
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      if(Geometry.dist(this.pos, obj.pos) < 40) {
        nb++;
        this.map.objects[i].removeFromDB(); // kill nearby passengers....
      }
    }
    console.log('killed', nb, 'passengers');
  }

}
