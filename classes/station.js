export class Station {

  constructor(map, doc, id) {
    this._id = id || Random.id();
    this.map = map;
    // this.path = path;
    this.pos = doc.pos;
    this.children = doc.children || [];
    this.parents = doc.parents || []; // will copy back all children
    // console.log('Station constructor', this);
  }

  toObj() {
    return {
      _id: this._id,
      pos: this.pos,
      game_id: this.map._id,
      children: _.map(this.children, function(l) {return l._id}),
      parents: _.map(this.parents, function(l) {return l._id})
    };
  }

  // add unidirectional child to a point
  addChild(point) {
    // console.log('addChild', this._id, point._id);
    this.children.push(point);
    point.parents.push(this);
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
    // console.log('addBiChild', this._id, point._id);
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

  saveToDB() {
    Meteor.call('mapInsertStation', this.toObj());
  }

  updateDB() {
    Meteor.call('mapUpdateStation', this._id, this.toObj());
  }

}

// a path is a set of childed points
export class Path {

  constructor(map, doc, id) {
    if(!id) id = Random.id();
    this._id = id;
    this.map = map;
    this.stations = [];
    const self = this;
    if(doc && doc.stations) this.stations = _.map(doc.stations, function(p) {return new Station(this.map, p)});
    // console.log('Path points:', this.stations);
    // this.type = doc.type;
    //console.log('created Path', this);
  }


}
