/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {Train} from '../classes/train';
import {Map, Tile} from '../classes/map';

// for each train in the map, move it
Meteor.startup(function() {

  class ServerTrain extends Train {
    constructor(train_id, trainObj) {
      //console.log('ServerTrain constructor', trainObj);
      super(new Map(trainObj.game_id), trainObj, train_id);
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
  } // class

  const trains = [];


  const getTrain = function(train_id) {
    for(let i = 0; i < trains.length; i++) if(trains[i]._id === train_id) return trains[i];
    return null;
  };


  const createTrain = function(train_id, doc) {
    // console.log('create train', train_id, doc);
    let train = getTrain(train_id);
    if(train) return train;
    // not found
    train = new ServerTrain(train_id, doc);
    trains.push(train);
    return train;
  };

  const removeTrain = function(train_id, doc) {
    let train = getTrain(train_id);
    if(!train) return train;
    // found
    for(let i = 0; i < trains.length; i++) if(trains[i]._id === train_id) {
      trains[i].stop();
      trains.splice(i, 1);
      break;
    }
  };


  Trains.find().observeChanges({
    added: function(train_id, doc) {
      //console.log('server: added', train_id, doc);
      createTrain(train_id, doc);
    },
    removed: function(id) {
      let doc = Tiles.findOne(id);
      //console.log('server: removed', id);
      removeTrain(id);
    }
  });

  // data seed
  if(TileTypes.find({}).count() === 0) {
    TileTypes.insert({
      name: 'Rails',
      price: 1,
      icon: 'road'
    });
    TileTypes.insert({
      name: 'Station',
      price: 150,
      icon: 'university'
    });
  }

});
