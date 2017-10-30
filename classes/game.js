/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";

export class Game {
  constructor(map) {
    this.map = map;
    map.setGame(this);
    this._canStart = new ReactiveVar(false);
    this._canModifyMap = false;
    this._canModifyMapDep = new Tracker.Dependency();
    this.gameStatus = new ReactiveVar('');
    this.setStatus();
  }

  canTrainStart() {
    this._canStart.set(Meteor.user() && this.map.stations.length > 0);
    return this._canStart.get();
  }

  canModifyMap() {
    const uid = Meteor.userId();
    let rv = false;
    if(uid && this.map && this.map._id) {
      const game = Games.findOne(this.map._id);
      rv = game && game.players && game.players.some(function(m) {
        return m._id === uid
      });
    }

    if(this._canModifyMap !== rv) {
      console.log('canModifyMap changed to', rv);
      this._canModifyMap = rv;
      this._canModifyMapDep.changed();
    }
    return rv;
  }

  setStatus() {
    let status = '';
    if(!Meteor.user()) status = 'You must be loggued to play<br/>';
    else {
      if(!this.canModifyMap()) status = 'You can not modify this map';
      if(this.map.stations.length === 0) status = 'You should place your first station<br/>';
      else if(this.map.tiles.length < 3) status = 'You should build more rails<br/>';
    }
    if(status === '') status = 'Ready<br/>';
    this.gameStatus.set(status);
  }
}
