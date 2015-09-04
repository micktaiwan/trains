var game;
var map;
var handle;

Template.game.onRendered(function() {

  //while(!this.data) {for(let i=0; i < 999999; i++){var a = 3*3;}}

  $('.pup')
    .popup({
      inline: true,
      hoverable: true,
      position: 'bottom left',
    });

  game = new Game();
  map = new MapGui('canvas');
  map.draw();

  console.log('data', this.data);

  if(handle) handle.stop();
  handle = Tiles.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      console.log('change: added', id);
      map.setTileWithId(id, doc);
    },
    removed: function(id) {
      var doc = Tiles.findOne(id);
      console.log('change: removed', id);
      map.removeTile(id, true);
    }
  });

});

Template.game.onDestroyed(function() {
  if(handle) handle.stop();
});

Template.game.helpers({

  railsCount: function() {
    return Tiles.find().count();
  }

});

Template.game.events({

  'click .reset': function() {
    map.resetMap();
  },

  'click .start': function() {
    map.putTrain();
  },

  'click .center': function() {
    map.resetPosition();
  }

});
