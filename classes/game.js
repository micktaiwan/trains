// Base class for GameGui and GameServer
import {DBObject} from "./dbobject";
import {Helpers} from "./helpers";
import {Person} from "./person.js";

export class Game extends DBObject {

  constructor(doc) {
    super({
      _id: null,
      type: 'game',
      map: null,
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
      Meteor.call('mapInsert', {type: 'train', game_id: this.map._id, pos: station.pos});
  }

  // add a person to the map
  addPerson() {
    const person = new Person({map: this.map});
    // game_id: this.map._id,
    for(let i = 0; i < 10; i++) {
      person.birthAt = {x: _.random(0, 1000), y: _.random(0, 1000)};
      person.birthDate = new Date; // L'age pourrait jouer sur les compétences...
      person.name = 'John Doe'; // à randomizer
      person.to = {x: _.random(0, 1000), y: _.random(0, 1000)};
      person.pos = person.birthAt;
      person.saveToDB();
    }
  }

}
