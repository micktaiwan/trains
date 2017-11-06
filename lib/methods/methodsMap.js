/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapInsertStation: function(obj) {
    return Stations.insert(obj);
  },

  mapUpdateStation: function(id, obj) {
    Stations.update({_id: id}, {$set: obj});
  },

  mapRemoveStation: function(id) {
    Stations.remove({_id: id});
  },

  mapReset: function(game_id) {
    Stations.remove({game_id: game_id}); // no need for {multi: true}
    Trains.remove({game_id: game_id});
  }

});
