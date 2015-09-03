var game;
var map;

Template.game.onRendered(function() {

  game = new Game();
  map = new MapGui('canvas');
  map.draw();

  console.log('data', this.data);

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

Template.game.helpers({});

Template.game.events({

  'click .reset': function() {
    map.resetMap();
  },

  'click .start': function() {
    map.putTrain();
  }

});
