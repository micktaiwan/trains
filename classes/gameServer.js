import {Game} from "./game";
import {GameMap} from "./map";
import {Helpers} from "./helpers";

// GameServer
// Simply calls game loop
// a map automatically subscribe to its Stations so a game's map will always be up to date
export class GameServer extends Game {

  constructor(doc) {
    console.log('GameServer#constructor', new Date(), doc);
    super(_.extend({map: (new GameMap(doc._id, true))}, doc));

    // launch clock
    this.gameStartTimestamp = new Date().getTime();
    this.clock = 0; // the start elapsed since 0
    this.tick = 0; // each game loop count

    this.loop();
  }

  loop() {
    // Clock management
    const currentTime = new Date().getTime();
    const newClock = currentTime - this.gameStartTimestamp;
    // this.gameTimePassed = Math.round((newClock - this.clock) * Helpers.timeFactor / (1000 * 60)); // game time in minutes
    this.clock = newClock; // the passed time since the server started in ms (5003)
    this.clockTick = (Helpers.serverInterval * this.tick); // the time that should have passed (5000)
    let offset = this.clock - this.clockTick;
    if(offset > 200) console.error('loop too long:', offset, 'ms');
    if(offset > Helpers.serverInterval) offset = Helpers.serverInterval;
    let nextDelay = Helpers.serverInterval - offset;
    if(nextDelay < 100) nextDelay = 100; // let the server breathe

    // check trains
    // console.log("Trains:", this.map.trains.length);
    if(this.map.getTrains().length === 0) this.addTrain();

    // define a planning: when to update trains, when to add people, when to collect taxes...
    // console.log(this.gameTimePassed);

    // Add persons
    const nbPersons = this.map.getPersons().length;
    // console.log(nbPersons);
    // if(this.clockTick/1000 % 60 === 0)
    if(nbPersons < 100)
      this.addPerson();

    // Update all objects
    for(let i = 0; i < this.map.objects.length; i++) {
      this.map.objects[i].update(this.clockTick);
    }

    // if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});

    const self = this;
    Meteor.setTimeout(function() {self.loop();}, nextDelay);
    Meteor.call('gameUpdateClock', this._id, this.clock);
    this.tick++;
  }

}
