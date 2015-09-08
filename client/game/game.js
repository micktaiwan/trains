var game;
var map;
var handleTiles;
var handleTrains;


Template.game.onRendered(function() {

  //while(!this.data) {for(let i=0; i < 999999; i++){var a = 3*3;}}

  $('.pup')
    .popup({
      inline: true,
      hoverable: true,
      position: 'bottom left'
    });

  $('.dropdown').dropdown('restore default text');

  game = new Game();
  map = new MapGui('canvas', this.data._id);
  map.draw();

  console.log('data', this.data);

  if(handleTiles) handleTiles.stop();
  handleTiles = Tiles.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      //console.log('change: added', id);
      map.setTileWithId(id, doc);
    },
    removed: function(id) {
      var doc = Tiles.findOne(id);
      //console.log('change: removed', id);
      map.removeTile(id, true);
    }
  });

  if(handleTrains) handleTrains.stop();
  handleTrains = Trains.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      //console.log('change: added', id);
      map.addTrain(id, doc);
    },
    changed: function(id, doc) {
      //console.log('change: changed', id, doc);
      map.updateTrain(id, doc);
    },
    removed: function(id) {
      var doc = Tiles.findOne(id);
      //console.log('change: removed', id);
      map.removeTrain(id);
    }
  });

});

Template.game.onDestroyed(function() {
  if(handleTiles) handleTiles.stop();
});

Template.game.helpers({

  railsCount: function() {
    return Tiles.find().count();
  },

  screenWidth: function() {
    return window.innerWidth - 20;
  },

  screenHeigth: function() {
    return window.innerHeight - 300;
  }

});

Template.game.events({

  'click .reset': function() {
    map.resetMap();
  },

  'click .start': function() {
    map.createTrain();
  },

  'click .center': function() {
    map.resetPosition();
  }

});
