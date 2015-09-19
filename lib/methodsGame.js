/**
 * Created by mfaivremacon on 03/09/2015.
 */

Meteor.methods({

  gameCreate: function(name) {
    console.log('gameCreate');
    var obj = {
      name: name
    };
    return Games.insert(obj);
  },

  trainAdd: function(game_id, pos, dir) {
    console.log('trainAdd');
    var obj = {
      game_id: game_id,
      pos: pos,
      dir: dir
    };
    return Trains.insert(obj);
  },

  teamCreate: function(game_id, name) {
    console.log('teamCreate');
    var obj = {
      game_id: game_id,
      name: name
    };
    return Teams.insert(obj);
  }

});

