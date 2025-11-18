import {DBObject} from "./dbobject";
import {Drawing, Geometry, Helpers} from "./helpers";

export class Person extends DBObject {

  constructor(doc) {
    const properties = {
      map: null,
      ctx: null,
      type: 'person',
      pos: {x: 0, y: 0},
      birthAt: null,
      birthDate: null,
      health: 100,
      speed: 5,
      destinationCity: null,
      destinationCityId: null,
      inTrain: null,
    };
    super(properties, doc);
    this.updateFromDB(doc); // Transform string IDs to resolved objects
  }

  async update(clock) {
    // death
    if(this.health <= 0) return await this.removeFromDB();

    // if in train, don't move
    if(this.inTrain) return;

    // movement
    // get persons around
    // make a average of pos
    if(!(await this.moveTowardsNearestStation()))
      // this.moveTowardsNearestStation();
      await this.moveTowardsPersons();
  }

  async moveTowardsNearestStation() {

    const station = this.map.getNearestStation(this.pos, Helpers.maxDistGetNearestStation);
    if(!station) return false;
    const old = _.clone(this.pos);
    const maxdist = 25;
    const randomness = _.random(2);

    // Move towards station if outside the target zone
    if(this.pos.x < station.pos.x - maxdist) {
      this.pos.x += this.speed + randomness;
    } else if(this.pos.x > station.pos.x + maxdist) {
      this.pos.x -= this.speed + randomness;
    }

    if(this.pos.y < station.pos.y - maxdist) {
      this.pos.y += this.speed + randomness;
    } else if(this.pos.y > station.pos.y + maxdist) {
      this.pos.y -= this.speed + randomness;
    }

    if(_.isEqual(old, this.pos)) return false;
    await this.updateDB();
    return true;
  }

  async moveTowardsPersons() {
    let x = 0;
    let y = 0;
    let nb = 0;
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      if(Geometry.dist(this.pos, obj.pos) < 200) {
        x += obj.pos.x;
        y += obj.pos.y;
        nb++;
      }
    }

    if(nb > 1) {
      const old = _.clone(this.pos);
      x = Math.round(x / nb);
      y = Math.round(y / nb);
      // if(this.pos.x === x) this.pos.x += -speed + _.random(speed * 2);
      // if(this.pos.y === y) this.pos.y += -speed + _.random(speed * 2);
      if(Geometry.dist(this.pos, {x: x, y: y}) < nb / 2) return false;
      const randomness = _.random(2);
      if(this.pos.x < x) this.pos.x += this.speed + randomness;
      else if(this.pos.x > x) this.pos.x -= this.speed + randomness;
      if(this.pos.y < y) this.pos.y += this.speed + randomness;
      else if(this.pos.y > y) this.pos.y -= this.speed + randomness;
      if(_.isEqual(old, this.pos)) return false;
      await this.updateDB();
    }
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
  }

}

export class PersonGui extends Person {

  constructor(doc) {
    super(doc);
    this.ctx = this.map.ctx;
  }

  draw() {
    // Don't draw passengers that are inside a train
    if(this.inTrain) return;

    const size = this.map.dispo.zoom * 4;
    this.ctx.fillStyle = '#ff0';
    const rpos = this.map.relToRealCoords(this.pos);
    Drawing.drawPoint(this.ctx, rpos, size);

    // Check if mouse is hovering over this person
    const isHovering = this.map.mouseRelPos && Geometry.dist(this.pos, this.map.mouseRelPos) < 30;

    // Display destination on hover
    if(isHovering) {
      // Lazy resolution: if we have the ID but not the object, try to resolve it
      if(this.destinationCityId && !this.destinationCity) {
        this.destinationCity = this.map.getObjectById(this.destinationCityId);
      }

      // Only display if we have a valid destination city with a name
      if(this.destinationCity && this.destinationCity.name) {
        const fontSize = Math.max(16, 16 * this.map.dispo.zoom);
        this.ctx.font = `bold ${fontSize}px sans-serif`;

        const destinationText = '→ ' + this.destinationCity.name;
        const textMetrics = this.ctx.measureText(destinationText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        const textX = rpos.x - textWidth / 2;
        const textY = rpos.y - size - 8;

        // Draw background rectangle
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(textX - 4, textY - textHeight, textWidth + 8, textHeight + 6);

        // Draw text
        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText(destinationText, textX, textY);
      }
    }

    // draw name
    if(this.map.dispo.zoom > 5) {
      const dist = Math.round(Geometry.dist(this.birthAt, this.pos) * Helpers.pixelMeter);
      const age = Math.round((new Date() - this.birthDate) / 1000);
      this.ctx.fillStyle = '#999';
      this.ctx.font = '14px sans';
      this.ctx.fillText(dist + 'm, ' + Helpers.toHHMMSS(age), rpos.x + 20, rpos.y);
      // this.ctx.fillStyle = '#800';
      // this.ctx.font = '14px sans';
      // this.ctx.fillText(this._id, rpos.x - 20, rpos.y + size + 40);
    }
  }

}
