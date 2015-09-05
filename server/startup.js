/**
 * Created by mfaivremacon on 03/09/2015.
 */

var trains;

// for each train in the map, move it
Meteor.startup(function() {

  Trains.find().observeChanges({
    added: function(id, doc) {
      console.log('server: added', id);
      trains.push(new Train('test'));
    },
    removed: function(id) {
      var doc = Tiles.findOne(id);
      console.log('server: removed', id);

    }
  });

});
