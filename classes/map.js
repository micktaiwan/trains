/**
 * Created by mfaivremacon on 31/08/2015.
 */
import {Geometry, Helpers} from "./helpers";
import {Train} from "./train";
import {Person} from "./person";
import {Station} from "./station";

// a map is a set of stations belonging to a game_id
export class GameMap {

  constructor(game_id, observeChanges) {
    console.log('GameMap#constructor: game_id', game_id, observeChanges);
    this._id = game_id;
    this.objects = [];
    this.message = new ReactiveVar('');
    if(observeChanges) Helpers.observeChanges({game_id: game_id, map: this});
  }

  init(game_id) {
    console.log('GameMap#init: game_id', game_id);
    this._id = game_id;
  }

  resetMap() {
    this.objects.length = 0;
    Meteor.call('mapReset', this._id);
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

  removeObjectFromDb(id) {
    this.removeObjectById(id);
    Meteor.call('mapRemove', id);
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

  // coming from db
  updateObject(id, doc) {
    const obj = this.getObjectById(id);
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
        if(typeof(l) === 'string') return self.getObjectById(l) || l;
        return l;
      }));
      s.parents = _.compact(_.map(s.parents, function(l) {
        if(typeof(l) === 'string') return self.getObjectById(l) || l;
        return l;
      }));
    });
  }

  // a map can observe the stations itself
  // but if it is the case, will create simple stations, not StationGui

  removeStation(station, withoutTrans) {
    if(!withoutTrans) station.addTransChildren();
    station.removeChildren();
    this.removeObjectById(station._id); // FIXME P1: try without it, as removeObjectFromDb will update the map back
    this.removeObjectFromDb(station._id);
  }

  removeIsolatedStations() {
    const self = this;
    _.each(this.objects, function(station) {
      if(station.type !== 'station') return;
      if(station.children.length === 0 && station.parents.length === 0) self.removeObjectFromDb(station._id);
    });
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

  // FIXME P0: what about bidirectional links ?
  getNearestLinks(pos) {
    const dist = this.dispo.linkSize;
    let obj = this.getLinks(pos, dist);
    if(!obj.length) return null;
    return obj[0];
  }

  // return array of all link segments near to pos by dist, sorted by dist
  getLinks(pos, dist) {
    // console.log('GameMap#getLinks', pos, dist);
    const rv = [];
    for(let s = 0; s < this.objects.length; s++) {
      if(this.objects[s].type !== 'station') continue;
      for(let p = 0; p < this.objects[s].children.length; p++) {
        if(typeof(this.objects[s].children[p]) === 'string') continue;
        const rel = Geometry.relPointToSegment(this.objects[s].pos, this.objects[s].children[p].pos, pos);
        if(rel.dist <= dist)
          rv.push({stations: [this.objects[s], this.objects[s].children[p]], rel: rel});
      }
    }
    return _.sortBy(rv, function(e) {return e.rel.dist;});
  }

}
