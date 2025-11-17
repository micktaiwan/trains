/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {createCitiesFromTemplate} from '../mapTemplates.js';

Meteor.methods({

  gameCreate: async function(name) {
    // console.log('gameCreate');
    const userId = Meteor.userId();
    if (!userId) throw new Meteor.Error('not-authorized', 'You must be logged in to create a game');

    const user = await Meteor.userAsync();

    // Create the game
    const gameId = await Games.insertAsync({
      name: name,
      players: [{_id: userId, name: user.username}],
      teams: []
    });

    // Check if the user has any existing team in this game
    const existingTeam = await Teams.findOneAsync({
      game_id: gameId,
      'members._id': userId
    });

    // If no team exists, create one automatically for the game creator
    if (!existingTeam) {
      const teamName = user.username + "'s Team";
      const member = {
        _id: userId,
        name: user.username
      };

      const teamId = await Teams.insertAsync({
        game_id: gameId,
        name: teamName,
        members: [member]
      });

      // Add the team to the game's teams array
      await Games.updateAsync({_id: gameId}, {
        $addToSet: {
          teams: {_id: teamId, name: teamName}
        }
      });
    }

    // Initialize cities from default template
    await createCitiesFromTemplate(gameId);

    return gameId;
  },

  gameUpdateClock: async function(id, time) {
    return await Games.updateAsync(id, {$set: {clock: time}});
  },

  teamCreate: async function(game_id, name) {
    // console.log('teamCreate');
    const user = await Meteor.userAsync();
    const member = {
      _id: Meteor.userId(),
      name: user.username
    };
    const obj = {
      game_id: game_id,
      name: name,
      members: [member]
    };
    const team_id = await Teams.insertAsync(obj);
    await Games.updateAsync({_id: game_id}, {
      $addToSet: {
        teams: {_id: team_id, name: name},
        players: member
      }
    });
    return team_id;
  },

  teamJoin: async function(game_id, team_id) {
    // console.log('teamJoin');
    const user = await Meteor.userAsync();
    const member = {
      _id: Meteor.userId(),
      name: user.username
    };
    await Teams.updateAsync({_id: team_id}, {$addToSet: {members: member}});
    await Games.updateAsync({_id: game_id}, {$addToSet: {players: member}});
    console.log(game_id, member);
  }

});
