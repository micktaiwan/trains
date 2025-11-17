/**
 * Created by mfaivremacon on 31/08/2015.
 */
import {Geometry, Helpers} from "./helpers";
import {Train} from "./train";
import {Person} from "./person";
import {Station} from "./station";
import {City} from "./city";

// a map is a set of stations belonging to a game_id
export class GameMap {

  constructor(game_id, shouldObserveChanges = false) {
    console.log('GameMap#constructor: game_id', game_id, shouldObserveChanges);
    this._id = game_id;
    this.objects = [];
    this.message = new ReactiveVar('');
    this.observeHandle = null;
    this.shouldObserveChanges = shouldObserveChanges;
  }

  // Initialize the map and wait for existing objects to be loaded
  async initAsync() {
    console.log('GameMap#initAsync: game_id', this._id);
    if(this.shouldObserveChanges) {
      this.observeHandle = await Helpers.observeChanges({game_id: this._id, map: this});
      console.log('GameMap#initAsync: observeChanges initialized, loaded', this.objects.length, 'objects');
    }
    return this;
  }

  init(game_id) {
    console.log('GameMap#init: game_id', game_id);
    this._id = game_id;
  }

  // Cleanup method to stop observing
  stopObserving() {
    if(this.observeHandle) {
      this.observeHandle.stop();
      this.observeHandle = null;
    }
  }

  async resetMap() {
    this.objects.length = 0;
    await Meteor.callAsync('mapReset', this._id);
  }

  draw() {
    console.error('method should be overridded');
  }

  setMessage(msg) {
    this.message.set(msg);
  }

