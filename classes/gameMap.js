/**
 * Created by mfaivremacon on 31/08/2015.
 */
import {Geometry} from "./helpers";
import {Station} from "./station";
import {Train} from "./train";

// a map is a set of stations belonging to a game_id
export class GameMap {

  constructor(game_id, observeChanges) {
    console.log('GameMap#constructor: game_id', game_id, observeChanges);
    this._id = game_id;
    this.trains = [];
    this.stations = [];
    this.message = new ReactiveVar('');
    if(observeChanges) this.observeChanges();
  }

  init(game_id) {
    console.log('GameMap#init: game_id', game_id);
    this._id = game_id;
  }

  resetMap() {
    this.trains.length = 0;
    this.stations.length = 0;
    Meteor.call('mapReset', this._id);
  }

  draw() {
    console.error('method should be overridded');
  }

  setMessage(msg) {
    this.message.set(msg);
  }

  stationCount() {
    return this.stations.length;
  }

  removeTrain(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i]._id === id) {
        this.trains.splice(i, 1);
        break;
      }
    }
  }

  removeStationFromDb(id) {
    this.removeStationById(id);
    Meteor.call('mapRemoveStation', id);
  }

  // coming from db
  addStation(s) {
    this.stations.push(s);
    this.updateStationsLinks();
  }

  // coming from db
  updateStation(id, doc) {
    const s = this.getStationById(id);
    if(doc.children) s.children = doc.children;
    if(doc.parents) s.parents = doc.parents;
    if(doc.pos) s.pos = doc.pos;
    this.updateStationsLinks();
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
  }

  // update all links
  // when a station JSON is found, replace it with the actual station

  updateStationsLinks() {
    const self = this;
    _.each(this.stations, function(s) {
      s.children = _.compact(_.map(s.children, function(l) {
        if(typeof(l) === 'string') return self.getStationById(l) || l;
        return l;
      }));
      s.parents = _.compact(_.map(s.parents, function(l) {
        if(typeof(l) === 'string') return self.getStationById(l) || l;
        return l;
      }));
    });
  }

  // a map can observe the stations itself
  // but if it is the case, will create simple stations, not StationGui

  removeStationById(id) {
    for(let i = 0; i < this.stations.length; i++) {
      if(this.stations[i]._id === id) {
        this.stations.splice(i, 1);
        break;
      }
    }
  }

  removeStation(station, withoutTrans) {
    if(!withoutTrans) station.addTransChildren();
    station.removeChildren();
    this.removeStationFromDb(station._id);
    this.stations = _.without(this.stations, station);
  }

  removeIsolatedStations() {
    const self = this;
    _.each(this.stations, function(station) {
      if(station.children.length === 0 && station.parents.length === 0) self.removeStationFromDb(station._id);
    });

  }

  getNearestStation(pos, maxdist) {
    const stations = this.getNearestStations(pos, maxdist);
    if(stations.length > 0) return stations[0].station;
    return null;
  }

  getNearestStations(pos, maxdist) {
    const rv = [];
    const len = this.stations.length;
    let d;
    for(let p = 0; p < len; p++) {
      if((d = Geometry.dist(pos, this.stations[p].pos)) <= maxdist)
        rv.push({station: this.stations[p], dist: d});
    }
    return _.sortBy(rv, function(p) {return p.dist;});
  }

  getStationByPos(pos) {
    for(let s = 0; s < this.stations.length; s++) {
      // console.log(pos, this.stations[s].pos);
      if(_.isEqual(this.stations[s].pos, pos)) return {station: this.stations[s], index: s};
    }
    return null;
  }

  getStationById(id) {
    for(let i = 0; i < this.stations.length; i++) {
      if(this.stations[i]._id === id) return this.stations[i];
    }
    return null;
  }

  // coming from db
  addTrain(id, doc) {
    const pos = doc.pos;
    const c = this.getTrainById(id);
    if(c) throw new Error('same train id ?');
    const train = new Train(this, doc, id);
    this.trains.push(train);
    return train;
  }

  updateTrain(id, doc) {
    // console.log('Map#updateTrain', id, doc);
    let train = this.getTrainById(id);
    if(!train) return console.error('updateTrain: no train');
    train.updateFromDB(doc);
  }

  getTrain(pos) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i].pos.x === pos.x && this.trains[i].pos.y === pos.y) return this.trains[i];
    }
    return null;
  }

  getTrainById(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i]._id === id) return this.trains[i];
    }
    return null;
  }

  // FIXME P0: what about bidirectional links ?
  getNearestObject(pos) {
    const dist = this.dispo.linkSize;
    let obj = this.getLinks(pos, dist);
    if(!obj.length) return null;
    return obj[0];
  }

  // return array of all link segments near to pos by dist, sorted by dist
  getLinks(pos, dist) {
    // console.log('GameMap#getLinks', pos, dist);
    const rv = [];
    for(let s = 0; s < this.stations.length; s++) {
      for(let p = 0; p < this.stations[s].children.length; p++) {
        if(typeof(this.stations[s].children[p]) === 'string') continue;
        const rel = Geometry.relPointToSegment(this.stations[s].pos, this.stations[s].children[p].pos, pos);
        if(rel.dist <= dist)
          rv.push({stations: [this.stations[s], this.stations[s].children[p]], rel: rel});
      }
    }
    return _.sortBy(rv, function(e) {return e.rel.dist;});
  }

  // subscribe to map stations and trains
  observeChanges() {
    const self = this;
    Stations.find({game_id: self._id}).observeChanges({
      added: function(id, doc) {
        // console.log('Station added', id, doc.pos);
        self.addStation(new Station(self, doc, id));
      },
      changed: function(id, doc) {
        // console.log('Station changed', id);
        self.updateStation(id, doc);
      },
      removed: function(id) {
        // console.log('Station removed', id);
        self.removeStationById(id);
      }
    });
    Trains.find({game_id: self._id}).observeChanges({
      added: function(id, doc) {
        // console.log('trains: added', id);
        self.addTrain(id, doc);
      },
      changed: function(id, doc) {
        // console.log('trains: changed', id, doc);
        self.updateTrain(id, doc);
      },
      removed: function(id) {
        console.log('trains: removed', id);
        self.removeTrain(id);
      }
    });
  }

}


/*
const getTrain = function(train_id) {
  for(let i = 0; i < trains.length; i++) if(trains[i]._id === train_id) return trains[i];
  return null;
};

const createTrain = function(train_id, doc) {
  // console.log('create train', train_id, doc);
  let train = getTrain(train_id);
  if(train) return train;
  // not found
  train = new ServerTrain(train_id, doc);
  trains.push(train);
  return train;
};

const removeTrain = function(train_id, doc) {
  let train = getTrain(train_id);
  if(!train) return train;
  // found
  for(let i = 0; i < trains.length; i++) if(trains[i]._id === train_id) {
    trains[i].stop();
    trains.splice(i, 1);
    break;
  }
};

*/
