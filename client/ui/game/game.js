let game = null;
let map = null;
let handleTiles = null;
let handleTrains = null;


Template.game.onCreated(function() {

  map = new MapGui();
  game = new TrainsApp.Game(map);

});

Template.game.onRendered(function() {

  console.log('data', this.data);
  $('.pup')
    .popup({
      inline: true,
      hoverable: true,
      position: 'bottom left'
    });

  $('.dropdown').dropdown('restore default text');

  map.init('canvas', this.data._id);

  if(handleTiles) handleTiles.stop();
  handleTiles = Tiles.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      //console.log('change: added', id, doc);
      map.setTileWithId(id, doc);
    },
    changed: function(id, doc) {
      //console.log('change: changed', id, doc);
      map.updateTileWithId(id, doc);
    },
    removed: function(id) {
      let doc = Tiles.findOne(id);
      //console.log('change: removed', id);
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
      let doc = Tiles.findOne(id);
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

  canvasWidth: function() {
    return window.innerWidth - 60;
  },

  canvasHeigth: function() {
    return window.innerHeight - 300;
  },

  displayGameButtons: function() {
    game._canModifyMapDep.depend();
    return game.canModifyMap();
  },

  gameStatus: function() {
    return game.gameStatus.get();
  },

  mapMessage: function() {
    return map.message.get();
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

  'click .open-join-modal': function() {
    $('.teams-modal').show();
  }

});

Template.toolsDropdown.onRendered(function() {

  //console.log('dropdown ok');
  $('.dropdown').dropdown('restore default text');

});

Template.toolsDropdown.helpers({

  tileTypes: function() {
    return TileTypes.find();
  }

});

Template.toolsDropdown.events({

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
