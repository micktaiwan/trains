export class Drawing {

  static drawPoint(ctx, pos, size) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI, true);
    ctx.fill();
  }

  static drawLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  static drawArrow(ctx, p1, p2, lengthPercent) {
    let v = new Vector(p1, p2);
    const projection = v.origin().plus((v.scal(lengthPercent))).norm();
    ctx.beginPath();
    ctx.moveTo(v.p1.x, v.p1.y);
    ctx.lineTo(projection.x, projection.y);
    ctx.stroke();
  }

}

export class Vector {

  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }

  dotProduct(v) {
    const unorm = this.norm();
    const vnorm = v.norm();
    return unorm.x * vnorm.x + unorm.y * vnorm.y;
  }

  origin() {
    return new Vector({x: 0, y: 0}, {x: this.p1.x, y: this.p1.y});
  }

  norm() {
    return {x: this.p2.x - this.p1.x, y: this.p2.y - this.p1.y};
  }

  len() {
    return Geometry.dist(this.p1, this.p2);
  }

  plus(v) {
    return new Vector({x: this.p1.x + v.p1.x, y: this.p1.y + v.p1.y}, {x: this.p2.x + v.p2.x, y: this.p2.y + v.p2.y});
  }

  scal(scal) {
    return new Vector({x: this.p1.x * scal, y: this.p1.y * scal}, {x: this.p2.x * scal, y: this.p2.y * scal});
  }

}

export class Geometry {

  static dist(a, b) {
    return Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
  }

  // return information about the relation between a point and a segment
  // [p1, p2] is the segment, q is the point
  // {
  //  dist: distance between the point and the segment,
  //  inside: true if the projection of the point is inside the segment
  //  progress: the distance (inside [0, 1]) from p1
  //  projection: the projection of q on the segment
  //  dist: the dist from the point q to the segment [p1,p2]
  // }
  // https://math.stackexchange.com/questions/322831/determing-the-distance-from-a-line-segment-to-a-point-in-3-space
  static relPointToSegment(p1, p2, q) {
    // console.log('relPointToSegment', p1, p2, q);

    if(_.isEqual(p1, p2)) return {inside: _.isEqual(p1, q), progress: 0, projection: p1, dist: Geometry.dist(p1, q), from: p1};

    const u = new Vector(p1, p2);
    const v = new Vector(p1, q);
    const progress = u.dotProduct(v) / (u.len() * u.len());
    const inside = progress >= 0 && progress <= 1;
    const projection = u.origin().plus((u.scal(progress))).norm();
    let dist = 0;
    if(progress < 0) dist = Geometry.dist(p1, q);
    else if(progress > 1) dist = Geometry.dist(p2, q);
    else dist = Geometry.dist(q, projection); // inside
    // console.log(progress, inside, projection, dist);
    return {inside: inside, progress: progress, projection: projection, dist: dist, p1: p1, p2: p2, q: q};
  }

}

// Note that object must be an object or array,
// NOT a primitive value like string, number, etc.
objIdMap = new WeakMap;
objectCount = 0;

export class Helpers {

  static moveInterval = 1000;
  static caseRealMeters = 10;

  static objectId(object) {
    if(!objIdMap.has(object)) objIdMap.set(object, ++objectCount);
    return objIdMap.get(object);
  }
}
