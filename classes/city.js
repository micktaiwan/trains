import {DBObject} from "./dbobject";
import {Drawing} from "./helpers";

export class City extends DBObject {

  constructor(doc) {
    const properties = {
      name: 'Unnamed',
      map: null,
      ctx: null,
      pos: {x: 0, y: 0},
      size: 10,
      color: '#fa0'
    };
    super(properties, doc);
  }


  update(clock) {

  }

}

export class CityGui extends City {

  constructor(doc) {
    super(doc);
  }

  draw() {
    const size = this.map.dispo.zoom * this.size;
    this.ctx.fillStyle = this.color;
    const rpos = this.map.relToRealCoords(this.pos);
    Drawing.drawPoint(this.ctx, rpos, size);

    // draw name
    if(this.map.dispo.zoom > 1) {
      this.ctx.fillStyle = '#999';
      this.ctx.font = '14px sans';
      this.ctx.fillText(this.name, rpos.x - 20, rpos.y);
      // this.ctx.fillStyle = '#800';
      // this.ctx.font = '14px sans';
      // this.ctx.fillText(this._id, rpos.x - 20, rpos.y + size + 40);
    }
  }

}
