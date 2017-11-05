import {Path} from "./path";
import {Drawing} from "./helpers";

export class PathGui extends Path {

  constructor(map, doc, id) {
    super(map, doc, id);
    this.ctx = map.ctx;
  }

  draw(options) {
    const z = this.map.displayOptions.zoom;
    const self = this;
    // draw the points
    this.ctx.fillStyle = "#666";
    _.each(this.points, function(p) {
      Drawing.drawPoint(self.ctx, self.map.relToRealCoords(p.pos), z * self.map.displayOptions.pointSize);

      // draw _id
      // self.ctx.fillStyle = '#f00';
      // self.ctx.font = '20px serif';
      // const rpos = self.map.relToRealCoords(p.pos);
      // self.ctx.fillText(p._id, rpos.x - 100, rpos.y + 40);
    });
    // draw the lines
    const len = this.points.length;
    // if(len === 0) return; // happens just after creating a path without points
    // if(len === 1) { // redraw this point in white
    //   this.ctx.fillStyle = "#fff";
    //   Drawing.drawPoint(self.ctx, self.map.relToRealCoords(this.points[0].pos), z * self.map.displayOptions.pointSize);
    // }
    // else
    if(len > 1) {
      let a,b;
      for(let i = 0; i < this.points.length - 1; i++) {
        a = this.points[i];
        b = this.points[i + 1];
        // console.log('dist', self._id, Helpers.dist(a, b));
        this.ctx.lineWidth = z * self.map.displayOptions.pathSize;
        this.ctx.strokeStyle = '#666';
        Drawing.drawLine(self.ctx, this.map.relToRealCoords(a.pos), this.map.relToRealCoords(b.pos));

        // draw point 'a' links
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#fff';
        // console.log('links #' + Helpers.objectId(a), a.links.length, b.links.length);
        _.each(a.links, function(p) {
          // console.log(p);
          Drawing.drawArrow(self.ctx, self.map.relToRealCoords(a.pos), self.map.relToRealCoords(p.pos));
        });
      }
      // draw last point ('b') links
      _.each(b.links, function(p) {
        Drawing.drawArrow(self.ctx, self.map.relToRealCoords(b.pos), self.map.relToRealCoords(p.pos));
      });

    }
  }
}
