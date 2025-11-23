/**
 * Created by mfaivremacon on 01/09/2015.
 */
import {DBObject} from "./dbobject";
import {Geometry, Helpers, Vector} from "./helpers";
import {PathFinder} from "./pathfinder";

export class Train extends DBObject {

  constructor(doc) {
    // console.log('Train#constructor', doc);
    const def = {
      type: 'train',
      game_id: null,
      map: null,
      pos: {x: 10, y: 10},
      displayPos: {x: 10, y: 10}, // Position used for rendering (interpolated)
      fromStation: null, // station
      destStation: null, // station
      nextStation: null, // current target station in path
      path: [], // stations without fromStation
      progress: 0, // progress along current segment (0-100)
      state: 'stopped', // Current train state (see Helpers.TrainStates)
      stateStartTime: 0, // Timestamp when state started (Date.now())
      stateDuration: 0, // Expected duration of state (ms)
      hasUnloaded: true, // Whether unloading phase is complete at current station
      hasLoaded: true, // Whether loading phase is complete at current station
      hasMoved: false,
      passengers: [], // list of passenger IDs
      capacity: 10, // maximum number of passengers
      maxSpeed: Helpers.trainSpeed, // max speed in km/h
      ticksSinceLastProgressSave: 0, // Track ticks for periodic progress sync
    };
    super(def, doc);
    this.updateFromDB(doc); // perform additional object transformations
  }

  /**
   * Set train state with duration
   * @param {string} newState - New state from Helpers.TrainStates
   * @param {number} duration - Duration in milliseconds (0 = indefinite)
   */
  setState(newState, duration = 0) {
    this.state = newState;
    this.stateStartTime = Date.now();
    this.stateDuration = duration;
  }

  /**
   * Check if current state duration has elapsed
   * @returns {boolean} true if state is complete
   */
  isStateComplete() {
    if(this.stateDuration === 0) return true;
    return Date.now() >= (this.stateStartTime + this.stateDuration);
  }

  /**
   * Computed property for backward compatibility
   * @returns {boolean} true if train is moving
   */
  get running() {
    return this.state === Helpers.TrainStates.MOVING;
  }

  // to be done with pathfinding
  async update(clock) {
    // const from = this.fromStation ? this.fromStation._id + ' ' + this.fromStation.children.length : 'no from station';
    // console.log('Train#move', from, this.pos);
    // Find the station where we want to go to
    this.checkStations();

    // Track if we need to save to DB (only on important events, not every tick)
    let needsDBUpdate = false;

    if(this.fromStation === null) { // we are not on a track
      // find the nearest station
      const station = this.map.getNearestStation(this.pos, -1);
      // go to it
      this.fromStation = station;
    }
    else { // we come from a station
      // State machine logic - ensures consistent cycle at all stations:
      // MOVING → STOPPED → UNLOADING → STOPPED → LOADING → STOPPED → MOVING
      if(this.state === Helpers.TrainStates.STOPPED) {
        // Phase 1: Unload passengers (if not done yet)
        if(!this.hasUnloaded) {
          const unloaded = await this.leavePassengers();
          if(unloaded) {
            // State is now UNLOADING, wait for completion
            // hasUnloaded will be set to true when UNLOADING completes
            // Mark for DB update (important state change)
            needsDBUpdate = true;
            await this.updateDB();
            return;
          } else {
            // No passengers to unload, mark as done and continue to next phase
            this.hasUnloaded = true;
          }
        }

        // Phase 2: Load passengers (if not done yet)
        if(!this.hasLoaded) {
          const loaded = await this.getPassengers();
          if(loaded) {
            // State is now LOADING, wait for completion
            // hasLoaded will be set to true when LOADING completes
            // Mark for DB update (important state change)
            needsDBUpdate = true;
            await this.updateDB();
            return;
          } else {
            // No passengers to load, mark as done and continue to next phase
            this.hasLoaded = true;
          }
        }

        // Phase 3: Both unloading and loading complete, ready to move
        if(!this.destStation) {
          this.findDestination();
        }
        if(this.destStation) {
          this.setState(Helpers.TrainStates.MOVING);
          needsDBUpdate = true; // State changed to MOVING
          // Reset counter so first movement tick is counted as tick 1
          this.ticksSinceLastProgressSave = 0;
        }
      }
      else if(this.state === Helpers.TrainStates.LOADING || this.state === Helpers.TrainStates.UNLOADING) {
        // Wait for loading/unloading to complete
        if(this.isStateComplete()) {
          // Mark the phase as complete
          if(this.state === Helpers.TrainStates.UNLOADING) {
            this.hasUnloaded = true;
          } else if(this.state === Helpers.TrainStates.LOADING) {
            this.hasLoaded = true;
          }

          // Always return to STOPPED after loading/unloading completes
          // This ensures STOPPED is visible between each phase
          this.setState(Helpers.TrainStates.STOPPED);
          needsDBUpdate = true; // State changed back to STOPPED
        }
        // If not complete, do nothing this tick (wait)
      }
      else if(this.state === Helpers.TrainStates.MOVING) {
        // Move toward next station
        const arrivedAtStation = await this.goTowardNextStop();
        if(arrivedAtStation) {
          needsDBUpdate = true; // Arrived at station - important event
          this.ticksSinceLastProgressSave = 0; // Reset counter
        } else {
          // Periodically save progress for client synchronization
          // Strategy: save at ticks 1, 2, 3 (smooth startup), then every 5 ticks
          this.ticksSinceLastProgressSave++;

          let shouldSync = false;

          if(this.ticksSinceLastProgressSave <= 3) {
            // First 3 ticks: sync every tick for smooth startup
            shouldSync = true;
          } else if(this.ticksSinceLastProgressSave >= 8) {
            // After tick 3, wait 5 more ticks (tick 8), then every 5 after that
            shouldSync = true;
            this.ticksSinceLastProgressSave = 3; // Reset to 3, so next sync is at +5 = tick 8 again
          }

          if(shouldSync) {
            needsDBUpdate = true;
          }
        }
        this.hasMoved = true;
      }
    }
    if(!this.fromStation) await this.removeFromDB(); // no rails, remove the train
    else if(needsDBUpdate) await this.updateDB(); // Only save on important events
  }

