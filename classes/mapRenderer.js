import {Drawing, Geometry, Helpers} from "./helpers";
import {AnimationManager, FadeAnimation, Easing} from "./animationManager";

export class MapRenderer {

  constructor(mapGui) {
    this.map = mapGui;
    this.canvas = mapGui.canvas;
    this.ctx = mapGui.ctx;
    this.drawTime = 0;
  }

  /**
   * Main drawing method - called by AnimationManager
   * @param {number} timestamp - Current timestamp from RAF
   * @param {number} deltaTime - Time since last frame
   * @param {Map} animations - Active animations from AnimationManager
   */
  drawScene(timestamp, deltaTime, animations) {
    const time = new Date().getTime();
    if(!this.ctx) return;
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Layer 1: Cities (background)
    for(let i = 0; i < this.map.objects.length; i++) {
      if(this.map.objects[i].type !== 'city') continue;
      this.map.objects[i].draw();
    }

    // Layer 2: Stations and rails
    this.drawStations();

    // Layer 3: Trains (vehicles)
    // First, update all trains' display positions (client-side interpolation)
    for(let i = 0; i < this.map.objects.length; i++) {
      if(this.map.objects[i].type !== 'train') continue;
      // Call update() to calculate displayPos based on progress and state
      if(typeof this.map.objects[i].update === 'function') {
        this.map.objects[i].update(deltaTime);
      }
    }
    // Then, draw all trains using their updated displayPos
    for(let i = 0; i < this.map.objects.length; i++) {
      if(this.map.objects[i].type !== 'train') continue;
      this.map.objects[i].draw();
    }

    // Layer 4: Persons (NPCs)
    // First, update all persons' visual positions (client-side interpolation)
    for(let i = 0; i < this.map.objects.length; i++) {
      if(this.map.objects[i].type !== 'person') continue;
      // Call update() to calculate visualPos based on state and time
      if(typeof this.map.objects[i].update === 'function') {
        this.map.objects[i].update(deltaTime);
      }
    }
    // Then, draw all persons using their updated visualPos
    for(let i = 0; i < this.map.objects.length; i++) {
      if(this.map.objects[i].type !== 'person') continue;
      this.map.objects[i].draw();
    }

    // Layer 5: Effects (animations) - Draw all active animations
    if(animations) {
      for(const [id, animation] of animations) {
        if(animation.drawCallback && typeof animation.drawCallback === 'function') {
          animation.drawCallback(this.ctx);
        }
      }
    }

    this.drawMapBorder();
    this.drawCenter();
    this.drawTime = (new Date().getTime()) - time;

    // Layer 6: UI overlays
    // Draw city placement zones with fade animation
    this.drawCityPlacementZones();

    // Display passenger destinations for all trains
    this.drawTrainPassengerInfo();

    // Display game logs
    this.drawGameLogs();

    // Display total waiting passengers
    this.drawPassengerStats();

    // Display spawn rate and game phase information
    this.drawSpawnInfo();

    // Draw temporary station being created (if any)
    // This ensures the temporary link remains visible during fade animations
    if(this.map.inputManager && this.map.inputManager.currentStation && this.map.mousePos) {
      this.drawCurrentLink({
        pageX: this.map.mousePos.x + this.canvas.offsetLeft,
        pageY: this.map.mousePos.y + this.canvas.offsetTop,
        target: this.canvas
      });
    }
  }

  drawStations() {
    const z = this.map.dispo.zoom;
    const self = this;
    // first draw segments
    _.each(this.map.objects, function(station) {
      if(station.type !== 'station') return;
      // console.log('drawing station', station);
      // draw children
      let size = z * (self.map.dispo.linkSize);
      // if(size > self.dispo.linkSize) size = self.dispo.linkSize;
      self.ctx.lineWidth = size;

      self.ctx.strokeStyle = '#666';
      _.each(station.children, function(p) {
        if(typeof (p) === 'string') return;
        Drawing.drawLine(self.ctx, self.map.relToRealCoords(station.pos), self.map.relToRealCoords(p.pos));
      });
    });

    // draw the stations
    _.each(this.map.objects, function(station) {
      if(station.type !== 'station') return;
      station.draw();
    });

    // then links
    _.each(this.map.objects, function(station) {
        if(station.type !== 'station') return;
        // draw children
        self.ctx.lineWidth = 2;
        self.ctx.strokeStyle = '#fff';
        self.ctx.fillStyle = '#fff';
        _.each(station.children, function(child) {
          if(typeof (child) === 'string') return;
          const distInKm = Geometry.dist(station.pos, child.pos) * Helpers.pixelMeter / 1000;
          if(self.map.dispo.zoom >= 0.5)
            Drawing.drawArrow(self.ctx, self.map.relToRealCoords(station.pos), self.map.relToRealCoords(child.pos), 0.2);
          // display length
          if(
            (self.map.dispo.zoom >= 0.05 && distInKm > 50) ||
            (self.map.dispo.zoom >= 0.08 && distInKm > 20) ||
            (self.map.dispo.zoom >= 0.14 && distInKm > 10) ||
            self.map.dispo.zoom >= 0.45
          )
            Drawing.text(self.ctx, Helpers.gameDist(Geometry.dist(station.pos, child.pos)), self.map.relToRealCoords(Geometry.middlePoint(station.pos, child.pos)));
        });
      },
    );
  }

