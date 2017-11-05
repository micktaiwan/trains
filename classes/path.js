import {Geometry} from "./helpers";

export class Point {

  constructor(doc, path, id) {
    this._id = doc._id || Random.id();
    this.path = path;
    this.pos = doc.pos;
    this.links = doc.links || [];
  }

  toObj() {
    return {_id: this._id, pos: this.pos, links: _.map(this.links, function(l) {return l._id})};
  }

  updateDB(doc) {
    if(doc && doc.pos) this.pos = doc.pos;
    this.path.updateDB();
  }

  // add unidirectional link to a point
  addLink(point) {
    // console.log('addLink', this._id, point._id);
    this.links.push(point);
  }

  removeLink(point) {
    // console.log('removeLink', this._id, point._id, _.pluck(this.links, ['_id']));
    this.links = _.without(this.links, point);
    // console.log('result', _.pluck(this.links, ['_id']));
  }

  // add a link and back to self
  addBiLink(point) {
    // console.log('addBiLink', this._id, point._id);
    this.addLink(point);
    point.addLink(this);
  }

  removeBiLink(point) {
    // console.log('removeBiLink', this._id, point._id);
    this.removeLink(point);
    point.removeLink(this);
  }

  getLinkIndex(pointId) {
    for(let l = 0; l < this.links.length; l++) {
      if(this.links[l]._id === pointId) return l;
    }
    return null;
  }

}

// a path is a set of linked points
export class Path {

  constructor(map, doc, id) {
    if(!id) id = Random.id();
    this._id = id;
    this.map = map;
    this.points = [];
    const self = this;
    if(doc && doc.points) this.points = _.map(doc.points, function(p) {return new Point(p, self)});
    // console.log('Path points:', this.points);
    // this.type = doc.type;
    //console.log('created Path', this);
  }

  saveToDB(callback) {
    const obj = {
      _id: this._id,
      game_id: this.map._id,
      points: _.map(this.points, function(p) {return p.toObj()}),
    };
    Meteor.call('mapInsertPath', obj, function(err, rv) {
      if(callback) callback(err, rv);
    });
  }

  updateDB() {
    const obj = {points: _.map(this.points, function(p) {return p.toObj()})};
    Meteor.call('mapUpdatePath', this._id, obj);
  }

  // add a point at a given index
  addMiddlePoint(pos, afterPos) {
    let index = 0;
    if(afterPos) index = this.getPointFromPos(afterPos).index + 1;

    // remove links between previous and after points
    if(index > 0 && index < this.points.length)
      this.points[index - 1].removeBiLink(this.points[index]);

    // add new point
    this.points.splice(index, 0, (new Point({pos: pos}, this)));
    // console.log('#' + Helpers.objectId(this.points[index]), 'links:', this.points[index].links);

    // add links
    if(index < this.points.length - 1)
      this.points[index].addBiLink(this.points[index + 1]);
    if(index > 0)
      this.points[index].addBiLink(this.points[index - 1]);

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
