var game;
var map;
var handle;

Template.game.onRendered(function() {

  game = new Game();
  map = new MapGui('canvas');
  map.draw();

  console.log('data', this.data);

  if(handle) handle.stop();
  handle = Tiles.find({game_id: this.data._id}).observeChanges({
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

Template.game.onDestroyed(function() {
  if(handle) handle.stop();
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
