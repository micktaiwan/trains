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
    console.log(`Train ${this._id}: state=${newState}, duration=${duration}ms`);
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
            // Save state to DB immediately so DDP can sync to client
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
            // Save state to DB immediately so DDP can sync to client
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
        }
        // If not complete, do nothing this tick (wait)
      }
      else if(this.state === Helpers.TrainStates.MOVING) {
        // Move toward next station
        await this.goTowardNextStop();
        this.hasMoved = true;
      }
    }
    if(!this.fromStation) await this.removeFromDB(); // no rails, remove the train
    else await this.updateDB();
  }

  // update train position
  async goTowardNextStop() {
    if(!this.nextStation) {
      this.nextStation = this.path.shift();
      this.progress = 0;
    }
    if(!this.nextStation) {
      this.setState(Helpers.TrainStates.STOPPED);
      return; // end of path
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
    }
      // calculate vector to goal
    // console.log('from', this.fromStation, 'dest', this.nextStation);
    else
      this.pos = Geometry.getProgressPos(v, this.progress / 100);
    // console.log(this.progress, this.pos, this.fromStation._id, this.nextStation._id);
  }

  checkStations() {
    //check if the stations are still alive
    if(!this.fromStation) {
      console.log('Train', this._id, ': fromStation is null, trying to recover...');
      // Try to find nearest station as recovery
      const nearestStation = this.map.getNearestStation(this.pos, -1);
      if(nearestStation) {
        console.log('Train', this._id, ': recovered, now at station', nearestStation._id);
        this.fromStation = nearestStation;
        this.destStation = null; // Clear destination to trigger recalculation
        this.nextStation = null;
        this.path = [];
        this.setState(Helpers.TrainStates.STOPPED);
        return;
      }
      console.log('Train', this._id, ': no stations found, stopping');
      this.setState(Helpers.TrainStates.STOPPED);
      return;
    }

    // Refresh fromStation reference from map (in case it was updated)
    const refreshedFrom = this.map.getObjectById(this.fromStation._id);
    if(!refreshedFrom) {
      console.log('Train', this._id, ': fromStation', this.fromStation._id, 'no longer exists (possibly merged), finding nearest...');
      // Station was removed (merged) - find nearest station
      const nearestStation = this.map.getNearestStation(this.pos, -1);
      if(nearestStation) {
        console.log('Train', this._id, ': recovered from merge, now at station', nearestStation._id);
        this.fromStation = nearestStation;
        this.pos = nearestStation.pos;
        this.destStation = null; // Clear destination to trigger recalculation
        this.nextStation = null;
        this.path = [];
        this.setState(Helpers.TrainStates.STOPPED);
        return;
      }
      console.log('Train', this._id, ': could not recover from merge, stopping');
      this.setState(Helpers.TrainStates.STOPPED);
      return;
    }
    this.fromStation = refreshedFrom;

    if(!this.nextStation) return;

    // Check if nextStation still exists
    const refreshedNext = this.map.getObjectById(this.nextStation._id);
    if(!refreshedNext) {
      console.log('Train', this._id, ': nextStation', this.nextStation._id, 'no longer exists, shifting to next in path');
      this.nextStation = this.path.shift();
      if(!this.nextStation) {
        console.log('Train', this._id, ': path is empty, recalculating...');
        this.setState(Helpers.TrainStates.STOPPED);
        this.destStation = null;
      }
      return;
    }
    this.nextStation = refreshedNext;

    // reset path if the next is not a child of from anymore
    const children = _.map(this.fromStation.children, function(child) {return child._id;});
    if(!children.includes(this.nextStation._id)) {
      console.log('Train', this._id, ': nextStation is no longer a child of fromStation, recalculating path');

      // This should not happen if updateTrainsAfterMerge() did its job properly
      // But if it does, recalculate the path
      if(this.destStation && this.fromStation._id !== this.destStation._id) {
        console.log('Train', this._id, ': recalculating path as fallback');
        this.setPath();
        this.nextStation = this.path.shift();
      } else {
        // No destination or already at destination
        console.log('Train', this._id, ': stopping (no valid destination)');
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
        console.log('Train', this._id, ': taking', this.passengers.length, 'passengers to their destination');
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

    // PRIORITY 3: Fallback to random if no people waiting anywhere
    if(!bestStation || maxPeople === 0) {
      // Filter out current station
      const availableStations = stations.filter(s => s._id !== this.fromStation._id);
      if(availableStations.length === 0) return;
      bestStation = availableStations[_.random(availableStations.length - 1)];
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

  async getPassengers() {
    let nb = 0;
    const passengers = [];
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      // Skip passengers already in a train
      if(obj.inTrain) continue;
      if(Geometry.dist(this.pos, obj.pos) < Helpers.getPassengersRadius) {
        nb++;
        passengers.push(this.map.objects[i]);
      }
    }
    let boarded = 0;
    for(const p of passengers) {
      // Check if train has capacity
      if(this.passengers.length >= this.capacity) {
        console.log('train is full, cannot board more passengers');
        break; // Stop boarding when full
      }

      // Board the passenger
      p.inTrain = this._id;
      this.passengers.push(p._id);
      await p.updateDB();
      boarded++;
    }
    if(boarded) {
      console.log('train boarded', boarded, 'people');
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
      console.log('train disembarked', disembarked, 'people at', nearestCity.name);

      // Calculate and generate revenue
      const baseRevenue = Helpers.passengerBaseRevenue;
      const capacityRatio = (this.passengers.length + disembarked) / this.capacity;
      const efficiencyBonus = capacityRatio > Helpers.passengerEfficiencyThreshold ? Helpers.passengerEfficiencyBonus : 0;
      const totalRevenue = disembarked * (baseRevenue + efficiencyBonus);

      // Credit revenue to team
      await Meteor.callAsync('teamAddRevenue', this.map._id, totalRevenue, disembarked);
      console.log(`Revenue generated: $${totalRevenue} (${disembarked} passengers × $${baseRevenue + efficiencyBonus})`);

      // Enter UNLOADING state for specified duration
      this.setState(Helpers.TrainStates.UNLOADING, Helpers.trainUnloadingDuration);
      return true; // Indicate that unloading occurred
    }
    return false; // No passengers disembarked
  }

}
