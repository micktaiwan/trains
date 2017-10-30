import {Train} from '../classes/train';
import {Map, Tile} from '../classes/map';


// a server train is a train with a map
// a map automatically subscribe to its tiles so a train's map with always be up to date
export class ServerTrain extends Train {

  constructor(train_id, trainObj) {
    //console.log('ServerTrain constructor', trainObj);
    super(new Map(trainObj.game_id), trainObj, train_id);
    this.interval = 400;
    let that = this;
    this.timerHandle = Meteor.setInterval(function() {
      that.onTime(that);
    }, this.interval);
  }

  onTime(that) {
    // console.log('onTime', that.map._id, that.pos, that.dir, that.map.tileCount());
    that.move();
    Trains.update({_id: that._id}, {$set: {pos: that.pos, dir: that.dir}});
  }

  stop() {
    Meteor.clearInterval(this.timerHandle);
  }


}
