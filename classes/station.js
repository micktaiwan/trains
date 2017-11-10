import {DBObject} from "./dbobject";

export class Station extends DBObject {

  constructor(doc) {
    console.log('Station constructor', doc);
    super({
      type: 'station',
      game_id: doc.map._id,
      map: doc.map,
      pos: doc.pos,
      children: doc.children || [],
      parents: doc.parents || [] // will copy back all children
    }, doc);
  }

  objToSave() {
    return {
      _id: this._id,
      type: this.type,
      pos: this.pos,
      game_id: this.map._id,
      children: _.map(this.children, function(l) {return l._id}),
      parents: _.map(this.parents, function(l) {return l._id})
    };
  }

  hasChild(station) {
    // console.log(this._id, '=>', _.find(this.children, function(c) { return c._id === station._id}));
    return _.find(this.children, function(c) { return c._id === station._id});
  }

  // add unidirectional child to a point
  addChild(station) {
    // console.log('addChild', this._id, '=>', station._id);
    if(!this.hasChild(station)) {
      this.children.push(station);
      station.parents.push(this);
    }
  }

  removeChild(station) {
    // console.log('removeChild', this._id, point._id, _.pluck(this.children, ['_id']));
    this.children = _.without(this.children, station);
    station.parents = _.without(station.parents, this);
  }

  removeChildren() {
    const rv = [];
    // console.log('removeChildren', this._id, this.children);
    const self = this;
    _.each(this.children, function(point) {
      self.removeChild(point);
      point.removeChild(self);
      point.updateDB();
    });
  }

  removeParent(station) {
    // console.log('removeParent', this._id, point._id, _.pluck(this.parents, ['_id']));
    this.parents = _.without(this.parents, station);
    station.children = _.without(station.children, this);
  }

  // add a child and back to self
  addBiChild(childStation) {
    // console.log('addBiChild', this._id, '=>', childStation._id);
    this.addChild(childStation);
    childStation.addChild(this);
  }

  removeBiChild(point) {
    // console.log('removeBiChild', this._id, point._id);
    this.removeChild(point);
    point.removeChild(this);
  }

  // will add all transitive children where this child 'q' is in between
  // a => q => b will add a => b
  // return a list of updated stations
  addTransChildren() {
    const rv = [];
    let i = j = 0;
    // for each parent add all children to it
    const self = this;
    _.each(self.parents, function(p) {
      if(!_.find(rv, function(s) {return s._id === p._id})) rv.push(p);
      _.each(self.children, function(c) {
        if(c._id === self._id) return;
        if(c._id === p._id) return;
        if(!_.find(rv, function(s) {return s._id === c._id})) rv.push(c);
        // console.log(p._id, c._id);
        p.addChild(c);
      });
    });
    // console.log(rv);
    _.each(rv, function(station) {
      station.updateDB();
    });
    return rv;
  }

  getChildIndex(pointId) {
    for(let l = 0; l < this.children.length; l++) {
      if(this.children[l]._id === pointId) return l;
    }
    return null;
  }

  updateFromDB(doc) {
    // console.log('station!', doc, obj);
    if(doc.children) this.children = doc.children;
    if(doc.parents) this.parents = doc.parents;
    if(doc.pos) this.pos = doc.pos;
    this.map.updateStationsLinks();
  }

  // merge 2 stations
  mergeStation(dest) {
    // console.log('***** MERGE ', this._id, '=>', dest._id);
    // add all links to dest
    _.each(this.children, function(c) {
      if(dest._id === c._id) return;
      // console.log('***** loop ', dest._id, '=>', c._id);
      dest.addBiChild(c);
      c.updateDB();
    });
    dest.updateDB();
    // remove self
    this.map.removeStation(this, true);
    this.map.removeIsolatedStations(); // the only case where we merge a isolated segment
  }

  update(clock) {

  }

}
