import {Train} from '../classes/train';
import {Map} from '../classes/map';
import {Helpers} from '../classes/helpers';

// a server train is a train with a map
// a map automatically subscribe to its paths so a train's map with always be up to date
export class ServerTrain extends Train {

  constructor(train_id, trainObj) {
    console.log('ServerTrain constructor', trainObj);
    super(new Map(trainObj.game_id, true), trainObj, train_id);
    this.interval = Helpers.moveInterval;
    const self = this;
    this.timerHandle = Meteor.setInterval(function() {
      ServerTrain.onTime(self);
    }, Helpers.moveInterval);
  }

  static onTime(train) {
    // console.log('onTime', that.map._id, that.pos, that.dir, that.map.stationCount());
    if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});
  }

  stop() {
    Meteor.clearInterval(this.timerHandle);
  }

}