  // update train position
  // @returns {boolean} true if train arrived at a station
  async goTowardNextStop() {
    if(!this.nextStation) {
      this.nextStation = this.path.shift();
      this.progress = 0;
    }
    if(!this.nextStation) {
      this.setState(Helpers.TrainStates.STOPPED);
      return false; // end of path
    }

    this.checkStations();

    let v = new Vector(this.fromStation.pos, this.nextStation.pos);
    const segmentLen = v.len(); // the length of a segment in meters (note hat the coordinates of the vector are already zoomed)
    const push = (Helpers.timePixels / segmentLen) * 100; // % progress
    // we "even out" the number of steps
    const nbPushInSegment = 100 / push; // segments are 100% long (push is a %)
    const even = 100 / Math.round(nbPushInSegment);
    // console.log('push', even, push, even === push, nbPushInSegment);
    this.progress += even; // total progress

    if(this.progress >= 100) { // Train arrived at next station
      this.fromStation = this.nextStation;
      this.nextStation = this.path.shift();
      this.pos = this.fromStation.pos;
      this.progress = 0;

      // Reset station phase flags - haven't unloaded/loaded at this station yet
      this.hasUnloaded = false;
      this.hasLoaded = false;

      // Stop the train when arriving at any station (consistent cycle)
      this.setState(Helpers.TrainStates.STOPPED);

      // Check if we're at final destination
      if(this.fromStation === this.destStation) {
        this.destStation = null; // Clear destination
      }

      // Note: Unloading/loading will happen in the next update() tick(s)
      // via the state machine in update() method:
      // 1. STOPPED → check !hasUnloaded → leavePassengers() → UNLOADING
      // 2. UNLOADING complete → STOPPED
      // 3. STOPPED → check !hasLoaded → getPassengers() → LOADING
      // 4. LOADING complete → STOPPED
      // 5. STOPPED → check hasUnloaded && hasLoaded → MOVING

      return true; // Arrived at station - important event!
    }
      // calculate vector to goal
    // console.log('from', this.fromStation, 'dest', this.nextStation);
    else
      this.pos = Geometry.getProgressPos(v, this.progress / 100);
    // console.log(this.progress, this.pos, this.fromStation._id, this.nextStation._id);

    return false; // Not arrived yet - don't save to DB
  }

