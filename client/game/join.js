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
  let that = this;
  //return;
  $('.pup')
    .popup({
      inline: true,
      hoverable: true,
      position: 'bottom left'
    });

  $('.join-modal').modal({
    closable: false,
    onDeny: function() {
      return true;
    }
  });

  $('.join').on('click', function(e) {
    console.log(e.target);
  });

  $('.join-modal').on('submit', function(e) {
    e.preventDefault();
    let name = $('#teamName').val();
    console.log('teamCreate: ', name);
    Meteor.call('teamCreate', that.data._id, name);
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

  screenWidth: function() {
    return window.innerWidth - 20;
  },

  screenHeigth: function() {
    return window.innerHeight - 300;
  },

  displayGameButtons: function() {
    return game.canModifyMap();
  },

  hasJoined: function() {
    return game.hasJoined();
  },

  gameStatus: function() {
    return game.gameStatus.get();
  },

  mapMessage: function() {
    return map.message.get();
  },

  teams: function() {
    console.log(Teams.find({game_id: this._id}).count());
    return Teams.find({game_id: this._id});
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

  'submit': function(e) {
    e.preventDefault();
    let name = $('teamName').val();
    console.log('teamCreate: ', name);
    Meteor.call('teamCreate', this._id, name);
  },

  'click .open-join-modal': function() {
    $('.join-modal').modal('show');
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
