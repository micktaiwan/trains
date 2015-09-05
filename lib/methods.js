/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapSet: function(pos, game_id) {
    var obj = {
      game_id: game_id,
      x: pos.x,
      y: pos.y
    };
    Tiles.insert(obj);
  },

  mapRemove: function(id) {
    Tiles.remove({_id: id});
  },

  mapReset: function(game_id) {
    Tiles.remove({game_id: game_id}); // no need for {multi: true}
    Trains.remove({game_id: game_id});
  }

});

