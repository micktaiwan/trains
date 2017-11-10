// Base class for GameGui and GameServer
import {DBObject} from "./dbobject";

export class Game extends DBObject {

  constructor(doc) {
    super({
      _id: null,
      type: 'game',
      map: null
    }, doc);
    this._canStart = new ReactiveVar(false);
    this._canModifyMap = false;
    this._canModifyMapDep = new Tracker.Dependency();
    this.gameStatus = new ReactiveVar('');
  }

  // add a train to the map
  addTrain() {
    // FIXME P1: should pick a station near a city
    Meteor.call('mapInsert', {_id: Random.id(), type: 'train', game_id: this.map._id, pos: {x: 1, y: 1}});
  }

  // add a person to the map
  addPerson() {
    Meteor.call('mapInsert', {_id: Random.id(), type: 'person', game_id: this.map._id, pos: {x: _.random(30,400), y: _.random(30,400)}});
  }

}
