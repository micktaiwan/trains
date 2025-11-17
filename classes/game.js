// Base class for GameGui and GameServer
import {DBObject} from "./dbobject";
import {Helpers, Geometry} from "./helpers";
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
  async addTrain() {
    // FIXME P1: should pick a station near a city
    const station = await MapObjects.findOneAsync({type: 'station'});
    if(station)
      await Meteor.callAsync('mapInsert', {type: 'train', game_id: this.map._id, pos: station.pos});
  }

  // add a person to the map
  async addPerson() {
    // Get existing cities
    let cities = this.map.getCities();

    // If no cities exist, create a default city at center of map
    if(cities.length === 0) {
      await Meteor.callAsync('mapInsert', {
        type: 'city',
        game_id: this.map._id,
        name: 'Default City',
        pos: {x: 500, y: 500},
        population: 3000,
        radius: Helpers.cityRadius,
        size: 10,
        color: '#fa0'
      });
      // Wait a bit for the city to be added to the local map
      await new Promise(resolve => Meteor.setTimeout(resolve, 100));
      cities = this.map.getCities();
    }

    // Spawn persons near cities
    for(let i = 0; i < 1; i++) {
      // Pick a random city (uniform distribution)
      const spawnCity = cities[_.random(0, cities.length - 1)];

      // Pick a different destination city
      let destinationCity = null;
      if(cities.length > 1) {
        const availableDestinations = cities.filter(c => c._id !== spawnCity._id);
        destinationCity = availableDestinations[_.random(0, availableDestinations.length - 1)];
      }

      // Generate random position within city radius
      const spawnPos = Geometry.randomPosInCircle(spawnCity.pos, spawnCity.radius);

      const person = new Person({
        map: this.map,
        game_id: this.map._id
      });
      person.birthAt = spawnPos;
      person.birthDate = new Date(); // Age could affect skills...
      person.name = 'John Doe'; // to be randomized
      person.destinationCity = destinationCity;
      person.destinationCityId = destinationCity ? destinationCity._id : null;
      person.pos = person.birthAt;
      await person.saveToDB();
    }
  }

}
