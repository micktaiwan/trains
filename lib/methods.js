/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.methods({
  mapSet: function(pos) {
    var obj = {
      x: pos.x,
      y: pos.y
    };
    Tiles.insert(obj);
  },

  mapReset: function() {
    Tiles.remove({}); // no need for {multi: true}
  }

});

