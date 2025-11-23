import {DBObject} from "./dbobject";
import {Drawing, Geometry, Helpers} from "./helpers";

export class Person extends DBObject {

  constructor(doc) {
    const properties = {
      map: null,
      ctx: null,
      type: 'person',
      pos: {x: 0, y: 0},           // Visual position (used by client for animation)
      birthAt: null,                // Initial spawn position
      birthDate: null,
      health: 100,
      speed: Helpers.personWalkingSpeed,
      destinationCity: null,
      destinationCityId: null,
      inTrain: null,
      // NEW: State machine properties
      state: Helpers.PersonStates.AT_CITY,
      currentLocation: null,        // City/Station ID where person is logically located
      targetStation: null,          // Station person is walking toward (if WALKING_TO_STATION)
      arrivalTime: null,            // Estimated arrival timestamp (Date.now() + travelTime)
      finalPos: null,               // Final position at station (calculated by server, used by client for smooth animation)
    };
    super(properties, doc);
    this.updateFromDB(doc); // Transform string IDs to resolved objects
  }

  async update(clock) {
    // death check
    if(this.health <= 0) return await this.removeFromDB();

    // State machine - only update DB on state changes
    let stateChanged = false;

    switch(this.state) {
      case Helpers.PersonStates.AT_CITY:
        // Person is wandering in a city
        // Check if a station is nearby and decide to walk to it
        stateChanged = await this.checkForNearbyStation();
        break;

      case Helpers.PersonStates.WALKING_TO_STATION:
        // Person is walking toward a station
        // Check if arrived (client will animate the walk)
        stateChanged = await this.checkArrivalAtStation();
        break;

      case Helpers.PersonStates.AT_STATION:
        // Person is waiting at station
        // Train will pick them up via getPassengers()
        // No action needed here
        break;

      case Helpers.PersonStates.IN_TRAIN:
        // Person is riding in train
        // Train will handle disembarkation
        // No action needed here
        break;
    }

    // Only save to DB if state changed (huge performance gain!)
    if(stateChanged) {
      await this.updateDB();
    }
  }

  /**
   * Check if there's a nearby station and decide to walk to it
   * @returns {boolean} true if state changed
   */
  async checkForNearbyStation() {
    const station = this.map.getNearestStation(this.pos, Helpers.maxDistGetNearestStation);
    if(!station) return false;

    // Random decision to walk to station (50% chance per tick)
    if(_.random(0, 1) === 0) return false;

    // Calculate estimated travel time based on distance and speed
    const dist = Geometry.dist(this.pos, station.pos);
    const ticksNeeded = Math.ceil(dist / this.speed); // number of server ticks needed
    const travelTime = ticksNeeded * Helpers.serverInterval; // milliseconds

    // Calculate final position at station (shared between server and client for smooth animation)
    this.finalPos = Geometry.randomPosInAnnulus(station.pos, Helpers.personMinStationDist, Helpers.personMaxStationDist);

    // Transition to WALKING_TO_STATION
    this.state = Helpers.PersonStates.WALKING_TO_STATION;
    this.targetStation = station._id;
    this.arrivalTime = Date.now() + travelTime;
    return true; // State changed
  }

  /**
   * Check if person arrived at target station (based on estimated time)
   * @returns {boolean} true if state changed
   */
  async checkArrivalAtStation() {
    if(!this.targetStation) {
      // No target station, return to city
      this.state = Helpers.PersonStates.AT_CITY;
      this.arrivalTime = null;
      this.finalPos = null;
      return true;
    }

    const station = this.map.getObjectById(this.targetStation);
    if(!station) {
      // Station no longer exists, return to city
      this.state = Helpers.PersonStates.AT_CITY;
      this.targetStation = null;
      this.arrivalTime = null;
      this.finalPos = null;
      return true;
    }

    // Check if estimated arrival time has passed
    if(this.arrivalTime && Date.now() >= this.arrivalTime) {
      // Arrived at station!
      this.state = Helpers.PersonStates.AT_STATION;
      this.currentLocation = station._id;
      // Use the pre-calculated final position (set in checkForNearbyStation)
      // This ensures client and server use the same position (no jump!)
      this.pos = this.finalPos || station.pos; // fallback to station center if finalPos is missing
      this.targetStation = null;
      this.arrivalTime = null;
      this.finalPos = null; // clear after use
      return true; // State changed
    }

    // Not arrived yet - client is animating the walk
    return false;
  }

