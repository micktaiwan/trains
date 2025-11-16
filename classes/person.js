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
    };
    super(properties, doc);
  }

  async update(clock) {
    // death
    if(this.health <= 0) return await this.removeFromDB();

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
    // FIXME P2: does not work
    if(this.pos.x < station.pos.x - maxdist) this.pos.x += this.speed + randomness;
    else if(this.pos.x > station.pos.x + maxdist) this.pos.x -= this.speed + randomness;
    else if(this.pos.x > station.pos.x - maxdist) this.pos.x -= this.speed + randomness;
    else if(this.pos.x < station.pos.x + maxdist) this.pos.x += this.speed + randomness;
    if(this.pos.y < station.pos.y - maxdist) this.pos.y += this.speed + randomness;
    else if(this.pos.y > station.pos.y + maxdist) this.pos.y -= this.speed + randomness;
    else if(this.pos.y > station.pos.y - maxdist) this.pos.y -= this.speed + randomness;
    else if(this.pos.y < station.pos.y + maxdist) this.pos.y += this.speed + randomness;
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
    };
  }

  updateFromDB(doc) {
    if(doc.pos) this.pos = doc.pos;
  }

}

export class PersonGui extends Person {

  constructor(doc) {
    super(doc);
    this.ctx = this.map.ctx;
  }

  draw() {
    const size = this.map.dispo.zoom * 2;
    this.ctx.fillStyle = '#ff0';
    const rpos = this.map.relToRealCoords(this.pos);
    Drawing.drawPoint(this.ctx, rpos, size);

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