  removeObjectById(id) {
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i]._id === id) {
        this.objects.splice(i, 1);
        break;
      }
    }
  }

  async removeObjectFromDb(id) {
    this.removeObjectById(id);
    await Meteor.callAsync('mapRemove', id);
  }

  getObjectById(id) {
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i]._id === id) return this.objects[i];
    }
    return null;
  }

  getStationByPos(pos) {
    for(let s = 0; s < this.objects.length; s++) {
      if(this.objects[s].type !== 'station') continue;
      if(_.isEqual(this.objects[s].pos, pos)) return {station: this.objects[s], index: s};
    }
    return null;
  }

  getTrains() {
    return _.filter(this.objects, function(o) {return o.type === 'train';});
  }

  getStations() {
    return _.filter(this.objects, function(o) {return o.type === 'station';});
  }

  getPersons() {
    return _.filter(this.objects, function(o) {return o.type === 'person';});
  }

  // Count number of people waiting near a station
  countPeopleNearStation(station, radius = null) {
    if(!radius) radius = Helpers.getPassengersRadius || 50;
    let count = 0;

    for(const obj of this.objects) {
      if(obj.type !== 'person') continue;
      if(Geometry.dist(station.pos, obj.pos) < radius) {
        count++;
      }
    }

    return count;
  }

  getTrainByPos(pos) {
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i].type !== 'train') continue;
      if(_.isEqual(this.objects[i].pos, pos)) return this.objects[i];
    }
    return null;
  }

  addObject(obj) {
    this.objects.push(obj);
  }

  // For server only
  addStation(doc) {
    if(this.getObjectById(doc._id)) return; // the client could have added it before saving it to the db
    const s = new Station(doc);
    this.addObject(s);
    this.updateStationsLinks();
  }

  // coming from db
  addTrain(doc) {
    const c = this.getObjectById(doc._id);
    if(c) throw new Error('same train id ?');
    const train = new Train(doc);
    this.objects.push(train);
    return train;
  }

  // For server only
  addPerson(doc) {
    if(this.getObjectById(doc._id)) return; // the client could have added it before saving it to the db
    const p = new Person(doc);
    this.addObject(p);
  }

  // Add city from database
  addCity(doc) {
    if(this.getObjectById(doc._id)) return; // the client could have added it before saving it to the db
    const c = new City(doc);
    this.addObject(c);
  }

  getCities() {
    return _.filter(this.objects, function(o) {return o.type === 'city';});
  }

  // Find the nearest city to a given position
  findNearestCity(pos) {
    const cities = this.getCities();
    if(cities.length === 0) return null;

    let nearestCity = cities[0];
    let minDist = Geometry.dist(pos, nearestCity.pos);

    for(let i = 1; i < cities.length; i++) {
      const dist = Geometry.dist(pos, cities[i].pos);
      if(dist < minDist) {
        minDist = dist;
        nearestCity = cities[i];
      }
    }

    return {city: nearestCity, dist: minDist};
  }

  // coming from db
  updateObject(id, doc) {
    const obj = this.getObjectById(id);
    if(!obj) return console.error("updateObject: could not find object", id, doc);
    obj.updateFromDB(doc);
    // for each game change, also set game status
    // if(this.game) this.game.setStatus();
  }

  // update all links. when a station JSON is found, replace it with the actual station
  updateStationsLinks() {
    const self = this;
    _.each(this.objects, function(s) {
      if(s.type !== 'station') return;
      s.children = _.compact(_.map(s.children, function(l) {
        if(typeof (l) === 'string') return self.getObjectById(l) || l;
        return l;
      }));
      s.parents = _.compact(_.map(s.parents, function(l) {
        if(typeof (l) === 'string') return self.getObjectById(l) || l;
        return l;
      }));
    });
  }

  // a map can observe the stations itself
  // but if it is the case, will create simple stations, not StationGui

  async removeStation(station, withoutTrans) {
    if(!withoutTrans) await station.addTransChildren();
    await station.removeChildren();
    this.removeObjectById(station._id); // FIXME P1: try without it, as removeObjectFromDb will update the map back
    await this.removeObjectFromDb(station._id);
  }

  async removeIsolatedStations() {
    const self = this;
    for(const station of this.objects) {
      if(station.type !== 'station') continue;
      if(station.children.length === 0 && station.parents.length === 0) await self.removeObjectFromDb(station._id);
    }
  }

  getNearestStation(pos, maxdist) {
    const stations = this.getNearestStations(pos, maxdist);
    if(stations.length > 0) return stations[0].station;
    return null;
  }

  // if maxdist < 0 then not limit on distance, return all stations
  getNearestStations(pos, maxdist) {
    const rv = [];
    for(let i = 0; i < this.objects.length; i++) {
      if(this.objects[i].type !== 'station') continue;
      const d = Geometry.dist(pos, this.objects[i].pos);
      if(maxdist < 0 || d <= maxdist) rv.push({station: this.objects[i], dist: d});
    }
    return _.sortBy(rv, function(p) {return p.dist;});
  }

  getNearestLinks(pos) {
    const dist = this.dispo.linkSize;
    let obj = this.getLinks(pos, dist);
    if(!obj.length) return null;
    return obj[0];
  }

  // return array of all link segments near to pos by dist, sorted by dist
  // handles bidirectional links by deduplicating station pairs
  getLinks(pos, dist) {
    // console.log('GameMap#getLinks', pos, dist);
    const rv = [];
    const processed = new Set(); // Track processed station pairs

    for(let s = 0; s < this.objects.length; s++) {
      if(this.objects[s].type !== 'station') continue;

      for(let p = 0; p < this.objects[s].children.length; p++) {
        if(typeof (this.objects[s].children[p]) === 'string') continue;

        const child = this.objects[s].children[p];

        // Create unique key for this station pair (sorted to handle bidirectional)
        const pairKey = [this.objects[s]._id, child._id].sort().join('-');

        // Skip if we've already processed this pair
        if(processed.has(pairKey)) continue;
        processed.add(pairKey);

        const rel = Geometry.relPointToSegment(this.objects[s].pos, child.pos, pos);
        if(rel.dist <= dist) {
          rv.push({stations: [this.objects[s], child], rel: rel});
        }
      }
    }
    return _.sortBy(rv, function(e) {return e.rel.dist;});
  }

}
