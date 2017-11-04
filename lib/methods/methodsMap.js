/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapInsertSegment: function(obj) {
    return Segments.insert(obj);
  },

  mapUpdateSegment: function(id, obj) {
    Segments.update({_id: id}, {$set: obj});
  },


  mapRemove: function(id) {
    Segments.remove({_id: id});
  },

  mapReset: function(game_id) {
    Segments.remove({game_id: game_id}); // no need for {multi: true}
    Trains.remove({game_id: game_id});
  }

});

