var game;
var map;

Template.map.onRendered(function() {

  game = new Game();
  map = new MapGui('canvas');
  map.draw();


  Tiles.find().observeChanges({
    added: function(id, doc) {
      map.setCase(doc, true);
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
