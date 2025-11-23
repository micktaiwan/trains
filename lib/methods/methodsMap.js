/**
 * Created by mfaivremacon on 02/09/2015.
 */

import {createCitiesFromTemplate} from '../mapTemplates.js';

Meteor.methods({

  mapInsert: async function(obj) {
    // Only log user-initiated actions (stations, trains), not auto-generated persons
    if (obj.type !== 'person') {
      console.log('methods#mapInsert', obj.type, 'id:', obj._id, 'userId:', Meteor.userId());
    }

    // Check if object with this ID already exists
    if(obj._id) {
      const existing = await MapObjects.findOneAsync({_id: obj._id});
      if(existing) {
        console.error('mapInsert: object already exists', obj._id, obj.type);
        throw new Meteor.Error('duplicate', `Object with id ${obj._id} already exists`);
      }
    }

    const userId = Meteor.userId();

    // Server-created objects (no userId): cities, persons, and trains are free
    if (!userId) {
      if (obj.type === 'city' || obj.type === 'person' || obj.type === 'train') {
        const insertedId = await MapObjects.insertAsync(obj);
        // Only log non-person server insertions
        if (obj.type !== 'person') {
          console.log('methods#mapInsert: server inserted', obj.type, insertedId);
        }
        return insertedId;
      }
      console.error('mapInsert: not authorized for type', obj.type);
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const {Helpers} = await import('../../classes/helpers.js');
    let cost = 0;
    let description = '';

    // Calculate cost based on object type
    if (obj.type === 'station') {
      cost = Helpers.stationCost;
      description = 'Station construction';
    }
    else if (obj.type === 'train') {
      cost = Helpers.trainBasicCost;
      description = 'Train purchase';
    }

    // Deduct cost if applicable
    if (cost > 0) {
      await Meteor.callAsync('teamDeductCost', obj.game_id, cost, description);
    }

    const insertedId = await MapObjects.insertAsync(obj);
    console.log('methods#mapInsert: user inserted', obj.type, insertedId, 'cost:', cost);

    // Note: station logging is now handled in endLinkFromEvent (merged logs for rail creation)

    return insertedId;
  },

  mapUpdate: async function(id, obj) {
    // Verify the object exists before updating
    const existing = await MapObjects.findOneAsync({_id: id});
    if(!existing) {
      console.error('mapUpdate: object not found', id);
      throw new Meteor.Error('not-found', `Object with id ${id} not found`);
    }

    const userId = Meteor.userId();

    // Log station moves (when position changes)
    if (userId && obj.type === 'station' && obj.pos && existing.pos) {
      const posChanged = obj.pos.x !== existing.pos.x || obj.pos.y !== existing.pos.y;
      if (posChanged && obj.oldCityName && obj.newCityName) {
        console.log('methods#mapUpdate: station moved from', obj.oldCityName, 'to', obj.newCityName);
        await Meteor.callAsync('gameLogAdd', obj.game_id, 'station_moved', {
          oldCityName: obj.oldCityName,
          newCityName: obj.newCityName,
          stationId: id
        });
      }
    }

    // Use explicit selector to prevent creating duplicates
    const result = await MapObjects.updateAsync({_id: id}, {$set: obj});

    if(result === 0) {
      console.error('mapUpdate: no documents updated', id);
      throw new Meteor.Error('update-failed', `Failed to update object ${id}`);
    }

    return result;
  },

  mapRemove: async function(id) {
    const userId = Meteor.userId();

    // Get the object before removing it (to check type for logging)
    const objToRemove = await MapObjects.findOneAsync({_id: id});

    // Only log user-initiated removals (stations, trains), not persons
    if (objToRemove && objToRemove.type !== 'person') {
      console.log('methods#mapRemove', id, 'type:', objToRemove.type);
    }

    const result = await MapObjects.removeAsync({_id: id});

    // Only log result for non-person removals
    if (objToRemove && objToRemove.type !== 'person') {
      console.log('methods#mapRemove: removed', result, 'document(s)');
    }

    // Note: station removal logging is now handled in removePointFromEvent (merged logs)

    return result;
  },

  mapReset: async function(game_id) {
    console.log('[RESET] Starting map reset for game', game_id);

    // Remove ALL objects including cities
    await MapObjects.removeAsync({game_id: game_id});
    console.log('[RESET] Removed all map objects');

    // Reset team treasury and statistics
    const {Helpers} = await import('../../classes/helpers.js');
    await Teams.updateAsync({game_id: game_id}, {
      $set: {
        treasury: Helpers.startingCapital,
        totalPassengersTransported: 0,
        totalRevenue: 0
      }
    });
    console.log('[RESET] Reset team statistics and treasury');

    // Reset game clock and spawn information
    // Set resetRequested flag to signal immediate reset to game loop
    await Games.updateAsync(game_id, {
      $set: {
        clock: 0,
        gameDurationMinutes: 0,
        currentSpawnRate: Helpers.spawnRateSchedule[0].rate, // First phase rate
        spawnPhaseDescription: `${Helpers.spawnRateSchedule[0].time}-${Helpers.spawnRateSchedule[1].time} min`,
        passengerSpawnAccumulator: 0,
        resetRequested: true // Flag for immediate game loop reset
      }
    });
    console.log('[RESET] Clock reset to 0, resetRequested flag set');

    // Recreate cities from default template
    await createCitiesFromTemplate(game_id);
    console.log('[RESET] Cities created from template');
  }

});
