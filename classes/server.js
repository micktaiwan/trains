import {Train} from '../classes/train';
import {Map} from '../classes/map';

// a server train is a train with a map
// a map automatically subscribe to its tiles so a train's map with always be up to date
export class ServerTrain extends Train {

  constructor(train_id, trainObj) {
    //console.log('ServerTrain constructor', trainObj);
    super(new Map(trainObj.game_id), trainObj, train_id);
    this.interval = 500;
    let that = this;
    this.timerHandle = Meteor.setInterval(function() {
      ServerTrain.onTime(that);
    }, this.interval);
  }

  static onTime(train) {
    // console.log('onTime', that.map._id, that.pos, that.dir, that.map.tileCount());
    train.move();
    Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir}});
  }

  stop() {
    Meteor.clearInterval(this.timerHandle);
  }

}
