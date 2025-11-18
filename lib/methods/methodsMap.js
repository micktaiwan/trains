/**
 * Created by mfaivremacon on 02/09/2015.
 */

import {createCitiesFromTemplate} from '../mapTemplates.js';

Meteor.methods({

  mapInsert: async function(obj) {
    console.log('methods#mapInsert', obj.type, 'id:', obj._id, 'userId:', Meteor.userId());

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
        console.log('methods#mapInsert: server inserted', obj.type, insertedId);
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
    console.log('methods#mapUpdate', id, 'type:', obj.type);

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

    console.log('methods#mapUpdate: successfully updated', id, '- affected:', result);
    return result;
  },

  mapRemove: async function(id) {
    console.log('methods#mapRemove', id);

    const userId = Meteor.userId();

    // Get the object before removing it (to log details)
    const objToRemove = await MapObjects.findOneAsync({_id: id});

    const result = await MapObjects.removeAsync({_id: id});
    console.log('methods#mapRemove: removed', result, 'document(s)');

    // Note: station removal logging is now handled in removePointFromEvent (merged logs)

    return result;
  },

  mapReset: async function(game_id) {
    // Remove ALL objects including cities
    await MapObjects.removeAsync({game_id: game_id});

    // Reset team treasury and statistics
    const {Helpers} = await import('../../classes/helpers.js');
    await Teams.updateAsync({game_id: game_id}, {
      $set: {
        treasury: Helpers.startingCapital,
        totalPassengersTransported: 0,
        totalRevenue: 0
      }
    });

    // Recreate cities from default template
    await createCitiesFromTemplate(game_id);
  }

});
