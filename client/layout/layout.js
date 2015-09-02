var game;
var map;

Template.map.onRendered(function() {

  game = new Game();
  map = new MapGui('canvas');
  map.draw();


  Tiles.find().observeChanges({
    added: function(id, doc) {
      console.log('change: added', id);
      map.setCaseWithId(id, doc);
    },
    removed: function(id) {
      var doc = Tiles.findOne(id);
      console.log('change: removed', id);
      map.removeCase(id, true);
    }
  });

});

Template.map.helpers({});

Template.map.events({

  'click .reset': function() {
    map.resetMap();
  },

  'click .start': function() {
    map.putTrain();
  }

});
