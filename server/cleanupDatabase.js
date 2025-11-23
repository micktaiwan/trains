/**
 * Database Cleanup Migration
 *
 * Purpose: Clean invalid references from old/corrupt data after station merges/deletions
 *
 * This script runs once at server startup to fix:
 * - Invalid station children/parents references (deleted/merged stations)
 * - Invalid train station references (fromStation, destStation, nextStation, path)
 * - Invalid person references (targetStation, destinationCity)
 *
 * After running this cleanup, defensive code in map.js and pathfinder.js can be removed
 * on the next deployment.
 */

export async function cleanupDatabase() {
  console.log('====================================');
  console.log('DATABASE CLEANUP MIGRATION - START');
  console.log('====================================');

  let totalCleaned = 0;

  // ===========================================
  // 1. Clean Station References
  // ===========================================
  console.log('\n[1/3] Cleaning station references...');
  const stations = await MapObjects.find({type: 'station'}).fetchAsync();
  let stationsCleaned = 0;

  for(const station of stations) {
    let needsUpdate = false;
    const validChildren = [];
    const validParents = [];

    // Clean children array
    for(const childId of station.children || []) {
      const exists = await MapObjects.findOneAsync(childId);
      if(exists) {
        validChildren.push(childId);
      } else {
        console.log(`  Station ${station._id}: removing invalid child ${childId}`);
        needsUpdate = true;
      }
    }

    // Clean parents array
    for(const parentId of station.parents || []) {
      const exists = await MapObjects.findOneAsync(parentId);
      if(exists) {
        validParents.push(parentId);
      } else {
        console.log(`  Station ${station._id}: removing invalid parent ${parentId}`);
        needsUpdate = true;
      }
    }

    if(needsUpdate) {
      await MapObjects.updateAsync(station._id, {
        $set: {
          children: validChildren,
          parents: validParents
        }
      });
      stationsCleaned++;
    }
  }

  console.log(`  ✓ Cleaned ${stationsCleaned} stations`);
  totalCleaned += stationsCleaned;

  // ===========================================
  // 2. Clean Train References
  // ===========================================
  console.log('\n[2/3] Cleaning train references...');
  const trains = await MapObjects.find({type: 'train'}).fetchAsync();
  let trainsCleaned = 0;

  for(const train of trains) {
    let needsUpdate = false;
    const updates = {};

    // Validate fromStation
    if(train.fromStation) {
      const exists = await MapObjects.findOneAsync(train.fromStation);
      if(!exists) {
        console.log(`  Train ${train._id}: invalid fromStation ${train.fromStation} (setting to null)`);
        updates.fromStation = null;
        needsUpdate = true;
      }
    }

    // Validate destStation
    if(train.destStation) {
      const exists = await MapObjects.findOneAsync(train.destStation);
      if(!exists) {
        console.log(`  Train ${train._id}: invalid destStation ${train.destStation} (setting to null)`);
        updates.destStation = null;
        needsUpdate = true;
      }
    }

    // Validate nextStation
    if(train.nextStation) {
      const exists = await MapObjects.findOneAsync(train.nextStation);
      if(!exists) {
        console.log(`  Train ${train._id}: invalid nextStation ${train.nextStation} (setting to null)`);
        updates.nextStation = null;
        needsUpdate = true;
      }
    }

    // Validate path array
    if(train.path && train.path.length > 0) {
      const validPath = [];
      for(const stationId of train.path) {
        const exists = await MapObjects.findOneAsync(stationId);
        if(exists) {
          validPath.push(stationId);
        } else {
          console.log(`  Train ${train._id}: removing invalid station ${stationId} from path`);
          needsUpdate = true;
        }
      }
      if(needsUpdate) {
        updates.path = validPath;
      }
    }

    if(needsUpdate) {
      await MapObjects.updateAsync(train._id, {$set: updates});
      trainsCleaned++;
    }
  }

  console.log(`  ✓ Cleaned ${trainsCleaned} trains`);
  totalCleaned += trainsCleaned;

  // ===========================================
  // 3. Clean Person References
  // ===========================================
  console.log('\n[3/3] Cleaning person references...');
  const persons = await MapObjects.find({type: 'person'}).fetchAsync();
  let personsCleaned = 0;

  for(const person of persons) {
    let needsUpdate = false;
    const updates = {};

    // Validate targetStation
    if(person.targetStation) {
      const exists = await MapObjects.findOneAsync(person.targetStation);
      if(!exists) {
        console.log(`  Person ${person._id}: invalid targetStation ${person.targetStation} (setting to null)`);
        updates.targetStation = null;
        updates.state = 'at_city'; // Reset to safe state
        needsUpdate = true;
      }
    }

    // Validate destinationCity
    if(person.destinationCity) {
      const exists = await MapObjects.findOneAsync(person.destinationCity);
      if(!exists) {
        console.log(`  Person ${person._id}: invalid destinationCity ${person.destinationCity} (setting to null)`);
        updates.destinationCity = null;
        needsUpdate = true;
      }
    }

    if(needsUpdate) {
      await MapObjects.updateAsync(person._id, {$set: updates});
      personsCleaned++;
    }
  }

  console.log(`  ✓ Cleaned ${personsCleaned} persons`);
  totalCleaned += personsCleaned;

  // ===========================================
  // Summary
  // ===========================================
  console.log('\n====================================');
  console.log('DATABASE CLEANUP MIGRATION - COMPLETE');
  console.log(`Total objects cleaned: ${totalCleaned}`);
  console.log('====================================\n');

  return totalCleaned;
}

/**
 * Run cleanup migration with safety checks
 * - Only runs once per deployment
 * - Uses environment variable flag to control execution
 */
export async function runCleanupMigration() {
  // Check if cleanup should run (controlled by environment variable)
  const shouldRun = process.env.RUN_DB_CLEANUP === 'true';

  if(!shouldRun) {
    console.log('[DB Cleanup] Skipped (set RUN_DB_CLEANUP=true to run)');
    return;
  }

  try {
    const cleanedCount = await cleanupDatabase();
    console.log(`[DB Cleanup] Migration completed successfully (${cleanedCount} objects cleaned)`);
  } catch(err) {
    console.error('[DB Cleanup] Migration failed:', err);
    throw err;
  }
}
