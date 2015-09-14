/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";

class Game {
  constructor(map) {
    this.map = map;
    map.setGame(this);
    this._canStart = new ReactiveVar(false);
    this.gameStatus = new ReactiveVar('');
    this.setStatus();
  }

  canTrainStart() {
    this._canStart.set(Meteor.user() && this.map.stations.length > 0);
    return this._canStart.get();
  }

  canModifyMap() {
    return Meteor.user();
  }

  hasJoined() {
    return false;
    var u = Meteor.user();
    return u;
  }

  setStatus() {
    let status = '';
    if(!Meteor.user()) status = 'You must be loggued to play<br/>';
    else {
      if(this.map.stations.length === 0) status = 'You should place your first station<br/>';
      else if(this.map.tiles.length < 3) status = 'You should build more rails<br/>';
    }
    if(status === '') status = 'Ready<br/>';
    this.gameStatus.set(status);
  }
}

Meteor.startup(function() {

  TrainsApp.Game = Game;

});
