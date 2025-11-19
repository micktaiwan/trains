import {DBObject} from "./dbobject";

export class Station extends DBObject {

  constructor(doc) {
    // console.log('Station constructor', doc);
    super({
      type: 'station',
      game_id: doc.map._id,
      map: doc.map,
      pos: doc.pos,
      children: doc.children || [],
      parents: doc.parents || [], // will copy back all children
    }, doc);
  }

  objToSave() {
    return {
      _id: this._id,
      type: this.type,
      pos: this.pos,
      game_id: this.map._id,
      children: _.map(this.children, function(l) {return l._id;}),
      parents: _.map(this.parents, function(l) {return l._id;}),
    };
  }

  hasChild(station) {
    // console.log(this._id, '=>', _.find(this.children, function(c) { return c._id === station._id}));
    return _.find(this.children, function(c) { return c._id === station._id;});
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

  async removeChildren() {
    const rv = [];
    // console.log('removeChildren', this._id, this.children);
    const self = this;
    for(const point of this.children) {
      self.removeChild(point);
      point.removeChild(self);
      await point.updateDB();
    }
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
  async addTransChildren() {
    const rv = [];
    let i = 0;
    let j = 0;
    // for each parent add all children to it
    const self = this;
    _.each(self.parents, function(p) {
      if(!_.find(rv, function(s) {return s._id === p._id;})) rv.push(p);
      _.each(self.children, function(c) {
        if(c._id === self._id) return;
        if(c._id === p._id) return;
        if(!_.find(rv, function(s) {return s._id === c._id;})) rv.push(c);
        // console.log(p._id, c._id);
        p.addChild(c);
      });
    });
    // console.log(rv);
    for(const station of rv) {
      await station.updateDB();
    }
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

  // Update all trains that reference this station to point to the destination station instead
  async updateTrainsAfterMerge(dest) {
    console.log('Station#updateTrainsAfterMerge: redirecting trains from', this._id, 'to', dest._id);
    const trains = this.map.getTrains();
    let updatedCount = 0;

    for(const train of trains) {
      let needsUpdate = false;
      let needsPathRecalc = false;

      // Update fromStation reference
      if(train.fromStation && train.fromStation._id === this._id) {
        console.log('  Train', train._id, ': updating fromStation');
        train.fromStation = dest;
        train.pos = dest.pos; // Move train to destination station
        needsUpdate = true;
        needsPathRecalc = true; // Need to recalculate path from new position
      }

      // Update destStation reference
      if(train.destStation && train.destStation._id === this._id) {
        console.log('  Train', train._id, ': updating destStation');
        train.destStation = dest;
        needsUpdate = true;
        // Don't need path recalc here - destination just moved, path stays valid
      }

      // Update nextStation reference
      if(train.nextStation && train.nextStation._id === this._id) {
        console.log('  Train', train._id, ': updating nextStation to dest');
        train.nextStation = dest;
        needsUpdate = true;
        needsPathRecalc = true; // Next stop changed, need to recalculate
      }

      // Check if any station in the path was the merged station
      if(train.path && train.path.length > 0) {
        for(const station of train.path) {
          if(station && station._id === this._id) {
            console.log('  Train', train._id, ': station in path was merged, need recalc');
            needsPathRecalc = true;
            break;
          }
        }
      }

      // If the train needs path recalculation, do it properly
      if(needsPathRecalc && train.destStation && train.fromStation) {
        console.log('  Train', train._id, ': recalculating path from', train.fromStation._id, 'to', train.destStation._id);

        // Special case: if we're already at destination (fromStation === destStation)
        if(train.fromStation._id === train.destStation._id) {
          console.log('  Train', train._id, ': already at destination after merge, stopping');
          train.setState(Helpers.TrainStates.STOPPED);
          train.nextStation = null;
          train.path = [];
          train.destStation = null;
        }
        // Special case: if nextStation is now the same as destStation
        else if(train.nextStation && train.nextStation._id === train.destStation._id) {
          console.log('  Train', train._id, ': nextStation === destStation, clearing path');
          train.path = [];
          // Keep nextStation and running state - train will arrive on next update
        }
        else {
          // Normal case: recalculate full path
          train.setPath();
          train.nextStation = train.path.shift();
          console.log('  Train', train._id, ': path recalculated, new path length:', train.path.length);
        }

        needsUpdate = true;
      }

      // Save the updated train to DB
      if(needsUpdate) {
        await train.updateDB();
        updatedCount++;
        console.log('  Train', train._id, 'updated and saved');
      }
    }

    console.log('Station#updateTrainsAfterMerge: updated', updatedCount, 'trains');
    return updatedCount;
  }

  // merge 2 stations
  async mergeStation(dest) {
    console.log('***** MERGE ', this._id, '=>', dest._id);

    // CRITICAL: Update all trains BEFORE removing the station
    await this.updateTrainsAfterMerge(dest);

    // add all links to dest
    for(const c of this.children) {
      if(dest._id === c._id) continue;
      // console.log('***** loop ', dest._id, '=>', c._id);
      dest.addBiChild(c);
      await c.updateDB();
    }
    await dest.updateDB();

    // remove self
    await this.map.removeStation(this, true);
    await this.map.removeIsolatedStations(); // the only case where we merge a isolated segment

    console.log('***** MERGE COMPLETED ', this._id, '=>', dest._id);
  }

  update(clock) {

  }

}
