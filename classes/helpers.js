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

  static drawPoint(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI, true);
    ctx.fill();
  }

}
