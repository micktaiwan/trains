/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapInsertPath: function(obj) {
    return Paths.insert(obj);
  },

  mapUpdatePath: function(id, obj) {
    Paths.update({_id: id}, {$set: obj});
  },


  mapRemove: function(id) {
    Paths.remove({_id: id});
  },

  mapReset: function(game_id) {
    Paths.remove({game_id: game_id}); // no need for {multi: true}
    Trains.remove({game_id: game_id});
  }

});

