// Manage saves and updates
export class DBObject {
  constructor(properties, doc) {
    for(let p in properties) {
      this[p] = doc[p] || properties[p];
    }
    // console.log('DBOject', this);
  }

  toObj() {
    throw new Error('toObj needs to be overridden')
  }
}
