/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapInsert: function(obj) {
    // console.log('methods#mapInsert', obj);
    return MapObjects.insert(obj);
  },

  mapUpdate: function(id, obj) {
    // console.log('methods#mapUpdate', id, obj);
    return MapObjects.update(id, {$set: obj});
  },

  mapRemove: function(id) {
    // console.log('methods#mapRemove');
    MapObjects.remove({_id: id});
  },

  mapReset: function(game_id) {
    MapObjects.remove({game_id: game_id}); // no need for {multi: true}
  }

});
