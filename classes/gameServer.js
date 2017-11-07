import {Game} from "./game";
import {GameMap} from "./map";

// GameServer
// Simply calls game loop
// a map automatically subscribe to its Stations so a game's map with always be up to date
export class GameServer extends Game {

  constructor(id, doc) {
    console.log('GameServer constructor', new Date());
    super((new GameMap(id, true)), doc);

    // launch clock
    const self = this;
    this.clock = new Date().getTime();
    this.clockHandle = Meteor.setInterval(function() {
      self.onTime();
    }, 3000);

  }

  stop() {
    Meteor.clearInterval(this.clockHandle);
  }

  onTime() {
    // console.log('game on time');

    // check trains
    console.log("Trains:", this.map.trains.length);
    if(this.map.trains.length === 0)
      this.addTrain();

    // Trains
    for(let i = 0; i < this.map.trains.length; i++) {
      this.map.trains[i].move();
    }

    // if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});
  }

  canTrainStart() {
    this._canStart.set(Meteor.user() && this.map.stations.length > 0);
    return this._canStart.get();
  }
}
