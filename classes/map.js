/**
 * Created by mfaivremacon on 31/08/2015.
 */
import {Geometry} from "./helpers";


export class Point {

  constructor(doc, path) {
    if(!path) throw new Error();
    this.path = path;
    this.pos = doc.pos;
  }

  toObj() {
    return {
      pos: this.pos
    };
  }

  updateDB(doc) {
    if(doc && doc.pos) this.pos = doc.pos;
    this.path.updateDB();
  }

}

// a path is a set of points, 2 for a line, 3 or more for a curve
export class Path {

  constructor(map, doc, id) {
    if(!id) id = Random.id();
    this._id = id;
    this.map = map;
    this.points = [];
    const self = this;
    if(doc && doc.points) this.points = _.map(doc.points, function(p) {return new Point(p, self)});
    // this.type = doc.type;
    //console.log('created Path', this);
  }

  saveToDB(callback) {
    /*
        if(!type) {
          if(this.currentPathSelection === 'Rails') {
            let rail = this.affectNeighbors(pos, 'add');
            if(rail === 0) return this.setMessage("<strong>You must place a rail near a station or another rail<strong>");
            this.setMessage("");
            type = {name: 'rail', rails: rail};
          }
          else if(this.currentPathSelection === 'Station') {
            type = {name: 'station', station: {team: 'red'}};
            this.setMessage("");
          }
          else throw new Meteor.Error('unknown path selection ' + this.currentPathSelection);
        }
    */
    const obj = {
      _id: this._id,
      game_id: this.map._id,
      points: _.map(this.points, function(p) {return p.toObj()}),
      // type: path.type
    };
    Meteor.call('mapInsertPath', obj, function(err, rv) {
      if(callback) callback(err, rv);
    });
  }

  updateDB() {
    const obj = {points: _.map(this.points, function(p) {return p.toObj()})};
    Meteor.call('mapUpdatePath', this._id, obj);
  }

  addPoint(pos, afterPos) {
    let index = 0;
    if(afterPos) index = this.getPointFromPos(afterPos).index + 1;
    this.points.splice(index, 0, new Point({pos: pos}, this));
    this.updateDB();
    return this.points[index];
  }

  getPointFromPos(pos) {
    for(let p = 0; p < this.points.length; p++) {
      if(_.isEqual(this.points[p].pos, pos)) return {point: this.points[p], index: p};
    }
    return null;
  }

  getNearestPoint(pos, maxdist) {
    const rv = [];
    const len = this.points.length;
    let d;
    for(let p = 0; p < len; p++) {
      if(d = Geometry.dist(pos, this.points[p].pos) <= maxdist)
        rv.push({point: this.points[p], dist: d});
    }
    if(rv.length === 0) return null;
    return _.sortBy(rv, function(p) {return p.dist;})[0].point;
  }

  removePoint(pos) {
    const obj = this.getPointFromPos(pos);
    if(obj) this.points.splice(obj.index, 1);
  }


}

// a map is a set of paths belonging to a game_id
export class Map {

  // a map can observe the paths itself
  // but if the case will create simple Path, not PathGui
  // useful for server maps used in serverTrains
  constructor(game_id, observeChanges) {
    console.log('Map#constructor: game_id', game_id, observeChanges);
    this._id = game_id;
    this.paths = [];
    this.trains = [];
    this.stations = [];
    this.currentPathSelection = 'Rails';
    this.message = new ReactiveVar('');
    if(observeChanges) this.observeChanges();
  }

  init(game_id) {
    console.log('Map#init: game_id', game_id);
    this._id = game_id;
  }

  setPathSelection(pathName) {
    this.currentPathSelection = pathName;
  }

  resetMap() {
    this.paths.length = 0;
    this.trains.length = 0;
    this.stations.length = 0;
    Meteor.call('mapReset', this._id);
  }

  draw() {
    console.error('method should be overridded');
  }

  pathCount() {
    return this.paths.length;
  }

  removePath(id) {
    //paths
    for(let i = 0; i < this.paths.length; i++) {
      if(this.paths[i]._id === id) {
        this.paths.splice(i, 1);
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
    // let path = this.getPath(newPos);
    // if(path) {
    //   rail += dir;
    //   if(operation === 'add')
    //     path.type.rails |= oppDir;
    //   if(operation === 'sub')
    //     path.type.rails ^= oppDir;
    //   Meteor.call('mapUpdate', path._id, path.pos, path.type, this._id); // Can't call wih simply path as I have a error
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

  addTrainToDB(train) {
    console.log('addTrainToDB session', this._id);
    Meteor.call('trainAdd', this._id, train.pos, train.dir);
    return true;
  }

  removePathFromDb(id) {
    this.removePath(id);
    Meteor.call('mapRemove', id);
    return true;
  }

  addPath(path) {
    this.paths.push(path);
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
  }

  // coming from db
  updatePath(id, doc) {
    const s = this.getPathById(id);
    s.points = _.map(doc.points, function(p) {return new Point(p, s)});
  }

  // get the first point near to pos by dist
  // return {point: p, path: s} or null
  getPoint(pos, dist) {
    for(let s = 0; s < this.paths.length; s++) {
      for(let p = 0; p < this.paths[s].points.length; p++) {
        if(Geometry.dist(this.paths[s].points[p].pos, pos) <= dist)
          return {point: this.paths[s].points[p], path: this.paths[s]};
      }
    }
    return null;
  }

  getPathById(id) {
    for(let i = 0; i < this.paths.length; i++) {
      if(this.paths[i]._id === id) return this.paths[i];
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

  // subscribe to map (or "game") paths
  observeChanges() {
    const self = this;
    Paths.find({game_id: self._id}).observeChanges({
      added: function(id, doc) {
        // console.log('change: added', id, doc);
        self.paths.push(new Path(self, doc, id));
      },
      removed: function(id) {
        //console.log('change: removed', id);
        self.removePath(id);
      }
    });
  }

  getNearestObject(pos) {
    const dist = this.displayOptions.pathSize;
    let obj = this.getPaths(pos, dist);
    if(!obj.length) return null;
    return obj[0];
  }

  // return array of all paths near to pos by dist, sorted by dist
  getPaths(pos, dist) {
    const rv = [];
    for(let s = 0; s < this.paths.length; s++) {
      const len = this.paths[s].points.length;
      if(len === 0) continue;
      else if(len === 1) {
        const p = this.paths[s].points[0].pos;
        const rel = Geometry.relPointToPath(p, p, pos);
        if(rel.dist <= dist)
          rv.push({path: this.paths[s], rel: rel});
      }
      else {
        for(let p = 0; p < len - 1; p++) {
          const rel = Geometry.relPointToPath(this.paths[s].points[p].pos, this.paths[s].points[p + 1].pos, pos);
          if(rel.dist <= dist)
            rv.push({path: this.paths[s], rel: rel});
        }
      }
    }
    return _.sortBy(rv, function(e) {return e.rel.dist;});
  }

}
