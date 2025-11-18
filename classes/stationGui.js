import {Station} from "./station";
import {Drawing, Helpers} from "./helpers";


export class StationGui extends Station {

  constructor(doc) {
    super(doc);
    this.ctx = this.map.ctx;
  }

  objToSave() {
    const obj = super.objToSave();

    // Add nearest city name for logging purposes
    const nearestCityInfo = this.map.findNearestCity(this.pos);
    if (nearestCityInfo && nearestCityInfo.city) {
      obj.cityName = nearestCityInfo.city.name;
    }

    return obj;
  }

  draw() {
    this.ctx.fillStyle = "#666";
    const rpos = this.map.relToRealCoords(this.pos);
    let size = this.map.dispo.zoom * this.map.dispo.stationSize;
    // if(size > this.map.dispo.stationSize) size = this.map.dispo.stationSize;
    Drawing.drawPoint(this.ctx, rpos, size);

    // draw _id
    // this.ctx.fillStyle = '#f00';
    // this.ctx.font = '14px sans';
    // this.ctx.fillText(this._id, rpos.x - 100, rpos.y + 40);

  }

}
