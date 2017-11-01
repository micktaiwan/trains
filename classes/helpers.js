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

}