  checkStations() {
    //check if the stations are still alive
    if(!this.fromStation) {
      // Try to find nearest station as recovery
      const nearestStation = this.map.getNearestStation(this.pos, -1);
      if(nearestStation) {
        this.fromStation = nearestStation;
        this.destStation = null; // Clear destination to trigger recalculation
        this.nextStation = null;
        this.path = [];
        this.setState(Helpers.TrainStates.STOPPED);
        return;
      }
      this.setState(Helpers.TrainStates.STOPPED);
      return;
    }

    // Refresh fromStation reference from map (in case it was updated)
    const refreshedFrom = this.map.getObjectById(this.fromStation._id);
    if(!refreshedFrom) {
      // Station was removed (merged) - find nearest station
      const nearestStation = this.map.getNearestStation(this.pos, -1);
      if(nearestStation) {
        this.fromStation = nearestStation;
        this.pos = nearestStation.pos;
        this.destStation = null; // Clear destination to trigger recalculation
        this.nextStation = null;
        this.path = [];
        this.setState(Helpers.TrainStates.STOPPED);
        return;
      }
      this.setState(Helpers.TrainStates.STOPPED);
      return;
    }
    this.fromStation = refreshedFrom;

    if(!this.nextStation) return;

    // Check if nextStation still exists
    const refreshedNext = this.map.getObjectById(this.nextStation._id);
    if(!refreshedNext) {
      this.nextStation = this.path.shift();
      if(!this.nextStation) {
        this.setState(Helpers.TrainStates.STOPPED);
        this.destStation = null;
      }
      return;
    }
    this.nextStation = refreshedNext;

    // reset path if the next is not a child of from anymore
    const children = _.map(this.fromStation.children, function(child) {return child._id;});
    if(!children.includes(this.nextStation._id)) {
      // This should not happen if updateTrainsAfterMerge() did its job properly
      // But if it does, recalculate the path
      if(this.destStation && this.fromStation._id !== this.destStation._id) {
        this.setPath();
        this.nextStation = this.path.shift();
      } else {
        // No destination or already at destination
        this.setState(Helpers.TrainStates.STOPPED);
        this.nextStation = null;
        this.path = [];
        this.destStation = null;
      }
    }
  }

  // Find the best destination station for passengers currently on board
  findBestDestinationForPassengers() {
    if(!this.passengers || this.passengers.length === 0) return null;

    const stations = this.map.getStations();
    if(stations.length === 0) return null;

    // Build a map of destination cities for passengers on board
    const destinationCityIds = [];
    for(const passengerId of this.passengers) {
      const passenger = this.map.getObjectById(passengerId);
      if(passenger && passenger.destinationCityId) {
        destinationCityIds.push(passenger.destinationCityId);
      }
    }

    if(destinationCityIds.length === 0) return null;

    // For each station, calculate score based on proximity to destination cities
    const stationScores = {};
    for(const station of stations) {
      if(station._id === this.fromStation._id) continue; // Skip current station

      // Find nearest city to this station
      const nearestCityInfo = this.map.findNearestCity(station.pos);
      if(!nearestCityInfo) continue;

      const nearestCity = nearestCityInfo.city;
      const cityId = nearestCity._id;

      // Count how many passengers want to go to this city
      const score = destinationCityIds.filter(destId => destId === cityId).length;

      // Only consider stations near cities that passengers want to reach
      if(score > 0) {
        stationScores[station._id] = score;
      }
    }

    // Find station with highest score
    let bestStation = null;
    let maxScore = 0;
    for(const station of stations) {
      const score = stationScores[station._id] || 0;
      if(score > maxScore) {
        maxScore = score;
        bestStation = station;
      }
    }

    return bestStation;
  }

  // will choose a destination based on passenger demand
  findDestination() {
    // PRIORITY 1: If we have passengers on board, take them to their destination
    if(this.passengers && this.passengers.length > 0) {
      const bestStation = this.findBestDestinationForPassengers();
      if(bestStation) {
        this.destStation = bestStation;
        this.setPath();
        return;
      }
    }

    // PRIORITY 2: Go pick up waiting passengers
    // Get all stations
    const stations = this.map.getStations();
    if(stations.length === 0) return;

    // Count people waiting at each station
    const stationDemand = {};
    for(const s of stations) {
      stationDemand[s._id] = this.map.countPeopleNearStation(s);
    }

    // Find station with most waiting passengers (excluding current station)
    let bestStation = null;
    let maxPeople = 0;

    for(const station of stations) {
      if(station._id === this.fromStation._id) continue; // Skip current station
      const demand = stationDemand[station._id];
      if(demand > maxPeople) {
        maxPeople = demand;
        bestStation = station;
      }
    }

    // PRIORITY 3: Fallback - Stop and wait if no demand
    if(!bestStation || maxPeople === 0) {
      // Old logic: Fallback to random if no people waiting anywhere
      // const availableStations = stations.filter(s => s._id !== this.fromStation._id);
      // if(availableStations.length === 0) return;
      // bestStation = availableStations[_.random(availableStations.length - 1)];

      // New logic: Wait for passengers
      // console.log('Train', this._id, ': no demand, waiting...');
      this.destStation = null;
      return;
    }

    this.destStation = bestStation;
    if(!this.destStation) return;
    if(this.destStation._id === this.fromStation._id) return console.error('on self');
    // console.log('======= New Trip:', this.fromStation._id, '=>', this.destStation._id, 'demand:', maxPeople);
    this.setPath();
  }

