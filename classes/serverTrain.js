import {Train} from '../classes/train';
import {Map} from '../classes/map';

const Interval = 1000;

// a server train is a train with a map
// a map automatically subscribe to its tiles so a train's map with always be up to date
export class ServerTrain extends Train {

  constructor(train_id, trainObj) {
    console.log('ServerTrain constructor', trainObj);
    super(new Map(trainObj.game_id, true), trainObj, train_id);
    this.interval = Interval;
    const self = this;
    this.timerHandle = Meteor.setInterval(function() {
      ServerTrain.onTime(self);
    }, Interval);
  }

  static onTime(train) {
    // console.log('onTime', that.map._id, that.pos, that.dir, that.map.tileCount());
    if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Interval}});
  }

  stop() {
    Meteor.clearInterval(this.timerHandle);
  }

}