  objToSave() {
    return {
      game_id: this.map._id,
      type: this.type,
      birthAt: this.birthAt,
      birthDate: this.birthDate,
      pos: this.pos,
      destinationCity: this.destinationCity ? this.destinationCity._id : null,
      inTrain: this.inTrain,
      // NEW: State machine properties
      state: this.state,
      currentLocation: this.currentLocation,
      targetStation: this.targetStation,
      arrivalTime: this.arrivalTime,
      finalPos: this.finalPos,
    };
  }

  updateFromDB(doc) {
    if(doc.pos) this.pos = doc.pos;
    if(doc.destinationCity) {
      // Always store the ID
      this.destinationCityId = doc.destinationCity;
      // Try to resolve the object (may be null if city not loaded yet)
      this.destinationCity = this.map.getObjectById(doc.destinationCity);
    }
    if(typeof(doc.inTrain) !== 'undefined') this.inTrain = doc.inTrain;

    // NEW: State machine properties
    if(doc.state) this.state = doc.state;
    if(doc.currentLocation) this.currentLocation = doc.currentLocation;
    if(doc.targetStation) this.targetStation = doc.targetStation;
    if(typeof(doc.arrivalTime) !== 'undefined') this.arrivalTime = doc.arrivalTime;
    if(doc.finalPos) this.finalPos = doc.finalPos;
  }

}

export class PersonGui extends Person {

  constructor(doc) {
    super(doc);
    this.ctx = this.map.ctx;

    // Client-side animation properties
    this.visualPos = _.clone(this.pos);        // Visual position (calculated locally)
    this.animationStartPos = _.clone(this.pos); // Position when animation started
    this.animationStartTime = null;             // Timestamp when animation started
    this.animationDuration = 0;                 // Duration of current animation (ms)
  }

  /**
   * Override updateFromDB to detect state changes and initialize animations
   */
  updateFromDB(doc) {
    const oldState = this.state;

    // Call parent updateFromDB
    super.updateFromDB(doc);

    // Ensure visualPos is initialized if it's missing (e.g. first load)
    if (!this.visualPos && this.pos) {
      this.visualPos = _.clone(this.pos);
    }

    // Detect state transitions and initialize animations
    if(oldState !== this.state) {
      if(this.state === Helpers.PersonStates.WALKING_TO_STATION && this.targetStation) {
        // Person started walking - initialize animation
        this.animationStartPos = _.clone(this.visualPos);
        this.animationStartTime = Date.now();

        // Use the server-calculated final position as visual target
        // This ensures client and server agree on the destination (no jump!)
        if(this.finalPos) {
          this.visualTarget = _.clone(this.finalPos);
        } else {
          // Fallback: use station center if finalPos is missing
          const targetStationObj = this.map.getObjectById(this.targetStation);
          if(targetStationObj) {
            this.visualTarget = targetStationObj.pos;
          }
        }

        // Calculate animation duration based on arrivalTime
        if(this.arrivalTime) {
          this.animationDuration = this.arrivalTime - Date.now();
        }

      } else if(this.state === Helpers.PersonStates.AT_STATION) {
        // Person arrived at station - snap to station position
        this.visualPos = _.clone(this.pos);
      }
    }
  }

