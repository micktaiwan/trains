var game = null;
var map = null;
var handleTiles = null;
var handleTrains = null;


Template.game.onRendered(function() {

  //while(!this.data) {for(let i=0; i < 999999; i++){var a = 3*3;}}

  $('.pup')
    .popup({
      inline: true,
      hoverable: true,
      position: 'bottom left'
    });

  $('.dropdown').dropdown('restore default text');

  map = new MapGui('canvas', this.data._id);
  game = new TrainsApp.Game(map);
  game.getStatus();

  //console.log('data', this.data);

  if(handleTiles) handleTiles.stop();
  handleTiles = Tiles.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      //console.log('change: added', id, doc);
      map.setTileWithId(id, doc);
    },
    changed: function(id, doc) {
      console.log('change: changed', id, doc);
      map.updateTileWithId(id, doc);
    },
    removed: function(id) {
      var doc = Tiles.findOne(id);
      console.log('change: removed', id);
      map.removeTile(id);
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
  },

  tileTypes: function() {
    return TileTypes.find();
  },

  displayGameButtons: function()  {
    return true;
    if(game) game.getStatus();
    return game && game.canStart();
  },

  gameStatus: function()  {
    if(game) game.getStatus();
    console.log(Session.get('gameStatus'));
    return Session.get('gameStatus');
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
  },

  'click .selectTile': function() {
    console.log(this);
    map.setTileSelection(this.name);
  },

  'click .selectSkinCubes': function() {
    map.selectSkin('cube');
  },

  'click .selectSkinDefault': function() {
    map.selectSkin('default');
  },

  'click .selectSkinMine': function() {
    map.selectSkin('mine');
  }

});