  // Draw radius circles around cities to show placement zones
  drawCityPlacementZones() {
    const cities = this.map.getCities();
    const maxDistance = Helpers.cityStationPlacementRadius;

    // State machine for fade animation using AnimationManager
    const now = Date.now();
    const timeSinceMove = now - this.map.cityZoneLastMouseMove;

    // Determine if we need to start/stop fade animations
    if(timeSinceMove < 100) {
      // Mouse is moving - fade in
      if(!this.map.animationManager.hasAnimation('cityZoneFadeIn')) {
        // Remove fade-out if it exists
        this.map.animationManager.removeAnimation('cityZoneFadeOut');

        // Start fade-in animation
        const fadeIn = new FadeAnimation('cityZoneFadeIn', {
          from: this.map.cityZoneFadeOpacity,
          to: 1,
          duration: 1100, // ~1.1 seconds
          easing: Easing.easeOutQuad,
          onUpdate: (progress) => {
            this.map.cityZoneFadeOpacity = fadeIn.getOpacity();
          }
        });
        this.map.animationManager.addAnimation(fadeIn);
      }
    } else if(timeSinceMove > this.map.cityZoneIdleDelay) {
      // Mouse has been idle - fade out
      if(!this.map.animationManager.hasAnimation('cityZoneFadeOut')) {
        // Remove fade-in if it exists
        this.map.animationManager.removeAnimation('cityZoneFadeIn');

        // Start fade-out animation
        const fadeOut = new FadeAnimation('cityZoneFadeOut', {
          from: this.map.cityZoneFadeOpacity,
          to: 0,
          duration: 1100,
          easing: Easing.easeInQuad,
          onUpdate: (progress) => {
            this.map.cityZoneFadeOpacity = fadeOut.getOpacity();
          }
        });
        this.map.animationManager.addAnimation(fadeOut);
      }
    }

    // Don't draw if fully transparent (optimization)
    if(this.map.cityZoneFadeOpacity <= 0.01) return;

    // Apply fade to normal circles
    const normalOpacity = 0.3 * this.map.cityZoneFadeOpacity;
    this.ctx.strokeStyle = `rgba(100, 200, 255, ${normalOpacity})`;
    this.ctx.lineWidth = 2;

    for(const city of cities) {
      const cityPos = this.map.relToRealCoords(city.pos);
      const radiusInPixels = maxDistance * this.map.dispo.zoom;
      Drawing.drawCircle(this.ctx, cityPos, radiusInPixels);
    }

    // Highlight nearest city
    if(this.map.mouseRelPos) {
      const nearestCityInfo = this.map.findNearestCity(this.map.mouseRelPos);
      if(nearestCityInfo && nearestCityInfo.dist <= maxDistance) {
        const highlightOpacity = 0.6 * this.map.cityZoneFadeOpacity;
        const cityPos = this.map.relToRealCoords(nearestCityInfo.city.pos);
        this.ctx.strokeStyle = `rgba(100, 255, 100, ${highlightOpacity})`;
        this.ctx.lineWidth = 3;
        Drawing.drawCircle(this.ctx, cityPos, maxDistance * this.map.dispo.zoom);
      }
    }
  }

