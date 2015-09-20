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
    let member = {
      _id: Meteor.userId(),
      name: Meteor.user().username
    };
    var obj = {
      game_id: game_id,
      name: name,
      members: [member]
    };
    let team_id = Teams.insert(obj);
    Games.update({_id: game_id}, {
      $addToSet: {
        teams: {_id: team_id, name: name},
        players: member
      }
    });
    return team_id;
  },

  teamJoin: function(game_id, team_id) {
    console.log('teamJoin');
    let member = {
      _id: Meteor.userId(),
      name: Meteor.user().username
    };
    Teams.update({_id: team_id}, {$addToSet: {members: member}});
    Games.update({_id: game_id}, {$addToSet: {players: member}});
    console.log(game_id, member);
  }

});
