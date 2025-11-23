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

    // Restore game time from database if available (server restart scenario)
    const now = new Date().getTime();
    if(doc.clock && doc.clock > 0) {
      // Existing game - calculate gameStartTimestamp from saved clock
      this.gameStartTimestamp = now - doc.clock;
      this.clock = doc.clock; // Restore saved clock value

      // Calculate tick based on restored clock to avoid "catching up" after reload
      // This prevents the server from trying to run 40+ ticks rapidly to compensate
      this.tick = Math.floor(doc.clock / Helpers.serverInterval);

      console.log(`GameServer: Restored game time from DB (clock: ${Math.round(doc.clock/1000)}s, tick: ${this.tick}, duration: ${Math.round(doc.clock/60000)}m)`);
    } else {
      // New game - start from zero
      this.gameStartTimestamp = now;
      this.clock = 0;
      this.tick = 0;
      console.log('GameServer: Starting new game from time 0');
    }

    this.isRunning = false; // track if the game loop is active

    // Restore passenger spawn accumulator from DB if available
    this.passengerSpawnAccumulator = doc.passengerSpawnAccumulator || 0;

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

    // Check for reset flag at every tick (high priority)
    const gameDoc = await Games.findOneAsync(this._id);
    if(gameDoc && gameDoc.resetRequested) {
      console.log(`[RESET] Immediate reset detected for game ${this._id}`);
      // Reset game time immediately
      this.gameStartTimestamp = new Date().getTime();
      this.clock = 0;
      this.passengerSpawnAccumulator = 0;
      this.tick = 0;
      // Clear the reset flag
      await Games.updateAsync(this._id, {$unset: {resetRequested: 1}});
      console.log(`[RESET] Game time reset to 0, spawn accumulator cleared`);

      // Immediately schedule next loop iteration and return
      // This avoids incorrect "loop too long" warnings from timing calculations
      const self = this;
      Meteor.setTimeout(function() {self.loop();}, Helpers.serverInterval);
      return;
    }

    // Legacy fallback: Detect external clock reset for backward compatibility
    // Check every 10 ticks to avoid excessive DB reads
    if(this.tick % 10 === 0 && gameDoc) {
      if(gameDoc.clock !== undefined) {
        const calculatedClock = new Date().getTime() - this.gameStartTimestamp;
        // If DB clock is much smaller than calculated clock, it was probably reset
        if(gameDoc.clock < calculatedClock - 5000) { // More than 5 seconds difference
          console.log(`GameServer: Detected external clock reset (DB: ${Math.round(gameDoc.clock/1000)}s, Calculated: ${Math.round(calculatedClock/1000)}s)`);
          // Recalculate gameStartTimestamp to match DB clock
          this.gameStartTimestamp = new Date().getTime() - gameDoc.clock;
          this.clock = gameDoc.clock;
          this.passengerSpawnAccumulator = gameDoc.passengerSpawnAccumulator || 0;
          console.log(`GameServer: Reset to time ${Math.round(this.clock/60000)}m with spawn accumulator ${this.passengerSpawnAccumulator.toFixed(2)}`);
        }
      }
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
    // Auto-add train if none exist (requires at least one station)
    const trainCount = this.map.getTrains().length;
    const stationCount = this.map.getStations().length;
    if(trainCount === 0 && stationCount > 0) {
      await this.addTrain();
    }

    // define a planning: when to update trains, when to add people, when to collect taxes...
    // console.log(this.gameTimePassed);

    // Add persons
    const nbPersons = this.map.getPersons().length;

    // Calculate spawn rate based on game duration (minutes)
    const gameDurationMinutes = this.clock / (1000 * 60);
    let currentRate = 0;

    // Find applicable rate from schedule
    let currentScheduleIndex = 0;
    for(let i = 0; i < Helpers.spawnRateSchedule.length; i++) {
      const schedule = Helpers.spawnRateSchedule[i];
      if(gameDurationMinutes >= schedule.time) {
        currentRate = schedule.rate;
        currentScheduleIndex = i;
      } else {
        break;
      }
    }

    // Debugging: Ensure rate is not zero if schedule is missing or time is negative
    if (currentRate === 0 && Helpers.spawnRateSchedule.length > 0) {
        currentRate = Helpers.spawnRateSchedule[0].rate;
    }

    // Generate phase description for UI display
    let spawnPhaseDescription = '';
    const currentPhase = Helpers.spawnRateSchedule[currentScheduleIndex];
    if(currentPhase) {
      const nextPhase = Helpers.spawnRateSchedule[currentScheduleIndex + 1];
      if(nextPhase) {
        spawnPhaseDescription = `${currentPhase.time}-${nextPhase.time} min`;
      } else {
        spawnPhaseDescription = `${currentPhase.time}+ min`;
      }
    }

    // Don't spawn passengers during the first 2 seconds after start/reset
    // This gives time for cities to sync from the database
    if(this.clock < 2000) {
      if(this.tick % 10 === 0) {
        console.log(`[SPAWN] Waiting for game initialization (${Math.round(this.clock)}ms / 2000ms)`);
      }
    } else {
      // Calculate passengers to spawn this tick
      // rate is per minute, tick is usually 1000ms (1s)
      // passengers = (rate / 60) * (tickInterval / 1000)
      const tickSeconds = Helpers.serverInterval / 1000;
      const passengersToSpawn = (currentRate / 60) * tickSeconds;

      this.passengerSpawnAccumulator += passengersToSpawn;

      // Spawn accumulated passengers (integer amount)
      if(nbPersons < Helpers.maxPersons && this.passengerSpawnAccumulator >= 1) {
        const count = Math.floor(this.passengerSpawnAccumulator);
        this.passengerSpawnAccumulator -= count;

        for(let k=0; k<count; k++) {
          // Re-check limit inside loop
          if(this.map.getPersons().length < Helpers.maxPersons) {
            await this.addPerson();
          }
        }
      }
    }

    // Update all objects
    for(let i = 0; i < this.map.objects.length; i++) {
      await this.map.objects[i].update(this.clockTick);
    }

    // if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});

    const self = this;
    Meteor.setTimeout(function() {self.loop();}, nextDelay);
    await Meteor.callAsync('gameUpdateClock', this._id, this.clock, {
      gameDurationMinutes: Math.round(gameDurationMinutes * 10) / 10, // Round to 1 decimal
      currentSpawnRate: currentRate,
      spawnPhaseDescription: spawnPhaseDescription,
      passengerSpawnAccumulator: this.passengerSpawnAccumulator
    });
    this.tick++;
  }

}
