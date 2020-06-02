export class Drawing {

  static text(ctx, txt, pos) {
    ctx.fillText(txt, pos.x, pos.y);
  }


  static drawPoint(ctx, pos, size) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI, true);
    ctx.fill();
  }

  static drawCircle(ctx, pos, size) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI, true);
    ctx.stroke();
  }

  static drawLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // progress is in %
  static drawArrow(ctx, p1, p2, progress) {
    const v = new Vector(p1, p2);
    const projection = Geometry.getProgressPos(v, progress);
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

  static middlePoint(a, b) {
    return {x: (b.x + a.x) / 2, y: (b.y + a.y) / 2};
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
    const projection = Geometry.getProgressPos(u, progress);
    let dist = 0;
    if(progress < 0) dist = Geometry.dist(p1, q);
    else if(progress > 1) dist = Geometry.dist(p2, q);
    else dist = Geometry.dist(q, projection); // inside
    // console.log(progress, inside, projection, dist);
    return {inside: inside, progress: progress, projection: projection, dist: dist, p1: p1, p2: p2, q: q};
  }

  // progress is in %
  static getProgressPos(vector, progress) {
    return vector.origin().plus((vector.scal(progress))).norm();
  }

}

// Note that object must be an object or array,
// NOT a primitive value like string, number, etc.
const objIdMap = new WeakMap;
let objectCount = 0;

export class Helpers {

  static serverInterval = 1000; // the server loop interval
  static trainSpeed = 60; // the trainSpeed of the train in km/h
  static pixelMeter = 1; // the size of a pixel in meters (actually, the size of one increment of a coordinate, not necessary a pixel depending on the zoom factor)
  static pixelSpeed = (Helpers.trainSpeed / Helpers.pixelMeter) / 3.6; // the number of pixels we should pass in one second
  static defaultZoom = 1;
  static timeFactor = 1; //  real time / game time factor (60: each second is one minute)
  static timePixels = Helpers.timeFactor * Helpers.pixelSpeed * Helpers.serverInterval / 1000; // the real pixels depending of the refresh time in seconds
  static getPassengersRadius = 50;
  static maxDistGetNearestStation = 400;

  static objectId(object) {
    if(!objIdMap.has(object)) objIdMap.set(object, ++objectCount);
    return objIdMap.get(object);
  }

  static gameDist(realPixels) {
    let meters = realPixels * Helpers.pixelMeter;
    if(meters >= 1000) return Math.round(meters / 1000) + "km";
    return Math.round(meters) + "m";
  }

  static observeChanges(params) {
    return MapObjects.find({game_id: params.game_id}).observeChanges({
      added: function(id, doc) {
        // console.log('map_object added', id, doc);
        if(doc.type === 'train') params.map.addTrain(_.extend({_id: id, map: params.map}, doc));
        else if(doc.type === 'station') params.map.addStation(_.extend({_id: id, map: params.map}, doc));
        else if(doc.type === 'person') params.map.addPerson(_.extend({_id: id, map: params.map}, doc));
        else console.error('Do not know this type', id, doc);
      },
      changed: function(id, doc) {
        const obj = MapObjects.findOne(id, {fields: {type: 1}});
        if(!obj) {
          console.error('map_object changed: no object found', id, doc);
          params.map.removeObjectById(id);
          return;
        }
        // console.log('map_object changed', obj, doc);
        if(obj.type === 'train') params.map.updateObject(id, doc);
        else if(obj.type === 'station') params.map.updateObject(id, doc);
        else if(obj.type === 'person') params.map.updateObject(id, doc);
        else console.error('Do not know this type', id, obj, doc);
      },
      removed: function(id) {
        // console.log('map_object removed', id);
        params.map.removeObjectById(id);
      }
    });

  }

  static toHHMMSS = function (seconds) {
    var sec_num = parseInt(seconds, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
  }

}