  drawCurrentLink(e) {
    if(!this.map.inputManager.currentStation) return;
    // Used snappedMouseCoords from input manager if available, else recalc
    const c = this.map.inputManager.snappedMouseCoords(e);
    const cRel = this.map.inputManager.relMouseCoords(e);
    
    this.ctx.lineWidth = this.map.dispo.zoom * this.map.dispo.linkSize;
    const cpos = this.map.relToRealCoords(this.map.inputManager.currentStation.pos);
    this.ctx.strokeStyle = '#666';
    Drawing.drawLine(this.ctx, cpos, c);
    Drawing.drawPoint(this.ctx, cpos, this.map.dispo.mouseSize * this.map.dispo.zoom);
    Drawing.drawPoint(this.ctx, c, this.map.dispo.mouseSize * this.map.dispo.zoom);

    // Highlight merge target station if mouse is close to an existing station
    const mergeRadius = (this.map.dispo.stationSize * 2) / this.map.dispo.zoom;
    const nearbyStations = this.map.getNearestStations(cRel, mergeRadius);

    // Check if we're starting from an existing station or creating new one
    const startOverlaps = this.map.getNearestStations(this.map.inputManager.currentStation.pos, mergeRadius);
    const isStartExisting = startOverlaps.length > 0;

    if(nearbyStations.length > 0) {
      const targetStation = nearbyStations[0].station;

      // Don't highlight if it's the same station we started from (can't connect to itself)
      if(!isStartExisting || targetStation._id !== startOverlaps[0].station._id) {
        const targetPos = this.map.relToRealCoords(targetStation.pos);

        // Draw glowing highlight around target station
        this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
        this.ctx.lineWidth = 4;
        const highlightRadius = this.map.dispo.zoom * this.map.dispo.stationSize * 1.5;
        Drawing.drawCircle(this.ctx, targetPos, highlightRadius);

        // Draw smaller inner circle
        this.ctx.strokeStyle = 'rgba(150, 255, 150, 0.6)';
        this.ctx.lineWidth = 2;
        Drawing.drawCircle(this.ctx, targetPos, highlightRadius * 0.7);
      }
    }
  }

  drawTrainPassengerInfo() {
    const trains = this.map.getTrains();
    if(trains.length === 0) return;

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#fff';

    let yOffset = 20;

    for(const train of trains) {
      const trainIdShort = train._id.substring(0, 6);
      const passengerCount = train.passengers ? train.passengers.length : 0;
      const capacity = train.capacity || 10;
      const maxSpeed = train.maxSpeed || 180;

      // Build train info line: "Train [id] (3/10, 180km/h): destinations"
      let text = `Train ${trainIdShort} (${passengerCount}/${capacity}, ${maxSpeed}km/h)`;

      // Add destinations if there are passengers
      if(passengerCount > 0) {
        // Build list of destination cities
        const destinations = [];
        for(const passengerId of train.passengers) {
          const passenger = this.map.getObjectById(passengerId);
          if(passenger && passenger.destinationCityId) {
            const city = this.map.getObjectById(passenger.destinationCityId);
            if(city && city.name) {
              destinations.push(city.name);
            }
          }
        }

        if(destinations.length > 0) {
          // Count occurrences of each destination
          const destinationCounts = {};
          for(const dest of destinations) {
            destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
          }

          // Format output: "2× Paris, 1× Lyon" (sorted by count DESC)
          const destText = Object.entries(destinationCounts)
            .sort((a, b) => b[1] - a[1])  // Sort by count descending
            .map(([city, count]) => count > 1 ? `${count}× ${city}` : city)
            .join(', ');

          text += `: ${destText}`;
        }
      }

      // Draw background
      const textMetrics = this.ctx.measureText(text);
      const textWidth = textMetrics.width;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(10, yOffset - 14, textWidth + 20, 20);

      // Draw text
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(text, 20, yOffset);

      yOffset += 25;
    }
  }

  drawMouse() {
    if(!this.map.game.canModifyMap()) return;
    const c = this.map.mouseSnappedCoords;
    if(!c) return;

    // display mouse
    let size = this.map.dispo.mouseSize * this.map.dispo.zoom;
    Drawing.drawPoint(this.ctx, c, size);
  }

  drawMapBorder() {
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#999';
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.stroke();
  }

  drawCenter() {
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#999';
    this.ctx.beginPath();
    this.ctx.moveTo(this.map.pan.x - 5, this.map.pan.y);
    this.ctx.lineTo(this.map.pan.x + 5, this.map.pan.y);
    this.ctx.moveTo(this.map.pan.x, this.map.pan.y - 5);
    this.ctx.lineTo(this.map.pan.x, this.map.pan.y + 5);
    this.ctx.stroke();
  }

