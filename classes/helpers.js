export class Helpers {

  static moveInterval = 1000;
  static caseRealMeters = 10;

  // helpers
  static caseEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  static caseCopy(to, from) {
    to.x = from.x;
    to.y = from.y;
  }

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


}
