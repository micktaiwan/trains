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
    this.isRunning = false; // track if the game loop is active

    // Don't start the loop here - it will be started after async initialization
  }

  // Initialize the game server asynchronously
  static async create(doc) {
    const gameServer = new GameServer(doc);
    await gameServer.map.initAsync();
    console.log('GameServer created and initialized with', gameServer.map.objects.length, 'objects');
    gameServer.isRunning = true;
    gameServer.loop();
    return gameServer;
  }

  // Stop the game loop
  stop() {
    console.log('GameServer#stop', this._id, this.name);
    this.isRunning = false;
  }

  async loop() {
    // Check if the game should continue running
    if (!this.isRunning) {
      console.log('GameServer#loop stopped for game', this._id);
      return;
    }

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
    if(this.map.getTrains().length === 0) await this.addTrain();

    // define a planning: when to update trains, when to add people, when to collect taxes...
    // console.log(this.gameTimePassed);

    // Add persons
    const nbPersons = this.map.getPersons().length;
    // console.log(nbPersons);
    // if(this.clockTick/1000 % 60 === 0)
    if(nbPersons < Helpers.maxPersons)
      await this.addPerson();

    // Update all objects
    for(let i = 0; i < this.map.objects.length; i++) {
      await this.map.objects[i].update(this.clockTick);
    }

    // if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});

    const self = this;
    Meteor.setTimeout(function() {self.loop();}, nextDelay);
    await Meteor.callAsync('gameUpdateClock', this._id, this.clock);
    this.tick++;
  }

}
