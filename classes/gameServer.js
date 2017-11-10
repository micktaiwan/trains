import {Game} from "./game";
import {GameMap} from "./map";
import {Helpers} from "./helpers";

// GameServer
// Simply calls game loop
// a map automatically subscribe to its Stations so a game's map with always be up to date
export class GameServer extends Game {

  constructor(doc) {
    // console.log('GameServer#constructor', new Date(), doc);
    super(_.extend({map: (new GameMap(doc._id, true))}, doc));

    // check trains
    // console.log("Trains:", this.map.trains.length);
    if(this.map.getTrains().length === 0) this.addTrain();

    // launch clock
    this.gameStartTimestamp = new Date().getTime();
    this.clock = 0; // the start elapsed since 0
    this.tick = 0; // each game loop count

    this.loop();
  }

  loop() {
    // Clock management
    const currentTime = new Date().getTime();
    const newClock = (currentTime - this.gameStartTimestamp);
    // this.gameTimePassed = Math.round((newClock - this.clock) * Helpers.timeFactor / (1000 * 60)); // game time in minutes
    this.clock = newClock; // the time passed since the server started in ms (5003)
    this.clockTick = (Helpers.serverInterval * this.tick); // the time shall should have passed (5000)
    let offset = this.clock - this.clockTick;
    if(offset > Helpers.serverInterval) offset = Helpers.serverInterval;
    console.log(this.clock, offset, this.clockTick);

    // define a planning: when to update trains, when to add people, when to collect taxes...
    // console.log(this.gameTimePassed);

    // Add persons
    let nb = 0;
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      nb++;
    }
    // console.log(nb);
    // if(this.clockTick/1000 % 60 === 0)
    if(nb < 10)
      this.addPerson();

    // Update all objects
    for(let i = 0; i < this.map.objects.length; i++) {
      this.map.objects[i].update(this.clockTick);
    }

    // if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});

    const self = this;
    Meteor.setTimeout(function() {self.loop();}, Helpers.serverInterval - offset);
    Meteor.call('gameUpdateClock', this._id, this.clock);
    this.tick++;
  }

}
