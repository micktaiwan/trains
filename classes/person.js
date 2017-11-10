import {DBObject} from "./dbobject";
import {Drawing, Geometry} from "./helpers";

export class Person extends DBObject {

  constructor(doc) {
    const properties = {
      map: null,
      ctx: null,
      type: 'person',
      pos: {x: 0, y: 0}
    };
    super(properties, doc);
  }

  update(clock) {
    // death
    // if(0 === _.random(10000)) return this.removeFromDB();


    // movement
    // get persons around
    // make a average of pos
    let x = 0;
    let y = 0;
    let nb = 0;
    for(let i = 0; i < this.map.objects.length; i++) {
      const obj = this.map.objects[i];
      if(obj.type !== 'person') continue;
      if(Geometry.dist(this.pos, obj.pos) < 50) {
        x += obj.pos.x;
        y += obj.pos.y;
        nb++;
      }
    }

    if(nb > 1) {
      x = Math.round(x / nb);
      y = Math.round(y / nb);
      if(this.pos.x < x) this.pos.x += 1;
      else if(this.pos.x > x) this.pos.x -= 1;
      // else if(this.pos.x === x) this.pos.x += -2 + _.random(4);
      if(this.pos.y < y) this.pos.y += 1;
      else if(this.pos.y > y) this.pos.y -= 1;
      // else if(this.pos.y === y) this.pos.y += -2 + _.random(4);
      this.updateDB();
    }
  }

  objToSave() {
    return {pos: this.pos};
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
      this.ctx.fillStyle = '#999';
      this.ctx.font = '14px sans';
      this.ctx.fillText(this._id, rpos.x - 20, rpos.y);
      // this.ctx.fillStyle = '#800';
      // this.ctx.font = '14px sans';
      // this.ctx.fillText(this._id, rpos.x - 20, rpos.y + size + 40);
    }
  }

}