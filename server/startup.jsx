/**
 * Created by mfaivremacon on 03/09/2015.
 */

"use strict";

// for each train in the map, move it
Meteor.startup(function() {

  class ServerTrain extends TrainsApp.Train {
    constructor(map, train_id, trainObj) {
      super(map);
      console.log(trainObj);
      this._id = train_id;
      this.game_id = trainObj.game_id;
      this.pos = trainObj.pos;
      this.dir = trainObj.dir;
      this.interval = 2000;
      //this.onTime();
      let that = this;
      Meteor.setInterval(function() {
        that.onTime(that);
      }, this.interval);
    }

    onTime(that) {
      console.log('onTime', that.map._id, that.pos, that.dir, that.map.tileCount());
      that.move();
      Trains.update({_id: that._id}, {$set: {pos: that.pos}});
    }

  }


  var server = null;
  var maps = [];

  var getMap = function(game_id) {
    for(var i = 0; i < maps.length; i++) if(maps[i].id === game_id) return maps[i];
    // not found
    let map = new TrainsApp.Map(game_id);
    maps.push(map);
    return map;
  };

  Trains.find().observeChanges({
    added: function(train_id, doc) {
      console.log('server: added', train_id);
      let map = getMap(doc.game_id);
      if(!server) server = new ServerTrain(map, train_id, doc);
    },
    removed: function(id) {
      let doc = Tiles.findOne(id);
      console.log('server: removed', id);
      Meteor.throw('not implemented');
    }
  });

  Tiles.find().observeChanges({
    added: function(id, doc) {
      console.log('change: added', id, doc);
      let map = getMap(doc.game_id);
      map.tiles.push(new TrainsApp.Tile(map, doc.pos, id));
    },
    removed: function(id) {
      let doc = Tiles.findOne(id);
      //console.log('change: removed', id);
      getMap(doc.game_id).removeTile(id, true);
    }
  });

});
