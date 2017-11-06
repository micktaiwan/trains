import {MapGui} from '../../../classes/mapGui';
import {Game} from '../../../classes/game';
import {Helpers} from '../../../classes/helpers';
import {Radio} from "../../../classes/radio";

let radio = null;
let game = null;
let map = null;
let handlePaths = null;
let handleTrains = null;

Template.game.onCreated(function() {

  // console.log('Template.game.onCreated data', this.data);
  map = new MapGui(this.data._id);
  game = new Game(map);

});

Template.game.onRendered(function() {

  // console.log('Template.game.onRendered data', this.data);
  $('.pup').popup({
    inline: true,
    hoverable: true,
    position: 'bottom left'
  });

  $('.dropdown').dropdown('restore default text');

  radio = new Radio();
  radio.play();

  map.init('canvas', this.data._id);
  // subscribe to map (or "game") paths
  if(handlePaths) handlePaths.stop();
  handlePaths = Paths.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      // console.log('paths: added', id, doc);
      map.addPath(id, doc);
    },
    changed: function(id, doc) {
      // console.log('paths: changed', id, doc);
      map.updatePath(id, doc);
    },
    removed: function(id) {
      // console.log('paths: removed', id);
      map.removePath(id);
    }

  });

  if(handleTrains) handleTrains.stop();
  handleTrains = Trains.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      // console.log('trains: added', id);
      map.addTrain(id, doc);
    },
    changed: function(id, doc) {
      // console.log('trains: changed', id, doc);
      map.updateTrain(id, doc);
    },
    removed: function(id) {
      let doc = Paths.findOne(id);
      // console.log('trains: removed', id);
      map.removeTrain(id);
    }
  });

});

Template.game.onDestroyed(function() {
  radio.stop();
  game.stop();
  if(handlePaths) handlePaths.stop();
  if(handleTrains) handleTrains.stop();
});

Template.game.helpers({

  railsCount: function() {
    return Paths.find().count();
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
  },

  trainSpeed() {
    // FIXME P0: the train speed is server side !
    const caseLengthInMeters = Helpers.caseRealMeters;
    const timeInSeconds = Helpers.moveInterval / 1000;
    return Math.round((caseLengthInMeters / 1000) / (timeInSeconds / 3600));
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
  },

  'click .js-add-speed'() {
    // FIXME P0: the train speed is server side !
    console.log('test');
    Helpers.moveInterval = 400;
  },

  'click .js-remove-speed'() {
    Helpers.moveInterval = 1000;
  },

  'click .js-radio-toggle-volume'() {
    const s = radio.backgroundSound;
    // console.log(s.state());
    const el = $('.js-radio-toggle-volume');
    el.html('<i class="pause icon"></i>');
    if(s.state() === "unloaded") {
      s.load().once('load', function() {
        s.play();
        s.fade(0, 0.2, 1000);
        el.html('<i class="stop icon"></i>');
      });
    }
    else {
      s.fade(0.2, 0, 1000).once('fade', function() {
        s.unload();
        el.html('<i class="play icon"></i>');
      });
    }
  },

  'click .js-radio-next-station'() {
    radio.next();
  },

  'click .js-radio-previous-station'() {
    radio.previous();
  }

});

Template.toolsDropdown.onRendered(function() {

  //console.log('dropdown ok');
  $('.dropdown').dropdown('restore default text');

});

Template.toolsDropdown.helpers({

  pathTypes: function() {
    return []; // FIXME P2: PathTypes.find();
  }

});

Template.toolsDropdown.events({

  'click .selectPath': function() {
    console.log(this);
    map.setPathSelection(this.name);
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
