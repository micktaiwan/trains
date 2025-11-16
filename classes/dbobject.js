// Manage saves and updates
export class DBObject {
  constructor(properties, doc) {
    for(let p in properties) {
      this[p] = doc[p] || properties[p];
    }
    // make sure that _id is set
    this._id = doc._id || properties._id || Random.id();
    // console.log('DBObject', this);
    if(!doc.type && !properties.type) console.log('no type ?', doc);
  }

  objToSave() {
    throw new Error('objToSave needs to be overridden')
  }

  async saveToDB() {
    await Meteor.callAsync('mapInsert', this.objToSave());
  }

  async updateDB() {
    await Meteor.callAsync('mapUpdate', this._id, this.objToSave());
  }

  async removeFromDB() {
    await Meteor.callAsync('mapRemove', this._id);
  }

}
