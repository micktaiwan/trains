/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {createCitiesFromTemplate} from '../mapTemplates.js';
import {Helpers} from '../../classes/helpers.js';

// Helper function to get default team statistics
function getDefaultTeamStats() {
  return {
    treasury: Helpers.startingCapital,
    totalPassengersTransported: 0,
    totalRevenue: 0
  };
}

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
        members: [member],
        ...getDefaultTeamStats()
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

    // Log game creation
    await Meteor.callAsync('gameLogAdd', gameId, 'game_created', {
      gameName: name
    });

    return gameId;
  },

  gameUpdateClock: async function(id, time, spawnInfo) {
    const updateData = {clock: time};

    // Add spawn rate information if provided
    if(spawnInfo) {
      updateData.gameDurationMinutes = spawnInfo.gameDurationMinutes;
      updateData.currentSpawnRate = spawnInfo.currentSpawnRate;
      updateData.spawnPhaseDescription = spawnInfo.spawnPhaseDescription;
      // Save passenger spawn accumulator to prevent burst spawns after server restart
      if(typeof spawnInfo.passengerSpawnAccumulator !== 'undefined') {
        updateData.passengerSpawnAccumulator = spawnInfo.passengerSpawnAccumulator;
      }
    }

    return await Games.updateAsync(id, {$set: updateData});
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
      members: [member],
      ...getDefaultTeamStats()
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
  },

  teamAddRevenue: async function(game_id, revenue, passengersCount) {
    check(game_id, String);
    check(revenue, Number);
    check(passengersCount, Number);

    // Find the team for this game (for now, assume one team per game)
    const team = await Teams.findOneAsync({game_id: game_id});
    if(!team) {
      throw new Meteor.Error('no-team', 'No team found for this game');
    }

    // Update team treasury and statistics
    await Teams.updateAsync({_id: team._id}, {
      $inc: {
        treasury: revenue,
        totalRevenue: revenue,
        totalPassengersTransported: passengersCount
      }
    });

    return team._id;
  },

  teamDeductCost: async function(game_id, cost, description) {
    check(game_id, String);
    check(cost, Number);
    check(description, String);

    // Find the team for this game
    const team = await Teams.findOneAsync({game_id: game_id});
    if(!team) {
      throw new Meteor.Error('no-team', 'No team found for this game');
    }

    // Check if team has enough money
    if(team.treasury < cost) {
      throw new Meteor.Error('insufficient-funds',
        `Not enough money. Cost: $${cost}, Available: $${team.treasury}`);
    }

    // Deduct cost
    await Teams.updateAsync({_id: team._id}, {
      $inc: { treasury: -cost }
    });

    console.log(`Team ${team.name} spent $${cost} on ${description}`);
    return team._id;
  },

  gameToggleInfiniteCapacity: async function(game_id) {
    check(game_id, String);

    // Get the current game
    const game = await Games.findOneAsync({_id: game_id});
    if(!game) {
      throw new Meteor.Error('game-not-found', 'Game not found');
    }

    // Toggle the infinite capacity mode
    const newMode = !game.infiniteCapacityMode;
    await Games.updateAsync({_id: game_id}, {
      $set: { infiniteCapacityMode: newMode }
    });

    console.log(`Game ${game_id}: Infinite capacity mode ${newMode ? 'ENABLED' : 'DISABLED'}`);
    return newMode;
  }

});
