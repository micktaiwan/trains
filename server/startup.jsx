/**
 * Created by mfaivremacon on 03/09/2015.
 */

"use strict";

// for each train in the map, move it
Meteor.startup(function() {

  class ServerTrain extends TrainsApp.Train {
    constructor(train_id, trainObj) {
      console.log(trainObj);
      super(new TrainsApp.Map(trainObj.game_id));
      this._id = train_id;
      this.game_id = trainObj.game_id;
      this.pos = {x: 1, y: 1}; //trainObj.pos;
      this.dir = trainObj.dir;
      this.interval = 2000;
      let that = this;
      this.observeChanges(that);

      this.timerHandle = Meteor.setInterval(function() {
        that.onTime(that);
      }, this.interval);
    }

    onTime(that) {
      //console.log('onTime', that.map._id, that.pos, that.dir, that.map.tileCount());
      that.move();
      Trains.update({_id: that._id}, {$set: {pos: that.pos, dir: that.dir}});
    }

    stop() {
      Meteor.clearInterval(this.timerHandle);
    }

    observeChanges(that) {
      Tiles.find({game_id: that.game_id}).observeChanges({
        added: function(id, doc) {
          console.log('change: added', id, doc);
          that.map.tiles.push(new TrainsApp.Tile(that.map, {x: doc.x, y: doc.y}, id));
        },
        removed: function(id) {
          let doc = Tiles.findOne(id);
          console.log('change: removed', id);
          that.map.removeTile(id);
        }

      });
    }
  } // class

  var trains = [];


  var getTrain = function(train_id) {
    for(var i = 0; i < trains.length; i++) if(trains[i]._id === train_id) return trains[i];
    return null;
  };


  var createTrain = function(train_id, doc) {
    let train = getTrain(train_id);
    if(train) return train;
    // not found
    train = new ServerTrain(train_id, doc);
    trains.push(train);
    return train;
  };

  var removeTrain = function(train_id, doc) {
    let train = getTrain(train_id);
    if(!train) return train;
    // found
    for(var i = 0; i < trains.length; i++) if(trains[i]._id === train_id) {
      trains[i].stop();
      trains.splice(i, 1);
      break;
    }
  };


  Trains.find().observeChanges({
    added: function(train_id, doc) {
      console.log('server: added', train_id);
      createTrain(train_id, doc);
    },
    removed: function(id) {
      let doc = Tiles.findOne(id);
      console.log('server: removed', id);
      removeTrain(id);
    }
  });

});
