/**
 * Created by mfaivremacon on 01/09/2015.
 */

export class Game {

  constructor(map, doc) {
    this.map = map;
    this._canStart = new ReactiveVar(false);
    this._canModifyMap = false;
    this._canModifyMapDep = new Tracker.Dependency();
    this.gameStatus = new ReactiveVar('');
    // launch clock // TODO
    // const self = this;
    // this.clock = new Date().getTime();
    // this.clockHandle = Meteor.setInterval(function() {
    //   self.onTime();
    // }, 1000);

    // check trains

  }

  onTime() {
    console.log('game on time');
    // this.map.addRandomStation();
    // this.map.addRandomPassenger();

    // console.log('onTime', that.map._id, that.pos, that.dir, that.map.stationCount());
    if(train.move()) Trains.update({_id: train._id}, {$set: {pos: train.pos, dir: train.dir, interval: Helpers.moveInterval}});


  }

  canTrainStart() {
    this._canStart.set(Meteor.user() && this.map.stations.length > 0);
    return this._canStart.get();
  }

}
