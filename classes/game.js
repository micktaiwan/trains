// Base class for GameGui and GameServer
export class Game {

  constructor(map, doc) {
    this.map = map;
    this._canStart = new ReactiveVar(false);
    this._canModifyMap = false;
    this._canModifyMapDep = new Tracker.Dependency();
    this.gameStatus = new ReactiveVar('');
  }

  // add a train to the map
  addTrain() {
    // FIXME P1: should pick a station near a city
    Meteor.call('trainAdd', {_id: Random.id(), game_id: this.map._id, pos: {x: 1, y: 1}});
  }

}