  /**
   * Update visual position based on state and time (called by AnimationManager)
   * @param {number} deltaTime - Time elapsed since last frame (ms)
   */
  update(deltaTime) {
    if(this.state === Helpers.PersonStates.WALKING_TO_STATION && this.targetStation) {
      // Animate walking toward target station
      const targetStation = this.map.getObjectById(this.targetStation);
      if(!targetStation) {
        // Target station disappeared, stop animating
        return;
      }

      // Calculate progress based on time
      const elapsed = Date.now() - this.animationStartTime;
      const progress = this.animationDuration > 0 ? Math.min(1, elapsed / this.animationDuration) : 1;

      // Use random visual target if available, otherwise center
      const targetPos = this.visualTarget || targetStation.pos;
      
      // Ensure animationStartPos is set
      if(!this.animationStartPos && this.pos) {
        this.animationStartPos = _.clone(this.pos);
      }

      // Linear interpolation between start and target
      if(this.animationStartPos && targetPos) {
         this.visualPos = {
          x: this.animationStartPos.x + (targetPos.x - this.animationStartPos.x) * progress,
          y: this.animationStartPos.y + (targetPos.y - this.animationStartPos.y) * progress
        };
      }

      // Apply separation force to avoid walking on others
      this.applySeparation();

    } else if(this.pos) {
      // Not animating - use server position
      // Only reset visualPos if it's wildly different or missing (avoids snapping back every frame)
      if(!this.visualPos) {
        this.visualPos = _.clone(this.pos);
      }
      // Also apply separation when standing still
      this.applySeparation();
    }
  }

  applySeparation() {
    if(!this.visualPos) return;
    
    const radius = Helpers.personSeparationRadius || 20;
    const persons = this.map.getPersons();
    let sepX = 0;
    let sepY = 0;

    for(const p of persons) {
      if(p === this || !p.visualPos) continue;

      // Simple distance check
      const dx = this.visualPos.x - p.visualPos.x;
      const dy = this.visualPos.y - p.visualPos.y;
      // Squared distance check to avoid sqrt
      const distSq = dx*dx + dy*dy;
      const radiusSq = radius * radius;

      if(distSq > 0 && distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        // Avoid division by zero
        if(dist > 0.001) {
          const push = (radius - dist) / radius;
          // Add repulsion vector (normalized direction * magnitude)
          sepX += (dx / dist) * push * radius;
          sepY += (dy / dist) * push * radius;
        }
      }
    }

    // Apply separation with damping
    if(!Number.isNaN(sepX) && !Number.isNaN(sepY)) {
      this.visualPos.x += sepX * 0.1;
      this.visualPos.y += sepY * 0.1;
    }
  }

  /**
   * Calculate person color based on waiting time (age)
   * @param {number} ageSeconds - Age in seconds
   * @returns {string} - RGB color string
   */
  getColorByAge(ageSeconds) {
    // Color transitions:
    // 0-120s (0-2min): white (#fff) → yellow (#ff0)
    // 120-300s (2-5min): yellow (#ff0) → red (#f00)
    // >300s (>5min): bright red (#f00)

    if (ageSeconds < 120) {
      // 0-2 minutes: white to yellow
      const progress = ageSeconds / 120;
      return this.interpolateColor(
        {r: 255, g: 255, b: 255}, // white
        {r: 255, g: 255, b: 0},   // yellow
        progress
      );
    } else if (ageSeconds < 300) {
      // 2-5 minutes: yellow to red
      const progress = (ageSeconds - 120) / (300 - 120);
      return this.interpolateColor(
        {r: 255, g: 255, b: 0},   // yellow
        {r: 255, g: 0, b: 0},     // red
        progress
      );
    } else {
      // >5 minutes: bright red
      return '#f00';
    }
  }

  /**
   * Linear interpolation between two RGB colors
   * @param {Object} color1 - {r, g, b}
   * @param {Object} color2 - {r, g, b}
   * @param {number} progress - 0 to 1
   * @returns {string} - RGB color string
   */
  interpolateColor(color1, color2, progress) {
    const r = Math.round(color1.r + (color2.r - color1.r) * progress);
    const g = Math.round(color1.g + (color2.g - color1.g) * progress);
    const b = Math.round(color1.b + (color2.b - color1.b) * progress);
    return `rgb(${r}, ${g}, ${b})`;
  }