  // Format timestamp as HH:MM:SS
  formatLogTime(timestamp) {
    if (!timestamp) return '--:--:--';
    const date = new Date(timestamp);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Format action text based on type and details
  formatLogAction(action, details) {
    switch(action) {
      case 'game_created':
        return `created game "${details.gameName || 'Untitled'}"`;
      case 'rail_built':
        return `built rail ${details.fromCity || '?'} - ${details.toCity || '?'}`;
      case 'rail_connected':
        return `connected ${details.fromCity || '?'} → ${details.toCity || '?'}`;
      case 'stations_removed':
        if (details.cityNames && details.cityNames.length > 1) {
          return `removed stations ${details.cityNames.join(', ')}`;
        } else if (details.cityNames && details.cityNames.length === 1) {
          return `removed station near ${details.cityNames[0]}`;
        }
        return 'removed station';
      case 'station_inserted':
        return `inserted station near ${details.cityName || 'Unknown'}`;
      case 'station_placed':
        return `placed station near ${details.cityName || 'Unknown'}`;
      case 'station_removed':
        return `removed station near ${details.cityName || 'Unknown'}`;
      case 'station_moved':
        if (details.oldCityName === details.newCityName) {
          return `moved station within ${details.newCityName || 'Unknown'}`;
        } else {
          return `moved station from ${details.oldCityName || '?'} to ${details.newCityName || '?'}`;
        }
      default:
        return action;
    }
  }

  // Draw game logs panel on canvas (bottom-left corner)
  drawGameLogs() {
    // Get logs from reactive collection
    const logs = GameLogs.find(
      {game_id: this.map._id},
      {sort: {timestamp: 1}, limit: 10}
    ).fetch();

    if (logs.length === 0) return;

    const padding = 10;
    const lineHeight = 18;
    const fontSize = 12;
    const panelPadding = 8;

    // Calculate panel dimensions
    const panelWidth = 350;
    const panelHeight = (logs.length * lineHeight) + (panelPadding * 2);

    // Position: bottom-left corner
    const panelX = padding;
    const panelY = this.canvas.height - panelHeight - padding;

    // Draw logs (oldest to newest, bottom is newest)
    this.ctx.font = `${fontSize}px monospace`;

    logs.forEach((log, index) => {
      // Calculate opacity (gradient: oldest = 0.1, newest = 1.0)
      const opacity = 0.1 + ((index + 1) / logs.length) * 0.9;

      const y = panelY + panelPadding + ((index + 1) * lineHeight);

      // Format time
      const time = this.formatLogTime(log.timestamp);

      // Format action
      const action = this.formatLogAction(log.action, log.details);

      // Draw time (gray)
      this.ctx.fillStyle = `rgba(136, 136, 136, ${opacity})`;
      this.ctx.fillText(`[${time}]`, panelX + panelPadding, y);

      // Draw user name (blue)
      this.ctx.fillStyle = `rgba(110, 181, 255, ${opacity})`;
      this.ctx.fillText(`${log.user.name}:`, panelX + panelPadding + 70, y);

      // Draw action (white)
      this.ctx.fillStyle = `rgba(221, 221, 221, ${opacity})`;
      const actionX = panelX + panelPadding + 70 + (log.user.name.length * 7) + 5;
      this.ctx.fillText(action, actionX, y);
    });
  }

  // Draw passenger statistics in top-left corner
  drawPassengerStats() {
    // Count passengers by state
    let waiting = 0;
    let walking = 0;
    let inTrain = 0;
    let total = 0;

    for(const obj of this.map.objects) {
      if(obj.type !== 'person') continue;
      total++;
      
      if(obj.inTrain) {
        inTrain++;
      } else {
        // If not in train, they are on the map (waiting or walking)
        if (obj.state === Helpers.PersonStates.WALKING_TO_STATION) {
          walking++;
        } else {
          waiting++;
        }
      }
    }

    const x = 15;
    const y = 40;

    const text = `Passengers: ${total} (Waiting: ${waiting}, Walking: ${walking}, In Train: ${inTrain})`;
    
    this.ctx.font = '14px sans-serif';

    // Draw text
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(text, x + 5, y);
  }

  drawSpawnInfo() {
    // Get game data from reactive collection
    const game = Games.findOne(this.map._id);
    if(!game) return;

    const x = 15;
    const y = 62; // Below passenger stats (which is at y=40)

    // Build the info text
    let infoText = '';

    if(typeof game.gameDurationMinutes !== 'undefined') {
      infoText += `Time: ${game.gameDurationMinutes.toFixed(1)}m`;
    }

    if(typeof game.currentSpawnRate !== 'undefined') {
      if(infoText) infoText += ' | ';
      infoText += `Spawn: ${game.currentSpawnRate} pax/min`;
    }

    if(game.spawnPhaseDescription) {
      if(infoText) infoText += ' | ';
      infoText += `Phase: ${game.spawnPhaseDescription}`;
    }

    // Only draw if we have some data
    if(!infoText) return;

    this.ctx.font = '14px sans-serif';

    // Draw text with yellow color to distinguish from passenger stats
    this.ctx.fillStyle = '#ff0';
    this.ctx.fillText(infoText, x + 5, y);
  }

  // Given a pos try to redraw the portion of this map (links for example)
  drawSection(pos) {
    // draw a back box over the position to erase movement trace
    const size = this.map.dispo.stationSize * 2.2 * this.map.dispo.zoom;
    const a = this.map.relToRealCoords(pos);
    a.x = a.x - size / 2;
    a.y = a.y - size / 2;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(a.x, a.y, size, size);
  }

}


