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

      Meteor.setInterval(function() {
        that.onTime(that);
      }, this.interval);
    }

    onTime(that) {
      console.log('onTime', that.map._id, that.pos, that.dir, that.map.tileCount());
      that.move();
      Trains.update({_id: that._id}, {$set: {pos: that.pos}});
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
/*

  var getMap = function(game_id) {
    for(var i = 0; i < maps.length; i++) if(maps[i].id === game_id) return maps[i];
    // not found
    let map = {map: new TrainsApp.Map(game_id)};
    maps.push(map);
    return map;
  };
*/

  Trains.find().observeChanges({
    added: function(train_id, doc) {
      console.log('server: added', train_id);
      trains.push(new ServerTrain(train_id, doc));
    },
    removed: function(id) {
      let doc = Tiles.findOne(id);
      console.log('server: removed', id);
      throw new Meteor.Error( 500, 'not implemented' );
    }
  });

});
