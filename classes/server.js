import {Train} from '../classes/train';
import {Map, Tile} from '../classes/map';

export class ServerTrain extends Train {

  constructor(train_id, trainObj) {
    //console.log('ServerTrain constructor', trainObj);
    super(new Map(), trainObj, train_id);
    this.interval = 400;
    let that = this;
    this.observeChanges(that);

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

  observeChanges(that) {
    Tiles.find({game_id: that.game_id}).observeChanges({
      added: function(id, doc) {
        //console.log('change: added', id, doc);
        that.map.tiles.push(new Tile(that.map, doc, id));
      },
      removed: function(id) {
        let doc = Tiles.findOne(id);
        //console.log('change: removed', id);
        that.map.removeTile(id);
      }

    });
  }

}
