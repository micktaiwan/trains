export class Helpers {

  // helpers
  static caseEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  static caseCopy(to, from) {
    to.x = from.x;
    to.y = from.y;
  }

}
