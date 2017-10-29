/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapSet: function(pos, type, game_id) {
    const obj = {
      game_id: game_id,
      x: pos.x,
      y: pos.y,
      type: type
    };
    Tiles.insert(obj);
  },

  mapUpdate: function(id, pos, type, game_id) {
    //console.log('update', id, pos, type);
    const obj = {
      game_id: game_id,
      x: pos.x,
      y: pos.y,
      type: type
    };
    Tiles.update({_id: id}, {$set: obj});
  },


  mapRemove: function(id) {
    Tiles.remove({_id: id});
  },

  mapReset: function(game_id) {
    Tiles.remove({game_id: game_id}); // no need for {multi: true}
    Trains.remove({game_id: game_id});
  }

});

