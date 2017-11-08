/**
 * Created by mfaivremacon on 01/09/2015.
 */
import {DBObject} from "./dbobject";
import {Geometry, Vector} from "./helpers";
import {PathFinder} from "./pathfinder";

export class Train extends DBObject {

  constructor(doc) {
    // console.log('Train#constructor', doc);
    const def = {
      _id: Random.id(),
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

  reset() {
    this.pos.x = this.pos.y = 1;
  }

  // to be done with pathfinding
  move() {
    // console.log('Train#move', this.pos);
    // Find the station where we want to go to
    if(this.fromStation === null) { // we are not on a track
      // find the nearest station
      const station = this.map.getNearestStation(this.pos, -1);
      // go to it
      this.fromStation = station;
    }
    else { // we come from a station
      if(!this.running) this.findDestination();
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
      if(this.nextStation) console.log('next stop is', this.nextStation._id);
      this.progress = 0;
    }
    if(!this.nextStation) {
      console.log('**** no nextStation');
      return;
    }

    const speed = 100; // the speed of the train in km/h
    const pixelMeter = 10; // the size of one increment of a coordinate (not necessary a pixel depending on the zoom factor) in meters
    const refreshSpeed = 0.4; // the server clock speed in seconds
    const pixelSpeed = (speed / pixelMeter) / 3.6; // the number of pixels we should pass in one second
    const timePixels = pixelSpeed * refreshSpeed; // the real pixels depending of the refresh time
    let v = new Vector(this.fromStation.pos, this.nextStation.pos);
    const segmentLen = v.len() * pixelMeter; // the length of a segment in meters (note hat the coordinates of the vector are already zoomed)
    const push = (timePixels / segmentLen) * 100; // % progress
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
    this.destStation = this.map.stations[_.random(this.map.stations.length - 1)];
    if(!this.destStation) {
      console.log('********** no dest ???', this.map.stations.length);
      return;
    }
    if(this.destStation._id === this.fromStation._id) {
      console.log('*** on self');
      return;
    }
    console.log('======= New Trip:', this.fromStation._id, '=>', this.destStation._id);
    const self = this;
    this.path = _.map(PathFinder.path(this.fromStation, this.destStation), function(id) {
      console.log(id);
      return self.map.getStationById(id);
    });
    // console.log('len', this.path.length);
    if(this.path.len === 0) this.destStation = null;
  }


  toObj() {
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

  saveToDB() {
    // console.log('saveTrainToDB', this._id);
    Meteor.call('trainAdd', this._id, this.toObj());
  }

  updateDB() {
    // console.log('Train#updateDB', this._id);
    Meteor.call('trainUpdate', this._id, this.toObj());
  }

  updateFromDB(doc) {
    // console.log('Train#updateFromDB', doc);
    const self = this;
    if(doc.pos) {
      this.from = _.clone(this.pos);
      if(doc.pos) this.pos = doc.pos;
      this.hasMoved = true;
    }
    if(doc.fromStation) this.fromStation = this.map.getStationById(doc.fromStation);
    if(doc.destStation) this.destStation = this.map.getStationById(doc.destStation);
    if(doc.path) this.path = _.compact(_.map(this.path, function(id) {return self.map.getStationById(id);}))
    // console.log('Train#updateFromDB', doc, "\n", 'this', this);
  }


}
