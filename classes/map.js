/**
 * Created by mfaivremacon on 31/08/2015.
 */
import {Drawing, Geometry} from "./helpers";


export class Point {

  constructor(doc) {
    this.pos = {x: doc.pos.x, y: doc.pos.y};
  }

  toObj() {
    return {
      pos: {x: this.pos.x, y: this.pos.y}
    };
  }

}

// a segment is a set of segments, 2 for a line, 3 or more for a curve
export class Segment {

  constructor(map, doc, id) {
    if(!id) id = Random.id();
    this._id = id;
    this.map = map;
    this.points = _.map(doc.points, function(p) {return new Point(p)});
    // this.type = doc.type;
    //console.log('created Segment', this);
  }

}

// a map is a set of segments belonging to a game_id
export class Map {

  // a map can observe the segments itself
  // but if the case will create simple Segment, not SegmentGui
  // useful for server maps used in serverTrains
  constructor(game_id, observeChanges) {
    console.log('Map#constructor: game_id', game_id, observeChanges);
    this._id = game_id;
    this.segments = [];
    this.trains = [];
    this.stations = [];
    this.currentSegmentSelection = 'Rails';
    this.message = new ReactiveVar('');
    if(observeChanges) this.observeChanges();
  }

  init(game_id) {
    console.log('Map#init: game_id', game_id);
    this._id = game_id;
  }

  setSegmentSelection(segmentName) {
    this.currentSegmentSelection = segmentName;
  }

  resetMap() {
    this.segments.length = 0;
    this.trains.length = 0;
    this.stations.length = 0;
    Meteor.call('mapReset', this._id);
  }

  draw() {
    console.error('method should be overridded');
  }

  segmentCount() {
    return this.segments.length;
  }

  removeSegment(id) {
    //segments
    for(let i = 0; i < this.segments.length; i++) {
      if(this.segments[i]._id === id) {
        this.segments.splice(i, 1);
        break;
      }
    }

    // stations
    for(let i = 0; i < this.stations.length; i++) {
      if(this.stations[i]._id === id) {
        this.stations.splice(i, 1);
        break;
      }
    }

  }

  removeTrain(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i]._id === id) {
        this.trains.splice(i, 1);
        break;
      }
    }
  }

  affectNeighbor(rail, pos, dir, operation) {

    // let newPos, oppDir;
    // switch(dir) {
    //   case N:
    //     newPos = {x: pos.x, y: pos.y - 1};
    //     oppDir = S;
    //     break;
    //   case S:
    //     newPos = {x: pos.x, y: pos.y + 1};
    //     oppDir = N;
    //     break;
    //   case W:
    //     newPos = {x: pos.x - 1, y: pos.y};
    //     oppDir = E;
    //     break;
    //   case E:
    //     newPos = {x: pos.x + 1, y: pos.y};
    //     oppDir = W;
    //     break;
    // }
    //
    // let segment = this.getSegment(newPos);
    // if(segment) {
    //   rail += dir;
    //   if(operation === 'add')
    //     segment.type.rails |= oppDir;
    //   if(operation === 'sub')
    //     segment.type.rails ^= oppDir;
    //   Meteor.call('mapUpdate', segment._id, segment.pos, segment.type, this._id); // Can't call wih simply segment as I have a error
    // }
    return rail;
  }

  affectNeighbors(pos, operation) {
    let rail = 0;
    // rail = this.affectNeighbor(rail, pos, N, operation);
    // rail = this.affectNeighbor(rail, pos, E, operation);
    // rail = this.affectNeighbor(rail, pos, S, operation);
    // rail = this.affectNeighbor(rail, pos, W, operation);
    return rail;
  }

  setMessage(msg) {
    this.message.set(msg);
  }

  saveSegmentToDB(segment) {
    /*
        if(!type) {
          if(this.currentSegmentSelection === 'Rails') {
            let rail = this.affectNeighbors(pos, 'add');
            if(rail === 0) return this.setMessage("<strong>You must place a rail near a station or another rail<strong>");
            this.setMessage("");
            type = {name: 'rail', rails: rail};
          }
          else if(this.currentSegmentSelection === 'Station') {
            type = {name: 'station', station: {team: 'red'}};
            this.setMessage("");
          }
          else throw new Meteor.Error('unknown segment selection ' + this.currentSegmentSelection);
        }
    */
    const obj = {
      _id: segment._id,
      game_id: segment.map._id,
      points: _.map(segment.points, function(p) {return p.toObj()}),
      // type: segment.type
    };
    Meteor.call('mapInsertSegment', obj);
  }

  updateSegmentToDB(segment) {
    const obj = {
      points: _.map(segment.points, function(p) {
        return p.toObj()
      }),
    };
    Meteor.call('mapUpdateSegment', segment._id, obj);
  }


  addTrainToDB(train) {
    console.log('addTrainToDB session', this._id);
    Meteor.call('trainAdd', this._id, train.pos, train.dir);
    return true;
  }

  removeSegmentFromDb(id) {
    let pos = this.getSegmentById(id).pos;
    this.removeSegment(id);
    this.affectNeighbors(pos, 'sub');
    Meteor.call('mapRemove', id);
    return true;
  }

  addSegment(segment) {
    this.segments.push(segment);
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
  }

  // coming from db
  updateSegment(id, doc) {
    const s = this.getSegmentById(id);
    s.points = _.map(doc.points, function(p) {return new Point(p)});
  }

  // get the first point near to pos by dist
  // return {point: p, segment: s} or null
  getPoint(pos, dist) {
    for(let s = 0; s < this.segments.length; s++) {
      for(let p = 0; p < this.segments[s].points.length; p++) {
        if(Geometry.dist(this.segments[s].points[p].pos, pos) <= dist)
          return {point: this.segments[s].points[p], segment: this.segments[s]};
      }
    }
    return null;
  }

  getSegmentById(id) {
    for(let i = 0; i < this.segments.length; i++) {
      if(this.segments[i]._id === id) return this.segments[i];
    }
    return null;
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

  // subscribe to map (or "game") segments
  observeChanges() {
    const self = this;
    Segments.find({game_id: self._id}).observeChanges({
      added: function(id, doc) {
        // console.log('change: added', id, doc);
        self.segments.push(new Segment(self, doc, id));
      },
      removed: function(id) {
        //console.log('change: removed', id);
        self.removeSegment(id);
      }
    });
  }

}