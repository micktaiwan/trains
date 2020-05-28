// Base class for GameGui and GameServer
import {DBObject} from "./dbobject";
import {Helpers} from "./helpers";

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
    const station = MapObjects.findOne({type: 'station'});
    if(station)
      Meteor.call('mapInsert', {_id: Random.id(), type: 'train', game_id: this.map._id, pos: station.pos});
  }

  // add a person to the map
  addPerson(width) {
    // if(width > 1200) width = 1200;
    for(var i = 0; i < 10; i++) {
      const x = _.random(100, 100 + 10 * 2000 / Helpers.pixelMeter);
      const y = _.random(100, 100 + 10 * 2000 / Helpers.pixelMeter);
      Meteor.call('mapInsert', {_id: Random.id(), type: 'person', game_id: this.map._id, pos: {x: x, y: y}});
    }
  }

}