  setPath() {
    const self = this;

    // Validate inputs (legitimate check, not defensive coding)
    if(!this.fromStation || !this.destStation) {
      console.error('Train', this._id, ': setPath called with invalid stations (from:', !!this.fromStation, 'dest:', !!this.destStation, ')');
      console.error('  This is a BUG - setPath should never be called without valid stations');
      this.path = [];
      return;
    }

    this.path = _.map(PathFinder.path(this.fromStation, this.destStation), function(id) {
      // console.log("Station", id);
      return self.map.getObjectById(id);
    });
    // console.log('len', this.path.length);
    if(this.path.length === 0) this.destStation = null;
  }

  objToSave() {
    const self = this;
    // console.log('len to map', this.path.length);
    return {
      // game_id: this.map._id,
      pos: this.pos,
      progress: this.progress,
      running: this.running, // Deprecated, kept for backward compatibility
      state: this.state,
      stateStartTime: this.stateStartTime,
      stateDuration: this.stateDuration,
      hasUnloaded: this.hasUnloaded,
      hasLoaded: this.hasLoaded,
      fromStation: this.fromStation ? this.fromStation._id : null,
      destStation: this.destStation ? this.destStation._id : null,
      nextStation: this.nextStation ? this.nextStation._id : null,
      path: _.compact(_.map(self.path, function(s) {
        if(s && s._id) return s._id;
      })),
      passengers: this.passengers || [],
      capacity: this.capacity,
      maxSpeed: this.maxSpeed
    };
  }

  updateFromDB(doc) {
    // console.log('Train#updateFromDB', doc);
    const self = this;
    if(doc.pos) {
      this.from = _.clone(this.pos);
      if(doc.pos) this.pos = doc.pos;
      this.hasMoved = true;

      // Initialize displayPos if not set (first update)
      if(!this.displayPos) {
        this.displayPos = _.clone(this.pos);
      }
    }
    if(typeof(doc.progress) !== "undefined") this.progress = doc.progress;
    // State properties (running is now computed from state)
    if(doc.state) this.state = doc.state;
    if(typeof(doc.stateStartTime) !== "undefined") this.stateStartTime = doc.stateStartTime;
    if(typeof(doc.stateDuration) !== "undefined") this.stateDuration = doc.stateDuration;
    if(typeof(doc.hasUnloaded) !== "undefined") this.hasUnloaded = doc.hasUnloaded;
    if(typeof(doc.hasLoaded) !== "undefined") this.hasLoaded = doc.hasLoaded;
    if(doc.fromStation) this.fromStation = this.map.getObjectById(doc.fromStation);
    if(doc.destStation) this.destStation = this.map.getObjectById(doc.destStation);
    if(doc.nextStation) this.nextStation = this.map.getObjectById(doc.nextStation);
    if(doc.path) this.path = _.compact(_.map(doc.path, function(id) {return self.map.getObjectById(id);}));
    if(doc.passengers) this.passengers = doc.passengers;
    if(typeof(doc.capacity) !== "undefined") this.capacity = doc.capacity;
    if(typeof(doc.maxSpeed) !== "undefined") this.maxSpeed = doc.maxSpeed;
    // console.log('Train#updateFromDB', doc, "\n", 'this', this);
  }

