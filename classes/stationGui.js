import {Station} from "./station";
import {Drawing} from "./helpers";

export class StationGui extends Station {

  constructor(map, doc, id) {
    super(map, doc, id);
    this.ctx = map.ctx;
  }

  draw() {
    const z = this.map.dispo.zoom;
    this.ctx.fillStyle = "#666";
    const rpos = this.map.relToRealCoords(this.pos);
    Drawing.drawPoint(this.ctx, rpos, z * this.map.dispo.stationSize);

    // draw _id
    // this.ctx.fillStyle = '#f00';
    // this.ctx.font = '14px sans';
    // this.ctx.fillText(this._id, rpos.x - 100, rpos.y + 40);

  }

}