  draw() {
    // Don't draw passengers that are inside a train
    if(this.inTrain) return;

    // Calculate age for color and tooltip
    const ageSeconds = this.birthDate ? Math.round((new Date() - this.birthDate) / 1000) : 0;

    const size = this.map.dispo.zoom * 4;
    // Dynamic color based on waiting time
    this.ctx.fillStyle = this.getColorByAge(ageSeconds);
    // Use visualPos instead of pos for smooth client-side animation
    const rpos = this.map.relToRealCoords(this.visualPos);
    Drawing.drawPoint(this.ctx, rpos, size);

    // Check if mouse is hovering over this person (use visualPos for accuracy)
    const isHovering = this.map.mouseRelPos && Geometry.dist(this.visualPos, this.map.mouseRelPos) < 30;

    // Display destination and age on hover
    if(isHovering) {
      // Lazy resolution: if we have the ID but not the object, try to resolve it
      if(this.destinationCityId && !this.destinationCity) {
        this.destinationCity = this.map.getObjectById(this.destinationCityId);
      }

      // Build tooltip text
      const tooltipLines = [];

      // Add destination if available
      if(this.destinationCity && this.destinationCity.name) {
        tooltipLines.push('→ ' + this.destinationCity.name);
      }

      // Display real state + age
      const ageMinutes = Math.floor(ageSeconds / 60);
      const ageRemainingSeconds = ageSeconds % 60;

      let stateText = '';
      switch(this.state) {
        case Helpers.PersonStates.AT_CITY:
          stateText = 'Wandering in city';
          break;
        case Helpers.PersonStates.WALKING_TO_STATION:
          stateText = 'Walking to station';
          break;
        case Helpers.PersonStates.AT_STATION:
          stateText = '✓ At station (can board)';
          break;
        case Helpers.PersonStates.IN_TRAIN:
          stateText = 'In train';
          break;
        default:
          stateText = 'Unknown state';
      }

      const ageText = `${stateText} | ${ageMinutes}m ${ageRemainingSeconds}s`;
      tooltipLines.push(ageText);

      // Only display if we have something to show
      if(tooltipLines.length > 0) {
        const fontSize = Math.max(16, 16 * this.map.dispo.zoom);
        this.ctx.font = `bold ${fontSize}px sans-serif`;

        // Calculate dimensions for all lines
        const lineMetrics = tooltipLines.map(line => ({
          text: line,
          width: this.ctx.measureText(line).width
        }));
        const maxWidth = Math.max(...lineMetrics.map(m => m.width));
        const textHeight = fontSize;
        const lineSpacing = 4;
        const totalHeight = (textHeight * tooltipLines.length) + (lineSpacing * (tooltipLines.length - 1));

        const textX = rpos.x - maxWidth / 2;
        const textY = rpos.y - size - 8 - totalHeight;

        // Draw background rectangle
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(textX - 4, textY, maxWidth + 8, totalHeight + 6);

        // Draw text lines
        const personColor = this.getColorByAge(ageSeconds);
        this.ctx.fillStyle = personColor;
        tooltipLines.forEach((line, index) => {
          const lineY = textY + textHeight + (index * (textHeight + lineSpacing));
          this.ctx.fillText(line, textX, lineY);
        });
      }
    }

    // draw debug info when zoomed in
    if(this.map.dispo.zoom > 5) {
      const dist = Math.round(Geometry.dist(this.birthAt, this.pos) * Helpers.pixelMeter);
      this.ctx.fillStyle = '#999';
      this.ctx.font = '14px sans';
      this.ctx.fillText(dist + 'm, ' + Helpers.toHHMMSS(ageSeconds), rpos.x + 20, rpos.y);
      // this.ctx.fillStyle = '#800';
      // this.ctx.font = '14px sans';
      // this.ctx.fillText(this._id, rpos.x - 20, rpos.y + size + 40);
    }
  }

}
