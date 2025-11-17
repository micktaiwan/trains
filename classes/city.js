import {DBObject} from "./dbobject";
import {Drawing} from "./helpers";

export class City extends DBObject {

  constructor(doc) {
    const properties = {
      type: 'city',
      name: 'Unnamed',
      map: null,
      ctx: null,
      game_id: null,
      pos: {x: 0, y: 0},
      population: 3000,
      radius: 150,
      size: 10,
      color: '#fa0'
    };
    super(properties, doc);
  }

  objToSave() {
    return {
      _id: this._id,
      type: this.type,
      name: this.name,
      game_id: this.game_id,
      pos: this.pos,
      population: this.population,
      radius: this.radius,
      size: this.size,
      color: this.color
    };
  }

  update(clock) {

  }

}

export class CityGui extends City {

  constructor(doc) {
    super(doc);
    this.ctx = this.map.ctx;
  }

  draw() {
    const size = this.map.dispo.zoom * this.size;
    this.ctx.fillStyle = this.color;
    const rpos = this.map.relToRealCoords(this.pos);
    Drawing.drawPoint(this.ctx, rpos, size);

    // draw name with background for better readability
    if(this.map.dispo.zoom > 0.5) {
      const fontSize = Math.max(16, 16 * this.map.dispo.zoom);
      this.ctx.font = `bold ${fontSize}px sans-serif`;

      // Measure text width for centering
      const textMetrics = this.ctx.measureText(this.name);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      const textX = rpos.x - textWidth / 2;
      const textY = rpos.y - size - 8;

      // Draw background rectangle
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(textX - 4, textY - textHeight, textWidth + 8, textHeight + 6);

      // Draw text
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(this.name, textX, textY);
    }
  }

}
