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
    const station = await MapObjects.findOneAsync({
      type: 'station',
      game_id: this.map._id
    });

    if(!station) {
      console.warn('[TRAIN] Cannot add train: no stations exist in game', this.map._id);
      return null;
    }

    console.log('[TRAIN] Adding train at station', station._id, 'pos:', station.pos);
    const trainId = await Meteor.callAsync('mapInsert', {
      type: 'train',
      game_id: this.map._id,
      pos: station.pos
    });

    console.log('[TRAIN] Train successfully added with id:', trainId);
    return trainId;
  }

  // add a person to the map
  async addPerson() {
    // Get existing cities
    const cities = this.map.getCities();

    // If no cities exist, abort passenger spawn
    // Cities should be created from template during game initialization/reset
    if(cities.length === 0) {
      console.warn('[SPAWN] Cannot spawn passenger: no cities available. Waiting for cities to sync from database.');
      return;
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
      } else {
        // Single city case: allow spawning but without a specific destination yet
        // They will wander until a new city appears
        // console.log('Spawning person in single city scenario (no destination)');
      }

      if (!destinationCity && cities.length > 1) {
         console.warn('Failed to pick destination city despite multiple cities existing');
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
      // NEW: Initialize state machine properties
      person.state = Helpers.PersonStates.AT_CITY;
      person.currentLocation = spawnCity._id;
      await person.saveToDB();
      // console.log(`Spawned person at ${spawnCity.name} -> ${destinationCity ? destinationCity.name : 'None'}`);
    }
  }

}