  /**
   * Calculate priority score for a passenger based on train's path
   * Higher score = higher priority for boarding
   * @param {Person} passenger - The passenger to evaluate
   * @returns {number} Priority score (5-100)
   */
  calculatePassengerPriority(passenger) {
    // No destination known for passenger → medium priority
    if(!passenger.destinationCityId) return 30;

    // Train has no path/destination → all passengers equal priority
    if(!this.destStation || !this.path || this.path.length === 0) {
      return 50;
    }

    // Build list of cities served by this train's path
    const pathCities = [];

    // Next station (index 0 = highest priority)
    if(this.nextStation) {
      const nextCityInfo = this.map.findNearestCity(this.nextStation.pos);
      if(nextCityInfo) {
        pathCities.push({cityId: nextCityInfo.city._id, index: 0});
      }
    }

    // Stations in the path (index 1, 2, 3...)
    for(let i = 0; i < this.path.length; i++) {
      const station = this.path[i];
      const cityInfo = this.map.findNearestCity(station.pos);
      if(cityInfo) {
        pathCities.push({cityId: cityInfo.city._id, index: i + 1});
      }
    }

    // Check if passenger's destination matches any city on the path
    for(const item of pathCities) {
      if(item.cityId === passenger.destinationCityId) {
        // Score: 100 for next station, then -5 per index
        // Examples: index 0 = 100, index 1 = 95, index 2 = 90, etc.
        return 100 - (item.index * 5);
      }
    }

    // Destination not on path → very low priority
    return 5;
  }

  async getPassengers() {
    // Check if infinite capacity mode is enabled (Fun Mode!)
    let infiniteCapacity = false;
    if(Meteor.isServer) {
      const game = await Games.findOneAsync(this.map._id);
      infiniteCapacity = game && game.infiniteCapacityMode;
    }

    // 1. Collect all potential passengers at this station
    const potentialPassengers = [];
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      // Skip passengers already in a train
      if(obj.inTrain) continue;
      // Only board people at station (not wandering in city)
      if(obj.state !== Helpers.PersonStates.AT_STATION) continue;
      // Check if passenger is at the same station as the train (by station ID)
      if(obj.currentLocation === this.fromStation._id) {
        potentialPassengers.push(this.map.objects[i]);
      }
    }

    if(potentialPassengers.length === 0) return false;

    // 2. Calculate priority score for each passenger
    const passengersWithScores = potentialPassengers.map(p => ({
      passenger: p,
      score: this.calculatePassengerPriority(p)
    }));

    // 3. Sort by score descending (highest priority first)
    passengersWithScores.sort((a, b) => b.score - a.score);

    // 4. Board passengers in priority order until train is full
    let boarded = 0;
    for(const item of passengersWithScores) {
      // Check if train has capacity (unless infinite capacity mode is enabled)
      if(!infiniteCapacity && this.passengers.length >= this.capacity) {
        break; // Stop boarding when full
      }

      const p = item.passenger;
      // Board the passenger - update state
      p.inTrain = this._id;
      p.state = Helpers.PersonStates.IN_TRAIN;
      this.passengers.push(p._id);
      await p.updateDB();
      boarded++;
    }

    if(boarded) {
      // Enter LOADING state for specified duration
      this.setState(Helpers.TrainStates.LOADING, Helpers.trainLoadingDuration);
      return true; // Indicate that loading occurred
    }
    return false; // No passengers boarded
  }

  async leavePassengers() {
    // Find the nearest city to current station
    const nearestCityInfo = this.map.findNearestCity(this.pos);
    if(!nearestCityInfo) return false;

    const nearestCity = nearestCityInfo.city;
    let disembarked = 0;

    // Check each passenger in the train
    const remainingPassengers = [];
    for(const passengerId of this.passengers) {
      const passenger = this.map.getObjectById(passengerId);
      if(!passenger) continue; // passenger was removed

      // Check if passenger's destination matches the nearest city (use ID for robustness)
      if(passenger.destinationCityId && passenger.destinationCityId === nearestCity._id) {
        // Passenger reached destination - remove from game (despawn)
        await passenger.removeFromDB();
        disembarked++;
      } else {
        // Keep passenger in train
        remainingPassengers.push(passengerId);
      }
    }

    this.passengers = remainingPassengers;
    if(disembarked > 0) {
      // Calculate and generate revenue
      const baseRevenue = Helpers.passengerBaseRevenue;
      const capacityRatio = (this.passengers.length + disembarked) / this.capacity;
      const efficiencyBonus = capacityRatio > Helpers.passengerEfficiencyThreshold ? Helpers.passengerEfficiencyBonus : 0;
      const totalRevenue = disembarked * (baseRevenue + efficiencyBonus);

      // Credit revenue to team
      await Meteor.callAsync('teamAddRevenue', this.map._id, totalRevenue, disembarked);

      // Enter UNLOADING state for specified duration
      this.setState(Helpers.TrainStates.UNLOADING, Helpers.trainUnloadingDuration);
      return true; // Indicate that unloading occurred
    }
    return false; // No passengers disembarked
  }

}
