/**
 * Created by mfaivremacon on 03/09/2015.
 */

Meteor.methods({

  gameCreate: function(name) {
    console.log('gameCreate');
    const obj = {
      name: name
    };
    return Games.insert(obj);
  },

  trainAdd: function(game_id, obj) {
    console.log('trainAdd');
    return Trains.insert(obj);
  },

  trainUpdate: function(id, obj) {
    console.log('trainUpdate');
    return Trains.update(id, {$set: obj});
  },

  teamCreate: function(game_id, name) {
    console.log('teamCreate');
    const member = {
      _id: Meteor.userId(),
      name: Meteor.user().username
    };
    const obj = {
      game_id: game_id,
      name: name,
      members: [member]
    };
    const team_id = Teams.insert(obj);
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
    const member = {
      _id: Meteor.userId(),
      name: Meteor.user().username
    };
    Teams.update({_id: team_id}, {$addToSet: {members: member}});
    Games.update({_id: game_id}, {$addToSet: {players: member}});
    console.log(game_id, member);
  }

});
