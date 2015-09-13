/**
 * Created by mfaivremacon on 01/09/2015.
 */
"use strict";

class Game {
  constructor(map) {
    this.map = map;
  }

  canStart() {
    return true;
    //return this.map.stations.length > 0;
  }

  getStatus() {
    let status = 'Ready';
    if(!Meteor.user()) status = "You must be loggued to play";
    Session.set('gameStatus', status); // for reactivity
    return status;
  }
}

Meteor.startup(function() {

  TrainsApp.Game = Game;

});
