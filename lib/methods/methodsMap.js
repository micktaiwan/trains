/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({

  mapInsert: async function(obj) {
    // console.log('methods#mapInsert', obj);
    return await MapObjects.insertAsync(obj);
  },

  mapUpdate: async function(id, obj) {
    // console.log('methods#mapUpdate', id, obj);
    return await MapObjects.updateAsync(id, {$set: obj});
  },

  mapRemove: async function(id) {
    // console.log('methods#mapRemove');
    await MapObjects.removeAsync({_id: id});
  },

  mapReset: async function(game_id) {
    // Remove all objects except cities (cities are fixed map features)
    await MapObjects.removeAsync({game_id: game_id, type: {$ne: 'city'}});
  }

});
