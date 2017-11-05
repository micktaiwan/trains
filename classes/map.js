/**
 * Created by mfaivremacon on 31/08/2015.
 */
import {Geometry} from "./helpers";
import {Path, Point} from "./path";

// a map is a set of paths belonging to a game_id
export class Map {

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

  removeTrain(id) {
    for(let i = 0; i < this.trains.length; i++) {
      if(this.trains[i]._id === id) {
        this.trains.splice(i, 1);
        break;
      }
    }
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

  // coming from db
  addPath(path) {
    this.paths.push(path);
    this.updateLinks();
    // for each game change, also set game status
    if(this.game) this.game.setStatus();
  }

  // coming from db
  updatePath(id, doc) {
    const s = this.getPathById(id);
    s.points = _.map(doc.points, function(p) {return new Point(p, s)});
    this.updateLinks();
    this.draw();
  }

  // update all points links
  // if a point id is found, replace it with the actual point
  // if the point is not found (erased), will remove the point from the links
  updateLinks() {
    // console.log('updateLinks');
    const self = this;
    for(let s = 0; s < this.paths.length; s++) {
      for(let pi = 0; pi < this.paths[s].points.length; pi++) {
        const p = this.paths[s].points[pi];
        p.links = _.compact(_.map(p.links, function(l) {
          if(typeof(l) === 'string') return self.getPointById(l);
          return l;
        }));
        // console.log(p.links.length, p.links);
      }
    }
  }

  // a map can observe the paths itself
  removePath(id) {
    // but if the case will create simple Path, not PathGui
    //paths
    for(let i = 0; i < this.paths.length; i++) {
      if(this.paths[i]._id === id) {
        this.paths.splice(i, 1);
        break;
      }
    }
  }

  // get the first point near to pos by dist
  // return {point: p, path: s} or null
  getPointByPos(pos, dist) {
    for(let s = 0; s < this.paths.length; s++)
      for(let p = 0; p < this.paths[s].points.length; p++)
        if(Geometry.dist(this.paths[s].points[p].pos, pos) <= dist)
          return {point: this.paths[s].points[p], path: this.paths[s]};
    return null;
  }

  getPointById(id) {
    for(let s = 0; s < this.paths.length; s++)
      for(let p = 0; p < this.paths[s].points.length; p++)
        if(this.paths[s].points[p]._id === id) return this.paths[s].points[p];
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
