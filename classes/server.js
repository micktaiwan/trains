import {Game} from "./game";
import {GameMap} from "./map";

// GameServer
// Simply calls game loop
// a map automatically subscribe to its Stations so a game's map with always be up to date
export class GameServer extends Game {

  constructor(id, doc) {
    console.log('GameServer constructor', new Date());
    super((new GameMap(id, true)), doc);
    /*
        super(new GameMap(trainObj.game_id, true), trainObj, train_id);
        this.interval = Helpers.moveInterval;
        const self = this;
        this.timerHandle = Meteor.setInterval(function() {
          ServerTrain.onTime(self);
        }, Helpers.moveInterval);
    */
  }

  stop() {
    Meteor.clearInterval(this.timerHandle);
  }

}
